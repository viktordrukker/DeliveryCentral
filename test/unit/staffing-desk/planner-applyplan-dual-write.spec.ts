/**
 * LEAN foundation dual-write — WorkforcePlannerService.applyPlan must write
 * the canonical `ProjectPosition` aggregate alongside every legacy
 * `ProjectAssignment` and `StaffingRequest` it creates, matching the
 * pattern shipped in `CreateProjectAssignmentService.writeCanonicalProjectPosition`
 * (PR #491) and `TransitionProjectAssignmentService.mirrorTransitionToProjectPosition`
 * (PR #488).
 *
 * Before this fix, Distribution Studio dispatches/hires/extensions wrote
 * only to the legacy tables, leaving the lean read model permanently
 * stale. The inverted mirror (PR #480) is best-effort fallback and was
 * never going to backfill positions that simply did not exist.
 */
import { WorkforcePlannerService } from '@src/modules/staffing-desk/application/workforce-planner.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface CapturedCall {
  table: string;
  op: 'create' | 'update' | 'updateMany' | 'findUnique';
  data?: Record<string, unknown>;
  where?: Record<string, unknown>;
}

interface SpyResult {
  prisma: PrismaService;
  calls: CapturedCall[];
}

function buildPrismaSpy(opts: { existingAssignmentId?: string } = {}): SpyResult {
  const calls: CapturedCall[] = [];

  const txClient = {
    projectAssignment: {
      create: async (q: { data: Record<string, unknown>; select?: Record<string, unknown> }) => {
        calls.push({ table: 'projectAssignment', op: 'create', data: q.data });
        return {
          id: 'assignment-id-stub',
          validFrom: q.data.validFrom,
          allocationPercent: q.data.allocationPercent,
        };
      },
      update: async (q: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        calls.push({ table: 'projectAssignment', op: 'update', where: q.where, data: q.data });
        return { id: 'assignment-id-stub' };
      },
    },
    staffingRequest: {
      create: async (q: { data: Record<string, unknown>; select?: Record<string, unknown> }) => {
        calls.push({ table: 'staffingRequest', op: 'create', data: q.data });
        return { id: 'staffing-request-id-stub' };
      },
    },
    projectPosition: {
      create: async (q: { data: Record<string, unknown> }) => {
        calls.push({ table: 'projectPosition', op: 'create', data: q.data });
        return { id: 'position-id-stub' };
      },
      updateMany: async (q: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        calls.push({ table: 'projectPosition', op: 'updateMany', where: q.where, data: q.data });
        return { count: 1 };
      },
    },
    projectPositionFillHistory: {
      create: async (q: { data: Record<string, unknown> }) => {
        calls.push({ table: 'projectPositionFillHistory', op: 'create', data: q.data });
        return { id: 'fill-history-stub' };
      },
    },
  };

  const prisma = {
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(txClient),
    projectAssignment: {
      findUnique: async (q: { where: { id: string } }) => {
        calls.push({ table: 'projectAssignment', op: 'findUnique', where: q.where });
        if (opts.existingAssignmentId && q.where.id === opts.existingAssignmentId) {
          return { id: q.where.id, notes: null };
        }
        return null;
      },
    },
  } as unknown as PrismaService;

  return { prisma, calls };
}

function buildPlatformSettingsStub(): PlatformSettingsService {
  return {
    getRawValue: async () => null,
  } as unknown as PlatformSettingsService;
}

const ACTOR_ID = '11111111-1111-1111-1111-111111111006';
const PERSON_ID = '22222222-2222-2222-2222-222222222001';
const PROJECT_ID = '33333333-3333-3333-3333-333333333002';

