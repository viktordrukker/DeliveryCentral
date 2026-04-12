import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface WorkloadMatrixFilters {
  poolId?: string;
  orgUnitId?: string;
  managerId?: string;
}

export interface WorkloadPlanningFilters {
  from?: string;
  to?: string;
  poolId?: string;
}

@Injectable()
export class WorkloadRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async getMatrixAssignments(filters: WorkloadMatrixFilters) {
    const now = new Date();

    const personIdFilters: string[] | undefined = await this.resolvePersonIdFilters(filters);

    return this.prisma.projectAssignment.findMany({
      where: {
        status: { in: ['APPROVED', 'ACTIVE'] },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
        ...(personIdFilters !== undefined ? { personId: { in: personIdFilters } } : {}),
      },
      include: {
        person: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: [{ person: { displayName: 'asc' } }, { project: { name: 'asc' } }],
    });
  }

  public async getOverlappingAllocations(params: {
    allocationPercent: number;
    endDate: string;
    excludeAssignmentId?: string;
    personId: string;
    startDate: string;
  }): Promise<{ conflictingAssignments: { allocationPercent: number; id: string; projectName: string }[]; hasConflict: boolean; totalAllocationPercent: number }> {
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);

    const overlapping = await this.prisma.projectAssignment.findMany({
      where: {
        personId: params.personId,
        status: { in: ['REQUESTED', 'APPROVED', 'ACTIVE'] },
        validFrom: { lte: end },
        OR: [{ validTo: null }, { validTo: { gte: start } }],
        ...(params.excludeAssignmentId ? { NOT: { id: params.excludeAssignmentId } } : {}),
      },
    });

    const totalExisting = overlapping.reduce((sum, a) => sum + (Number(a.allocationPercent) || 0), 0);
    const totalWithNew = totalExisting + params.allocationPercent;

    return {
      conflictingAssignments: overlapping.map((a) => ({
        allocationPercent: Number(a.allocationPercent) || 0,
        id: a.id,
        projectName: a.projectId,
      })),
      hasConflict: totalWithNew > 100,
      totalAllocationPercent: totalWithNew,
    };
  }

  public async getPlanningAssignments(filters: WorkloadPlanningFilters) {
    const now = new Date();
    const fromDate = filters.from ? new Date(filters.from) : now;
    const toDate = filters.to
      ? new Date(filters.to)
      : new Date(fromDate.getTime() + 12 * 7 * 24 * 60 * 60 * 1000);

    let personIdFilter: { in: string[] } | undefined;

    if (filters.poolId) {
      const memberships = await this.prisma.personResourcePoolMembership.findMany({
        where: {
          resourcePoolId: filters.poolId,
          validFrom: { lte: toDate },
          OR: [{ validTo: null }, { validTo: { gte: fromDate } }],
        },
        select: { personId: true },
      });

      personIdFilter = { in: memberships.map((m) => m.personId) };
    }

    return this.prisma.projectAssignment.findMany({
      where: {
        status: { in: ['APPROVED', 'REQUESTED'] },
        validFrom: { lte: toDate },
        OR: [{ validTo: null }, { validTo: { gte: fromDate } }],
        ...(personIdFilter !== undefined ? { personId: personIdFilter } : {}),
      },
      include: {
        person: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ person: { displayName: 'asc' } }],
    });
  }

  public async getCapacityForecast(params: { poolId?: string; weeks?: number }) {
    const numWeeks = params.weeks ?? 12;
    const now = new Date();

    // Get Monday of current week
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + diff);
    monday.setUTCHours(0, 0, 0, 0);

    // Build 12 future week starts
    const weekStarts: Date[] = [];
    for (let i = 0; i < numWeeks; i++) {
      const w = new Date(monday);
      w.setUTCDate(monday.getUTCDate() + i * 7);
      weekStarts.push(w);
    }

    const endOfForecast = new Date(weekStarts[numWeeks - 1]);
    endOfForecast.setUTCDate(endOfForecast.getUTCDate() + 6);

    // Fetch all relevant active assignments in the forecast window
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        status: { in: ['APPROVED', 'ACTIVE'] },
        validFrom: { lte: endOfForecast },
        OR: [{ validTo: null }, { validTo: { gte: monday } }],
      },
      select: {
        personId: true,
        validFrom: true,
        validTo: true,
      },
    });

    // Total active headcount (people with at least one active assignment now)
    const activePersonIds = new Set(
      assignments
        .filter((a) => a.validFrom <= now && (!a.validTo || a.validTo >= now))
        .map((a) => a.personId),
    );
    const headcount = activePersonIds.size;

    // Find at-risk people: single assignment ending within next 14 days, no follow-on
    const twoWeeksOut = new Date(now);
    twoWeeksOut.setUTCDate(now.getUTCDate() + 14);

    const endingSoon = assignments.filter(
      (a) => a.validTo && a.validTo >= now && a.validTo <= twoWeeksOut,
    );
    const atRiskPersonIds = new Set<string>();
    for (const a of endingSoon) {
      const hasFollowOn = assignments.some(
        (other) =>
          other.personId === a.personId &&
          other !== a &&
          other.validFrom > now,
      );
      if (!hasFollowOn) {
        atRiskPersonIds.add(a.personId);
      }
    }

    // For each future week, count bench = headcount - people_covered
    const forecastData = weekStarts.map((weekStart) => {
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

      const coveredPersonIds = new Set(
        assignments
          .filter((a) => a.validFrom <= weekEnd && (!a.validTo || a.validTo >= weekStart))
          .map((a) => a.personId),
      );

      const bench = Math.max(0, headcount - coveredPersonIds.size);
      const atRiskThisWeek = [...atRiskPersonIds].filter((pid) => coveredPersonIds.has(pid));

      return {
        atRiskCount: atRiskThisWeek.length,
        atRiskPeople: atRiskThisWeek,
        bench,
        covered: coveredPersonIds.size,
        headcount,
        week: weekStart.toISOString().slice(0, 10),
      };
    });

    return forecastData;
  }

  private async resolvePersonIdFilters(filters: WorkloadMatrixFilters): Promise<string[] | undefined> {
    const sets: string[][] = [];

    if (filters.poolId) {
      const now = new Date();
      const memberships = await this.prisma.personResourcePoolMembership.findMany({
        where: {
          resourcePoolId: filters.poolId,
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gte: now } }],
        },
        select: { personId: true },
      });

      sets.push(memberships.map((m) => m.personId));
    }

    if (filters.orgUnitId) {
      const now = new Date();
      const memberships = await this.prisma.personOrgMembership.findMany({
        where: {
          orgUnitId: filters.orgUnitId,
          validFrom: { lte: now },
          OR: [{ validTo: null }, { validTo: { gte: now } }],
        },
        select: { personId: true },
      });

      sets.push(memberships.map((m) => m.personId));
    }

    if (filters.managerId) {
      const lines = await this.prisma.reportingLine.findMany({
        where: {
          managerPersonId: filters.managerId,
          validFrom: { lte: new Date() },
          OR: [{ validTo: null }, { validTo: { gte: new Date() } }],
        },
        select: { subjectPersonId: true },
      });

      sets.push(lines.map((l) => l.subjectPersonId));
    }

    if (sets.length === 0) {
      return undefined;
    }

    // Intersect all sets
    let result = sets[0];
    for (let i = 1; i < sets.length; i++) {
      const setB = new Set(sets[i]);
      result = result.filter((id) => setB.has(id));
    }

    return result;
  }
}
