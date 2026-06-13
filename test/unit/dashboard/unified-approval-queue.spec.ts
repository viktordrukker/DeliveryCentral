import { UnifiedApprovalQueueService } from '@src/modules/dashboard/application/unified-approval-queue.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

// The constructor now takes 7 source services (#470 added 5 for the
// decide() dispatcher; #495-era PR added TransitionProjectPositionFillService;
// LEAN-P4c-4 added SkillEndorsementService). list()/loadTimesheets() never
// touches them, so we stub with empty objects.
const stubSvc = {} as never;
// LEAN-P4c-4 — list() now also calls SkillEndorsementService.listPending().
// Provide a stub that returns [] by default so the existing tests still pass.
const stubSkillEndorsement = { listPending: async () => [] } as never;

/**
 * Approvals Hub PR-2 — `timesheet` source merged into the unified queue.
 */
describe('UnifiedApprovalQueueService — timesheet source', () => {
  function buildStub(opts: {
    timesheets?: Array<{
      id: string;
      publicId?: string | null;
      personId: string;
      weekStart: Date;
      submittedAt: Date | null;
      createdAt: Date;
      totalHours: number | null;
    }>;
    persons?: Array<{ id: string; displayName: string }>;
  }): PrismaService {
    return {
      projectPosition: { findMany: async () => [] },
      budgetApproval: { findMany: async () => [] },
      projectActivationApproval: { findMany: async () => [] },
      leaveRequest: { findMany: async () => [] },
      caseRecord: { findMany: async () => [] },
      timesheetWeek: {
        findMany: async () => opts.timesheets ?? [],
      },
      person: {
        findMany: async () => opts.persons ?? [],
      },
      personSkill: { findMany: async () => [] },
    } as unknown as PrismaService;
  }

  it('includes SUBMITTED timesheet rows mapped to the timesheet source', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub({
        timesheets: [
          {
            id: 'tw-1',
            publicId: 'tsh_etn1',
            personId: 'p-1',
            weekStart: new Date('2026-05-25T00:00:00Z'),
            submittedAt: new Date('2026-05-26T10:00:00Z'),
            createdAt: new Date('2026-05-25T08:00:00Z'),
            totalHours: 40,
          },
        ],
        persons: [{ id: 'p-1', displayName: 'Ethan Brooks' }],
      }),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({ sources: ['timesheet'] });
    expect(out.items).toHaveLength(1);
    const item = out.items[0]!;
    expect(item.source).toBe('timesheet');
    expect(item.title).toBe('Timesheet week of 2026-05-25');
    expect(item.submittedBy).toEqual({ personId: 'p-1', displayName: 'Ethan Brooks' });
    // W1-12 — href now uses publicId when present.
    expect(item.targetPublicId).toBe('tsh_etn1');
    expect(item.href).toBe('/approvals/tsh_etn1?source=timesheet');
    expect(item.submittedAt).toBe('2026-05-26T10:00:00.000Z');
    expect(item.meta).toMatchObject({ weekStart: '2026-05-25', totalHours: 40 });
  });

  it('omits the timesheet source when not requested', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub({
        timesheets: [
          {
            id: 'tw-2',
            personId: 'p-2',
            weekStart: new Date('2026-05-25T00:00:00Z'),
            submittedAt: new Date('2026-05-26T10:00:00Z'),
            createdAt: new Date('2026-05-25T08:00:00Z'),
            totalHours: 35,
          },
        ],
        persons: [{ id: 'p-2', displayName: 'Other' }],
      }),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({ sources: ['leave'] });
    expect(out.items).toHaveLength(0);
  });

  it('falls back to createdAt when submittedAt is null', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub({
        timesheets: [
          {
            id: 'tw-3',
            personId: 'p-3',
            weekStart: new Date('2026-05-18T00:00:00Z'),
            submittedAt: null,
            createdAt: new Date('2026-05-19T12:00:00Z'),
            totalHours: null,
          },
        ],
        persons: [{ id: 'p-3', displayName: 'Alex' }],
      }),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({ sources: ['timesheet'] });
    expect(out.items).toHaveLength(1);
    expect(out.items[0]!.submittedAt).toBe('2026-05-19T12:00:00.000Z');
  });
});

/**
 * PR-10 (Wave 4) — position-proposal items carry enriched meta (candidate,
 * allocation, dates, project, proposed-by) so the approvals inspector can
 * decide PROPOSED → BOOKED on one screen (UX Law 7), and the row window is
 * a stable newest-first selection instead of an unordered take:100.
 */