describe('WorkforcePlannerService.applyPlan — dual-write to ProjectPosition', () => {
  it('creates a ProjectPosition (with legacyAssignmentId) alongside every dispatched ProjectAssignment', async () => {
    const { prisma, calls } = buildPrismaSpy();
    const service = new WorkforcePlannerService(prisma, buildPlatformSettingsStub());

    const result = await service.applyPlan({
      actorId: ACTOR_ID,
      dispatches: [
        {
          personId: PERSON_ID,
          projectId: PROJECT_ID,
          staffingRole: 'Consultant',
          allocationPercent: 50,
          startDate: '2026-06-15T00:00:00.000Z',
          note: 'Primary delivery allocation.',
        },
      ],
      hireRequests: [],
      releases: [],
    });

    expect(result.assignmentsCreated).toBe(1);
    expect(result.errors).toHaveLength(0);

    const assignmentCreates = calls.filter(
      (c) => c.table === 'projectAssignment' && c.op === 'create',
    );
    const positionCreates = calls.filter(
      (c) => c.table === 'projectPosition' && c.op === 'create',
    );
    const fillHistoryCreates = calls.filter(
      (c) => c.table === 'projectPositionFillHistory' && c.op === 'create',
    );

    expect(assignmentCreates).toHaveLength(1);
    expect(positionCreates).toHaveLength(1);
    expect(fillHistoryCreates).toHaveLength(1);

    expect(positionCreates[0]?.data).toMatchObject({
      projectId: PROJECT_ID,
      role: 'Consultant',
      requiredAllocationPercent: '50',
      // Planner dispatch lands at PROPOSED — 1:1 onto lean PROPOSED.
      fillStatus: 'PROPOSED',
      legacyAssignmentId: 'assignment-id-stub',
      // D-103 actor-audit.
      createdByPersonId: ACTOR_ID,
      updatedByPersonId: ACTOR_ID,
    });

    expect(fillHistoryCreates[0]?.data).toMatchObject({
      positionId: 'position-id-stub',
      changeType: 'PROPOSED',
      changedByPersonId: ACTOR_ID,
      newStatus: 'PROPOSED',
    });
  });

  it('creates N OPEN ProjectPositions (one per headcount, with legacyStaffingRequestId) alongside every hire StaffingRequest', async () => {
    const { prisma, calls } = buildPrismaSpy();
    const service = new WorkforcePlannerService(prisma, buildPlatformSettingsStub());

    const result = await service.applyPlan({
      actorId: ACTOR_ID,
      dispatches: [],
      hireRequests: [
        {
          projectId: PROJECT_ID,
          role: 'Senior Engineer',
          skills: ['typescript', 'nestjs'],
          allocationPercent: 100,
          headcount: 3,
          priority: 'HIGH',
          startDate: '2026-07-01T00:00:00.000Z',
          endDate: '2026-12-31T00:00:00.000Z',
        },
      ],
      releases: [],
    });

    expect(result.staffingRequestsCreated).toBe(1);
    expect(result.errors).toHaveLength(0);

    const srCreates = calls.filter(
      (c) => c.table === 'staffingRequest' && c.op === 'create',
    );
    const positionCreates = calls.filter(
      (c) => c.table === 'projectPosition' && c.op === 'create',
    );

    expect(srCreates).toHaveLength(1);
    // One canonical position per headcount slot.
    expect(positionCreates).toHaveLength(3);

    for (const pc of positionCreates) {
      expect(pc.data).toMatchObject({
        projectId: PROJECT_ID,
        role: 'Senior Engineer',
        requiredAllocationPercent: '100',
        priority: 'HIGH',
        // Hire request starts OPEN — 1:1 mapping from
        // StaffingRequestStatus.OPEN through `mapStaffingRequestStatusToFillStatus`.
        fillStatus: 'OPEN',
        legacyStaffingRequestId: 'staffing-request-id-stub',
        createdByPersonId: ACTOR_ID,
        updatedByPersonId: ACTOR_ID,
        activePersonId: null,
      });
    }
  });

  it('mirrors extension updates onto the paired ProjectPosition.activeValidTo + endDate', async () => {
    const ASSIGNMENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const { prisma, calls } = buildPrismaSpy({ existingAssignmentId: ASSIGNMENT_ID });
    const service = new WorkforcePlannerService(prisma, buildPlatformSettingsStub());

    const result = await service.applyPlan({
      actorId: ACTOR_ID,
      dispatches: [],
      hireRequests: [],
      releases: [],
      extensions: [
        {
          assignmentId: ASSIGNMENT_ID,
          newValidTo: '2027-03-31T00:00:00.000Z',
          note: 'Extended through Q1.',
        },
      ],
    });

    expect(result.extensionsUpdated).toBe(1);
    expect(result.errors).toHaveLength(0);

    const positionUpdates = calls.filter(
      (c) => c.table === 'projectPosition' && c.op === 'updateMany',
    );
    expect(positionUpdates).toHaveLength(1);
    expect(positionUpdates[0]?.where).toMatchObject({
      legacyAssignmentId: ASSIGNMENT_ID,
    });
    expect(positionUpdates[0]?.data).toMatchObject({
      activeValidTo: new Date('2027-03-31T00:00:00.000Z'),
      endDate: new Date('2027-03-31T00:00:00.000Z'),
      updatedByPersonId: ACTOR_ID,
    });
  });

  it('rolls back the legacy ProjectAssignment when the canonical ProjectPosition write fails', async () => {
    const calls: CapturedCall[] = [];
    let createPositionShouldThrow = true;

    const txClient = {
      projectAssignment: {
        create: async (q: { data: Record<string, unknown> }) => {
          calls.push({ table: 'projectAssignment', op: 'create', data: q.data });
          return { id: 'assignment-id-stub', validFrom: q.data.validFrom };
        },
      },
      projectPosition: {
        create: async (q: { data: Record<string, unknown> }) => {
          calls.push({ table: 'projectPosition', op: 'create', data: q.data });
          if (createPositionShouldThrow) throw new Error('simulated canonical write failure');
          return { id: 'position-id-stub' };
        },
      },
      projectPositionFillHistory: {
        create: async () => ({ id: 'fill-history-stub' }),
      },
    };

    // `$transaction` rejects together: any thrown error bubbles up and the
    // entire batch is considered failed.
    const prisma = {
      $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn(txClient),
    } as unknown as PrismaService;

    const service = new WorkforcePlannerService(prisma, buildPlatformSettingsStub());

    const result = await service.applyPlan({
      actorId: ACTOR_ID,
      dispatches: [
        {
          personId: PERSON_ID,
          projectId: PROJECT_ID,
          staffingRole: 'Consultant',
          allocationPercent: 50,
          startDate: '2026-06-15T00:00:00.000Z',
        },
      ],
      hireRequests: [],
      releases: [],
    });

    // The per-item try/catch captures the rejected tx as an error so the
    // caller sees no successful create — preserving the pre-dual-write
    // partial-success semantics on the batch level.
    expect(result.assignmentsCreated).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/simulated canonical write failure/);
  });
});
