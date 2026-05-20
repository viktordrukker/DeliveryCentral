import { DeriveStaffingRequestStatusService } from '@src/modules/staffing-requests/application/derive-staffing-request-status.service';
import {
  classifyFromSummary,
  type DerivedStaffingRequestSummary,
} from '@src/modules/staffing-requests/application/derive-staffing-request-status.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * BUG-SR-1 / Layer A — `classifyFromSummary` must honor the raw
 * `StaffingRequest.status` when it carries a terminal lifecycle signal
 * the assignment summary cannot infer.
 *
 * The original defect: a CANCELLED SR with zero assignments returned
 * `'Open'` because `totalAssignments === 0` short-circuited before
 * the raw status was consulted. The fix adds a `rawStatus` parameter
 * that wins ahead of the totalAssignments check.
 */
function emptySummary(): DerivedStaffingRequestSummary {
  return {
    assigned: 0,
    booked: 0,
    cancelled: 0,
    completed: 0,
    created: 0,
    onHold: 0,
    onboarding: 0,
    proposed: 0,
    rejected: 0,
    totalAssignments: 0,
  };
}

describe('classifyFromSummary — BUG-SR-1 raw-status honoring', () => {
  it('CANCELLED with zero assignments → Cancelled (was: Open)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'CANCELLED')).toBe('Cancelled');
  });

  it('FULFILLED with zero assignments → Filled (defensive)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'FULFILLED')).toBe('Filled');
  });

  it('CANCELLED with a booked assignment still wins → Cancelled', () => {
    const summary = emptySummary();
    summary.totalAssignments = 1;
    summary.booked = 1;
    expect(classifyFromSummary(1, summary, 'CANCELLED')).toBe('Cancelled');
  });

  it('DRAFT with zero assignments → Open (DRAFT does not override)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'DRAFT')).toBe('Open');
  });

  it('OPEN with zero assignments → Open (legacy path)', () => {
    expect(classifyFromSummary(1, emptySummary(), 'OPEN')).toBe('Open');
  });

  it('rawStatus omitted preserves legacy behavior', () => {
    expect(classifyFromSummary(1, emptySummary())).toBe('Open');
  });

  it('rawStatus null preserves legacy behavior', () => {
    expect(classifyFromSummary(1, emptySummary(), null)).toBe('Open');
  });

  it('Filled via booked count still works when rawStatus=OPEN', () => {
    const summary = emptySummary();
    summary.totalAssignments = 2;
    summary.booked = 2;
    expect(classifyFromSummary(2, summary, 'OPEN')).toBe('Filled');
  });

  it('In progress when partially filled and rawStatus=IN_REVIEW', () => {
    const summary = emptySummary();
    summary.totalAssignments = 1;
    summary.proposed = 1;
    expect(classifyFromSummary(2, summary, 'IN_REVIEW')).toBe('In progress');
  });

  it('Closed via terminal-only assignments still derives correctly with OPEN status', () => {
    const summary = emptySummary();
    summary.totalAssignments = 2;
    summary.completed = 2;
    expect(classifyFromSummary(2, summary, 'OPEN')).toBe('Closed');
  });
});

/**
 * BUG-SR-1 round 2 — the controller passes the response-shape `id` field
 * (set to the publicId `stf_…` per DMD-026) to `deriveForRequest`. The
 * original Layer A fix queried `staffingRequest.findUnique({ where: { id }})`
 * using the publicId as a uuid → returned null → no short-circuit. Verify
 * `deriveForRequest` resolves a publicId via the publicId index, finds the
 * CANCELLED SR, and returns `'Cancelled'`.
 */
describe('DeriveStaffingRequestStatusService — publicId resolution (round 2)', () => {
  it('resolves publicId input to internal uuid before status fetch', async () => {
    const UUID = '00000000-0000-0000-0000-000000000001';
    const PUBLIC_ID = 'stf_aBcDeFgHiJ';

    const prismaStub = {
      staffingRequest: {
        findUnique: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (where.publicId === PUBLIC_ID) return { id: UUID };
          if (where.id === UUID) return { status: 'CANCELLED' };
          return null;
        }),
      },
      projectAssignment: {
        findMany: jest.fn(async () => []),
      },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveForRequest(PUBLIC_ID, 1);

    expect(result.derivedStatus).toBe('Cancelled');
    expect(result.summary.totalAssignments).toBe(0);
  });

  it('passes a bare uuid through without an extra lookup', async () => {
    const UUID = '00000000-0000-0000-0000-000000000002';

    const findUnique = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.id === UUID) return { status: 'OPEN' };
      return null;
    });

    const prismaStub = {
      staffingRequest: { findUnique },
      projectAssignment: { findMany: jest.fn(async () => []) },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveForRequest(UUID, 1);

    expect(result.derivedStatus).toBe('Open');
    // Only the status fetch — no publicId resolution round-trip.
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('returns a coherent empty-summary result for an unresolvable publicId', async () => {
    const prismaStub = {
      staffingRequest: {
        findUnique: jest.fn(async () => null),
      },
      projectAssignment: { findMany: jest.fn(async () => []) },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveForRequest('stf_doesNotExist', 1);

    expect(result.derivedStatus).toBe('Open');
    expect(result.summary.totalAssignments).toBe(0);
  });
});
