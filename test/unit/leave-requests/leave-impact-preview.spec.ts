/**
 * LEAN-P4-missing-11 — LeaveImpactPreviewService.
 *
 * Pure-logic unit test with a hand-rolled PrismaService double. Covers:
 *   - happy path with no conflicts
 *   - weekend + public-holiday exclusion in workingDaysRequested
 *   - balanceAfter null when no balance row exists
 *   - conflicting project assignments
 *   - conflicting team leave (PENDING/APPROVED) in the same OrgUnit
 *   - rejects end < start with BadRequestException
 */
import { LeaveImpactPreviewService } from '@src/modules/leave-requests/application/leave-impact-preview.service';
import { LeaveBalanceService } from '@src/modules/leave-requests/application/leave-balance.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface AssignmentRow {
  id: string;
  personId: string;
  validFrom: Date;
  validTo: Date | null;
  allocationPercent: number | null;
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

function buildPrismaStub(state: {
  holidays: HolidayRow[];
  assignments: AssignmentRow[];
  leaveRows: LeaveRow[];
  memberships: MembershipRow[];
}): PrismaService {
  const overlapsAssignment = (a: AssignmentRow, start: Date, end: Date): boolean => {
    if (a.validFrom > end) return false;
    if (a.validTo && a.validTo < start) return false;
    return true;
  };
  return {
    publicHoliday: {
      findMany: async ({ where }: { where: { date: { gte: Date; lte: Date } } }) =>
        state.holidays.filter((h) => h.date >= where.date.gte && h.date <= where.date.lte),
    },
    projectAssignment: {
      // Stub: return all non-archived assignments for the person whose
      // [validFrom, validTo] overlaps the queried range. The service's
      // post-query filter trims allocation==0 rows, so we don't enforce
      // that here.
      findMany: async ({ where }: { where: { personId: string; validFrom: { lte: Date } } }) => {
        const end = where.validFrom.lte;
        return state.assignments
          .filter((a) => a.personId === where.personId && a.archivedAt === null)
          .filter((a) => overlapsAssignment(a, new Date(0), end));
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
    const prisma = buildPrismaStub({ holidays: [], assignments: [], leaveRows: [], memberships: [{ personId: 'p-1', orgUnitId: null }] });
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
    expect(result.conflictingAssignmentIds).toEqual([]);
    expect(result.conflictingTeamLeaveIds).toEqual([]);
  });

  it('excludes weekends and public holidays from workingDaysRequested', async () => {
    // 2026-06-15 (Mon) → 2026-06-21 (Sun). Sat+Sun excluded; Thu is a holiday.
    const prisma = buildPrismaStub({
      holidays: [{ date: new Date('2026-06-18') }],
      assignments: [],
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
    const prisma = buildPrismaStub({ holidays: [], assignments: [], leaveRows: [], memberships: [{ personId: 'p-1', orgUnitId: null }] });
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

  it('surfaces conflicting project assignments by id', async () => {
    const prisma = buildPrismaStub({
      holidays: [],
      assignments: [
        {
          id: 'a-1',
          personId: 'p-1',
          validFrom: new Date('2026-06-01'),
          validTo: new Date('2026-12-31'),
          allocationPercent: 50,
          archivedAt: null,
        },
        {
          id: 'a-zero',
          personId: 'p-1',
          validFrom: new Date('2026-06-01'),
          validTo: new Date('2026-12-31'),
          allocationPercent: 0,
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

    expect(result.conflictingAssignmentIds).toEqual(['a-1']);
  });

  it('surfaces conflicting team leave (same OrgUnit, PENDING/APPROVED, overlap)', async () => {
    const prisma = buildPrismaStub({
      holidays: [],
      assignments: [],
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
    const prisma = buildPrismaStub({ holidays: [], assignments: [], leaveRows: [], memberships: [] });
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
