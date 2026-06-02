import { DeriveStaffingRequestStatusService } from '@src/modules/staffing-requests/application/derive-staffing-request-status.service';
import {
  classifyFromProjectPositionFillStatus,
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

/**
 * LEAN-P1-4 — classifyFromProjectPositionFillStatus maps every
 * ProjectPositionFillStatus enum value to a DerivedStaffingRequestStatus.
 * ProjectPosition.fillStatus is the authoritative column in the lean
 * model so the function is a pure switch — no assignment counting.
 */
describe('classifyFromProjectPositionFillStatus — LEAN-P1-4', () => {
  it('DRAFT → Open', () => {
    expect(classifyFromProjectPositionFillStatus('DRAFT', 1)).toBe('Open');
  });
  it('OPEN → Open', () => {
    expect(classifyFromProjectPositionFillStatus('OPEN', 1)).toBe('Open');
  });
  it('PROPOSED → In progress', () => {
    expect(classifyFromProjectPositionFillStatus('PROPOSED', 1)).toBe('In progress');
  });
  it('BOOKED → Filled', () => {
    expect(classifyFromProjectPositionFillStatus('BOOKED', 1)).toBe('Filled');
  });
  it('ONBOARDING → Filled', () => {
    expect(classifyFromProjectPositionFillStatus('ONBOARDING', 1)).toBe('Filled');
  });
  it('ASSIGNED → Filled', () => {
    expect(classifyFromProjectPositionFillStatus('ASSIGNED', 1)).toBe('Filled');
  });
  it('ON_HOLD → Filled', () => {
    expect(classifyFromProjectPositionFillStatus('ON_HOLD', 1)).toBe('Filled');
  });
  it('RELEASED → Closed', () => {
    expect(classifyFromProjectPositionFillStatus('RELEASED', 1)).toBe('Closed');
  });
});

/**
 * LEAN-P1-4 — deriveProjectPositionFill reads ProjectPosition by
 * legacyStaffingRequestId and maps fillStatus directly. The single-row
 * helper resolves publicId → uuid first.
 */
describe('DeriveStaffingRequestStatusService.deriveProjectPositionFill — LEAN-P1-4', () => {
  it('returns Filled when ProjectPosition.fillStatus = BOOKED', async () => {
    const UUID = '00000000-0000-0000-0000-000000000010';
    const prismaStub = {
      staffingRequest: {
        findUnique: jest.fn(async () => ({ id: UUID })),
      },
      projectPosition: {
        findFirst: jest.fn(async () => ({ fillStatus: 'BOOKED' })),
      },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFill(UUID, 1);

    expect(result.derivedStatus).toBe('Filled');
  });

  it('returns Open when no ProjectPosition row exists', async () => {
    const UUID = '00000000-0000-0000-0000-000000000011';
    const prismaStub = {
      staffingRequest: {
        findUnique: jest.fn(async () => ({ id: UUID })),
      },
      projectPosition: {
        findFirst: jest.fn(async () => null),
      },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFill(UUID, 1);

    expect(result.derivedStatus).toBe('Open');
  });

  it('resolves publicId via staffingRequest.findUnique before ProjectPosition lookup', async () => {
    const UUID = '00000000-0000-0000-0000-000000000012';
    const PUBLIC_ID = 'stf_AbCdEfGhIj';

    const srFindUnique = jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.publicId === PUBLIC_ID) return { id: UUID };
      return null;
    });
    const positionFindFirst = jest.fn(async () => ({ fillStatus: 'OPEN' }));

    const prismaStub = {
      staffingRequest: { findUnique: srFindUnique },
      projectPosition: { findFirst: positionFindFirst },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFill(PUBLIC_ID, 1);

    expect(result.derivedStatus).toBe('Open');
    // The lookup must use the resolved uuid, not the publicId.
    expect(positionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { legacyStaffingRequestId: UUID } }),
    );
  });

  it('returns Open when publicId cannot be resolved', async () => {
    const prismaStub = {
      staffingRequest: {
        findUnique: jest.fn(async () => null),
      },
      projectPosition: {
        findFirst: jest.fn(async () => null),
      },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFill('stf_doesNotExist', 1);

    expect(result.derivedStatus).toBe('Open');
  });
});