describe('UnifiedApprovalQueueService — position-proposal source', () => {
  interface PositionRow {
    id: string;
    publicId?: string | null;
    role: string;
    projectId: string;
    activePersonId: string | null;
    activeAllocationPercent: number | null;
    requiredAllocationPercent: number;
    startDate: Date;
    endDate: Date;
    updatedAt: Date;
    project: { name: string; publicId: string | null };
    activePerson: { id: string; displayName: string } | null;
    updatedByPerson: { id: string; displayName: string } | null;
  }

  function buildStub(positions: PositionRow[]): {
    prisma: PrismaService;
    findManyArgs: () => unknown;
  } {
    let capturedArgs: unknown;
    const prisma = {
      projectPosition: {
        findMany: async (args: unknown) => {
          capturedArgs = args;
          return positions;
        },
      },
      budgetApproval: { findMany: async () => [] },
      projectActivationApproval: { findMany: async () => [] },
      leaveRequest: { findMany: async () => [] },
      caseRecord: { findMany: async () => [] },
      timesheetWeek: { findMany: async () => [] },
      person: { findMany: async () => [] },
    } as unknown as PrismaService;
    return { prisma, findManyArgs: () => capturedArgs };
  }

  const basePosition: PositionRow = {
    id: 'pos-1',
    publicId: 'pos_apolloSenior',
    role: 'Senior Engineer',
    projectId: 'prj-1',
    activePersonId: 'cand-1',
    activeAllocationPercent: 80,
    requiredAllocationPercent: 100,
    startDate: new Date('2026-07-01T00:00:00Z'),
    endDate: new Date('2026-12-31T00:00:00Z'),
    updatedAt: new Date('2026-06-08T09:00:00Z'),
    project: { name: 'Apollo', publicId: 'prj_apollo' },
    activePerson: { id: 'cand-1', displayName: 'Ada Lovelace' },
    updatedByPerson: { id: 'rm-1', displayName: 'Sophia Kim' },
  };

  it('enriches meta with candidate, allocation, dates, project, and proposed-by', async () => {
    const { prisma } = buildStub([basePosition]);
    const svc = new UnifiedApprovalQueueService(
      prisma,
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({ sources: ['position-proposal'] });
    expect(out.items).toHaveLength(1);
    const item = out.items[0]!;
    expect(item.source).toBe('position-proposal');
    expect(item.title).toBe('Position fill proposed: Senior Engineer');
    expect(item.targetPublicId).toBe('pos_apolloSenior');
    expect(item.href).toBe('/positions/pos_apolloSenior');
    expect(item.submittedBy).toEqual({ personId: 'rm-1', displayName: 'Sophia Kim' });
    expect(item.meta).toEqual({
      projectId: 'prj-1',
      projectPublicId: 'prj_apollo',
      projectName: 'Apollo',
      candidatePersonId: 'cand-1',
      candidateDisplayName: 'Ada Lovelace',
      allocationPercent: 80,
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      proposedByDisplayName: 'Sophia Kim',
    });
  });

  it('falls back to requiredAllocationPercent and null candidate fields', async () => {
    const { prisma } = buildStub([
      {
        ...basePosition,
        id: 'pos-2',
        activePersonId: null,
        activeAllocationPercent: null,
        activePerson: null,
        updatedByPerson: null,
      },
    ]);
    const svc = new UnifiedApprovalQueueService(
      prisma,
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({ sources: ['position-proposal'] });
    expect(out.items[0]!.meta).toMatchObject({
      candidatePersonId: null,
      candidateDisplayName: null,
      allocationPercent: 100,
      proposedByDisplayName: null,
    });
  });

  it('queries a stable newest-first window (orderBy updatedAt desc, take 100)', async () => {
    const { prisma, findManyArgs } = buildStub([basePosition]);
    const svc = new UnifiedApprovalQueueService(
      prisma,
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    await svc.list({ sources: ['position-proposal'] });
    expect(findManyArgs()).toMatchObject({
      where: { fillStatus: 'PROPOSED' },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  });
});

/**
 * LEAN-P4c-3 — leave items surface in the unified approval queue so HR
 * (and authorized managers) decide them from /approvals instead of
 * navigating to /leave-requests separately.
 */
describe('UnifiedApprovalQueueService — leave source', () => {
  interface LeaveRow {
    id: string;
    publicId?: string | null;
    type: 'ANNUAL' | 'SICK' | 'OTHER';
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    createdByPerson: { id: string; displayName: string } | null;
  }

  function buildStub(leaves: LeaveRow[]): PrismaService {
    return {
      projectPosition: { findMany: async () => [] },
      budgetApproval: { findMany: async () => [] },
      projectActivationApproval: { findMany: async () => [] },
      leaveRequest: { findMany: async () => leaves },
      caseRecord: { findMany: async () => [] },
      timesheetWeek: { findMany: async () => [] },
      person: { findMany: async () => [] },
    } as unknown as PrismaService;
  }

  it('includes PENDING leave requests mapped to the leave source', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub([
        {
          id: 'lr-1',
          publicId: 'lvr_annual1',
          type: 'ANNUAL',
          startDate: new Date('2026-06-15T00:00:00Z'),
          endDate: new Date('2026-06-20T00:00:00Z'),
          createdAt: new Date('2026-06-01T09:00:00Z'),
          createdByPerson: { id: 'p-1', displayName: 'Ethan Brooks' },
        },
      ]),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({ sources: ['leave'] });
    expect(out.items).toHaveLength(1);
    const item = out.items[0]!;
    expect(item.source).toBe('leave');
    expect(item.title).toBe('Leave: ANNUAL 2026-06-15…2026-06-20');
    expect(item.submittedBy).toEqual({ personId: 'p-1', displayName: 'Ethan Brooks' });
    // W1-12 — leave items route via publicId when available.
    expect(item.targetPublicId).toBe('lvr_annual1');
    expect(item.href).toBe('/leave-requests/lvr_annual1');
    expect(item.submittedAt).toBe('2026-06-01T09:00:00.000Z');
    expect(item.meta).toMatchObject({ type: 'ANNUAL' });
  });

  it('mixes leave items alongside other sources in the same response', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub([
        {
          id: 'lr-2',
          type: 'SICK',
          startDate: new Date('2026-06-10T00:00:00Z'),
          endDate: new Date('2026-06-11T00:00:00Z'),
          createdAt: new Date('2026-06-09T12:00:00Z'),
          createdByPerson: { id: 'p-2', displayName: 'Jane Doe' },
        },
      ]),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({});
    expect(out.items).toHaveLength(1);
    expect(out.items[0]!.source).toBe('leave');
  });

  it('omits leave items when only other sources are requested', async () => {
    const svc = new UnifiedApprovalQueueService(
      buildStub([
        {
          id: 'lr-3',
          type: 'OTHER',
          startDate: new Date('2026-06-05T00:00:00Z'),
          endDate: new Date('2026-06-05T00:00:00Z'),
          createdAt: new Date('2026-06-04T08:00:00Z'),
          createdByPerson: null,
        },
      ]),
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    const out = await svc.list({ sources: ['budget'] });
    expect(out.items).toHaveLength(0);
  });
});

/**
 * PR-20 — every approval-queue loader (not just position-proposal) now reads
 * a stable newest-first window (orderBy updatedAt desc) instead of an
 * unordered take:100, so a busy queue never silently drops recent rows.
 */
describe('UnifiedApprovalQueueService — stable ordering across all loaders', () => {
  function buildStub(): {
    prisma: PrismaService;
    args: () => Record<string, unknown>;
  } {
    const captured: Record<string, unknown> = {};
    const capture =
      (model: string) =>
      async (a: unknown) => {
        captured[model] = a;
        return [];
      };
    const prisma = {
      projectPosition: { findMany: capture('projectPosition') },
      budgetApproval: { findMany: capture('budgetApproval') },
      projectActivationApproval: { findMany: capture('projectActivationApproval') },
      leaveRequest: { findMany: capture('leaveRequest') },
      caseRecord: { findMany: capture('caseRecord') },
      timesheetWeek: { findMany: capture('timesheetWeek') },
      project: { findMany: async () => [] },
      person: { findMany: async () => [] },
    } as unknown as PrismaService;
    return { prisma, args: () => captured };
  }

  it.each([
    ['budget', 'budgetApproval'],
    ['activation', 'projectActivationApproval'],
    ['leave', 'leaveRequest'],
    ['case', 'caseRecord'],
  ])('%s loader orders by updatedAt desc with take 100', async (source, model) => {
    const { prisma, args } = buildStub();
    const svc = new UnifiedApprovalQueueService(
      prisma,
      stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSvc, stubSkillEndorsement,
    );
    await svc.list({ sources: [source as never] });
    expect(args()[model]).toMatchObject({
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  });
});
