/**
 * LEAN-P4-missing-11 — LeaveImpactPreviewService.
 *
 * Pure-logic unit test with a hand-rolled PrismaService double. Covers:
 *   - happy path with no conflicts
 *   - weekend + public-holiday exclusion in workingDaysRequested
 *   - balanceAfter null when no balance row exists
 *   - conflicting project positions (post-lean: queries ProjectPosition
 *     aggregate, not the deleted ProjectAssignment table)
 *   - conflicting team leave (PENDING/APPROVED) in the same OrgUnit
 *   - rejects end < start with BadRequestException
 */
import { LeaveImpactPreviewService } from '@src/modules/leave-requests/application/leave-impact-preview.service';
import { LeaveBalanceService } from '@src/modules/leave-requests/application/leave-balance.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface PositionRow {
  id: string;
  activePersonId: string;
  fillStatus: 'DRAFT' | 'OPEN' | 'PROPOSED' | 'BOOKED' | 'ONBOARDING' | 'ASSIGNED' | 'ON_HOLD' | 'RELEASED';
  activeValidFrom: Date;
  activeValidTo: Date | null;
  activeAllocationPercent: number | null;
  archivedAt: Date | null;
}

interface LeaveRow {
  id: string;
  personId: string;
  startDate: Date;
  endDate: Date;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  orgUnitId: string | null;
}

interface HolidayRow {
  date: Date;
}

interface MembershipRow {
  personId: string;
  orgUnitId: string | null;
}

const ACTIVE_FILL_STATUSES = new Set(['BOOKED', 'ONBOARDING', 'ASSIGNED']);

function buildPrismaStub(state: {
  holidays: HolidayRow[];
  positions: PositionRow[];
  leaveRows: LeaveRow[];
  memberships: MembershipRow[];
}): PrismaService {
  const overlapsPosition = (p: PositionRow, start: Date, end: Date): boolean => {
    if (p.activeValidFrom > end) return false;
    if (p.activeValidTo && p.activeValidTo < start) return false;
    return true;
  };
  return {
    publicHoliday: {
      findMany: async ({ where }: { where: { date: { gte: Date; lte: Date } } }) =>
        state.holidays.filter((h) => h.date >= where.date.gte && h.date <= where.date.lte),
    },
    projectPosition: {
      // Stub: return non-archived positions for this person whose
      // active fill window overlaps [start, end] AND fillStatus is active.
      // The service's post-query filter trims allocation<=0 rows.
      findMany: async ({
        where,
      }: {
        where: {
          activePersonId: string;
          fillStatus: { in: string[] };
          activeValidFrom: { lte: Date };
        };
      }) => {
        const end = where.activeValidFrom.lte;
        return state.positions
          .filter((p) => p.activePersonId === where.activePersonId && p.archivedAt === null)
          .filter((p) => where.fillStatus.in.includes(p.fillStatus))
          .filter((p) => overlapsPosition(p, new Date(0), end));
      },
    },
    personOrgMembership: {
      findFirst: async ({ where }: { where: { personId: string } }) =>
        state.memberships.find((m) => m.personId === where.personId) ?? null,
      findMany: async ({ where }: { where: { orgUnitId: string; personId: { not: string } } }) =>
        state.memberships
          .filter((m) => m.orgUnitId === where.orgUnitId)
          .filter((m) => m.personId !== where.personId.not)
          .map((m) => ({ personId: m.personId })),
    },
    leaveRequest: {
      findMany: async ({
        where,
      }: {
        where: {
          personId: { in: string[] };
          status: { in: string[] };
          startDate: { lte: Date };
          endDate: { gte: Date };
        };
      }) =>
        state.leaveRows
          .filter((l) => where.personId.in.includes(l.personId))
          .filter((l) => where.status.in.includes(l.status))
          .filter((l) => l.startDate <= where.startDate.lte && l.endDate >= where.endDate.gte),
    },
  } as unknown as PrismaService;
}

function stubBalanceService(remaining: number | null): LeaveBalanceService {
  return {
    getBalances: async () => {
      if (remaining === null) return [];
      return [
        {
          id: 'b-1',
          personId: 'p-1',
          year: 2026,
          leaveType: 'ANNUAL',
          entitlement: 25,
          used: 0,
          pending: 0,
          remaining,
        },
      ];
    },
  } as unknown as LeaveBalanceService;
}