/**
 * LEAN-P1-4 — deriveProjectPositionFills batches a list of SR ids and
 * returns a Map keyed by the caller-supplied input id. Missing
 * ProjectPosition rows default to 'Open' so the Map has one entry per
 * input (parity with deriveForRequests).
 */
describe('DeriveStaffingRequestStatusService.deriveProjectPositionFills — LEAN-P1-4', () => {
  it('maps each ProjectPosition.fillStatus to derivedStatus in batch', async () => {
    const UUID1 = '00000000-0000-0000-0000-000000000020';
    const UUID2 = '00000000-0000-0000-0000-000000000021';
    const UUID3 = '00000000-0000-0000-0000-000000000022';

    const prismaStub = {
      staffingRequest: {
        findMany: jest.fn(async () => [
          { id: UUID1, publicId: null },
          { id: UUID2, publicId: null },
          { id: UUID3, publicId: null },
        ]),
      },
      projectPosition: {
        findMany: jest.fn(async () => [
          { legacyStaffingRequestId: UUID1, fillStatus: 'BOOKED' },
          { legacyStaffingRequestId: UUID2, fillStatus: 'PROPOSED' },
          { legacyStaffingRequestId: UUID3, fillStatus: 'RELEASED' },
        ]),
      },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFills([
      { legacyStaffingRequestId: UUID1, headcountRequired: 1 },
      { legacyStaffingRequestId: UUID2, headcountRequired: 2 },
      { legacyStaffingRequestId: UUID3, headcountRequired: 1 },
    ]);

    expect(result.get(UUID1)?.derivedStatus).toBe('Filled');
    expect(result.get(UUID2)?.derivedStatus).toBe('In progress');
    expect(result.get(UUID3)?.derivedStatus).toBe('Closed');
  });

  it('defaults to Open for SRs without a ProjectPosition row', async () => {
    const UUID1 = '00000000-0000-0000-0000-000000000030';
    const UUID2 = '00000000-0000-0000-0000-000000000031';

    const prismaStub = {
      staffingRequest: {
        findMany: jest.fn(async () => [
          { id: UUID1, publicId: null },
          { id: UUID2, publicId: null },
        ]),
      },
      projectPosition: {
        findMany: jest.fn(async () => [
          { legacyStaffingRequestId: UUID1, fillStatus: 'BOOKED' },
        ]),
      },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFills([
      { legacyStaffingRequestId: UUID1, headcountRequired: 1 },
      { legacyStaffingRequestId: UUID2, headcountRequired: 1 },
    ]);

    expect(result.get(UUID1)?.derivedStatus).toBe('Filled');
    expect(result.get(UUID2)?.derivedStatus).toBe('Open');
  });

  it('re-keys publicId inputs back to the caller-supplied id', async () => {
    const UUID = '00000000-0000-0000-0000-000000000040';
    const PUBLIC_ID = 'stf_ZyXwVuTsRq';

    const prismaStub = {
      staffingRequest: {
        findMany: jest.fn(async () => [{ id: UUID, publicId: PUBLIC_ID }]),
      },
      projectPosition: {
        findMany: jest.fn(async () => [
          { legacyStaffingRequestId: UUID, fillStatus: 'BOOKED' },
        ]),
      },
    } as unknown as PrismaService;

    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFills([
      { legacyStaffingRequestId: PUBLIC_ID, headcountRequired: 1 },
    ]);

    expect(result.get(PUBLIC_ID)?.derivedStatus).toBe('Filled');
    expect(result.has(UUID)).toBe(false);
  });

  it('returns empty Map for empty input', async () => {
    const prismaStub = {} as unknown as PrismaService;
    const svc = new DeriveStaffingRequestStatusService(prismaStub);
    const result = await svc.deriveProjectPositionFills([]);
    expect(result.size).toBe(0);
  });
});