describe('LeaveImpactPreviewService — LEAN-P4-missing-11', () => {
  it('returns happy-path preview (no conflicts, no holidays)', async () => {
    // 2026-06-15 (Mon) → 2026-06-19 (Fri) = 5 working days
    const prisma = buildPrismaStub({ holidays: [], positions: [], leaveRows: [], memberships: [{ personId: 'p-1', orgUnitId: null }] });
    const balance = stubBalanceService(20);
    const svc = new LeaveImpactPreviewService(prisma, balance);

    const result = await svc.preview({
      personId: 'p-1',
      startDate: '2026-06-15',
      endDate: '2026-06-19',
      type: 'ANNUAL',
    });

    expect(result.workingDaysRequested).toBe(5);
    expect(result.skippedHolidays).toEqual([]);
    expect(result.balanceAfter).toBe(15);
    expect(result.conflictingPositionIds).toEqual([]);
    expect(result.conflictingTeamLeaveIds).toEqual([]);
  });

  it('excludes weekends and public holidays from workingDaysRequested', async () => {
    // 2026-06-15 (Mon) → 2026-06-21 (Sun). Sat+Sun excluded; Thu is a holiday.
    const prisma = buildPrismaStub({
      holidays: [{ date: new Date('2026-06-18') }],
      positions: [],
      leaveRows: [],
      memberships: [{ personId: 'p-1', orgUnitId: null }],
    });
    const balance = stubBalanceService(20);
    const svc = new LeaveImpactPreviewService(prisma, balance);

    const result = await svc.preview({
      personId: 'p-1',
      startDate: '2026-06-15',
      endDate: '2026-06-21',
      type: 'ANNUAL',
    });

    expect(result.workingDaysRequested).toBe(4); // Mon, Tue, Wed, Fri
    expect(result.skippedHolidays).toEqual(['2026-06-18']);
  });

  it('returns null balanceAfter when no balance row exists for the type', async () => {
    const prisma = buildPrismaStub({ holidays: [], positions: [], leaveRows: [], memberships: [{ personId: 'p-1', orgUnitId: null }] });
    const balance = stubBalanceService(null);
    const svc = new LeaveImpactPreviewService(prisma, balance);

    const result = await svc.preview({
      personId: 'p-1',
      startDate: '2026-06-15',
      endDate: '2026-06-16',
      type: 'ANNUAL',
    });

    expect(result.balanceAfter).toBeNull();
  });

  it('surfaces conflicting project positions by id, excludes 0-allocation and non-active fillStatus', async () => {
    const prisma = buildPrismaStub({
      holidays: [],
      positions: [
        {
          id: 'pp-1',
          activePersonId: 'p-1',
          fillStatus: 'ASSIGNED',
          activeValidFrom: new Date('2026-06-01'),
          activeValidTo: new Date('2026-12-31'),
          activeAllocationPercent: 50,
          archivedAt: null,
        },
        {
          // 0% allocation — filtered out post-query.
          id: 'pp-zero',
          activePersonId: 'p-1',
          fillStatus: 'ASSIGNED',
          activeValidFrom: new Date('2026-06-01'),
          activeValidTo: new Date('2026-12-31'),
          activeAllocationPercent: 0,
          archivedAt: null,
        },
        {
          // PROPOSED — not yet an active fill, filtered by where.fillStatus.in.
          id: 'pp-proposed',
          activePersonId: 'p-1',
          fillStatus: 'PROPOSED',
          activeValidFrom: new Date('2026-06-01'),
          activeValidTo: new Date('2026-12-31'),
          activeAllocationPercent: 80,
          archivedAt: null,
        },
        {
          // ON_HOLD — assignment paused, the person isn't actually committed.
          id: 'pp-onhold',
          activePersonId: 'p-1',
          fillStatus: 'ON_HOLD',
          activeValidFrom: new Date('2026-06-01'),
          activeValidTo: new Date('2026-12-31'),
          activeAllocationPercent: 100,
          archivedAt: null,
        },
        {
          // ONBOARDING — still actively committed.
          id: 'pp-onboarding',
          activePersonId: 'p-1',
          fillStatus: 'ONBOARDING',
          activeValidFrom: new Date('2026-06-01'),
          activeValidTo: null,
          activeAllocationPercent: 100,
          archivedAt: null,
        },
      ],
      leaveRows: [],
      memberships: [{ personId: 'p-1', orgUnitId: null }],
    });
    const balance = stubBalanceService(20);
    const svc = new LeaveImpactPreviewService(prisma, balance);

    const result = await svc.preview({
      personId: 'p-1',
      startDate: '2026-06-15',
      endDate: '2026-06-19',
      type: 'ANNUAL',
    });

    expect(result.conflictingPositionIds.sort()).toEqual(['pp-1', 'pp-onboarding']);
  });

  it('surfaces conflicting team leave (same OrgUnit, PENDING/APPROVED, overlap)', async () => {
    const prisma = buildPrismaStub({
      holidays: [],
      positions: [],
      leaveRows: [
        {
          id: 'team-1',
          personId: 'p-teammate',
          startDate: new Date('2026-06-16'),
          endDate: new Date('2026-06-18'),
          status: 'APPROVED',
          orgUnitId: 'unit-A',
        },
        {
          id: 'team-rejected',
          personId: 'p-teammate2',
          startDate: new Date('2026-06-16'),
          endDate: new Date('2026-06-18'),
          status: 'REJECTED',
          orgUnitId: 'unit-A',
        },
        {
          id: 'team-other-unit',
          personId: 'p-other',
          startDate: new Date('2026-06-16'),
          endDate: new Date('2026-06-18'),
          status: 'APPROVED',
          orgUnitId: 'unit-B',
        },
      ],
      memberships: [
        { personId: 'p-1', orgUnitId: 'unit-A' },
        { personId: 'p-teammate', orgUnitId: 'unit-A' },
        { personId: 'p-teammate2', orgUnitId: 'unit-A' },
        { personId: 'p-other', orgUnitId: 'unit-B' },
      ],
    });
    const balance = stubBalanceService(20);
    const svc = new LeaveImpactPreviewService(prisma, balance);

    const result = await svc.preview({
      personId: 'p-1',
      startDate: '2026-06-15',
      endDate: '2026-06-19',
      type: 'ANNUAL',
    });

    expect(result.conflictingTeamLeaveIds).toEqual(['team-1']);
  });

  it('rejects endDate before startDate with BadRequestException', async () => {
    const prisma = buildPrismaStub({ holidays: [], positions: [], leaveRows: [], memberships: [] });
    const balance = stubBalanceService(20);
    const svc = new LeaveImpactPreviewService(prisma, balance);

    await expect(
      svc.preview({
        personId: 'p-1',
        startDate: '2026-06-20',
        endDate: '2026-06-15',
        type: 'ANNUAL',
      }),
    ).rejects.toThrow(/endDate must not be before startDate/);
  });
});
