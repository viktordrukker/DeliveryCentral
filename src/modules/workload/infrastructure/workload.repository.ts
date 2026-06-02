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

/**
 * LEAN-P1-3: Workload reads now source from the lean ProjectPosition
 * aggregate. Consumers (workload.service.ts) still expect the legacy
 * field names (person / project / allocationPercent / validFrom /
 * validTo / status), so the repository remaps the column names back to
 * the legacy shape at the read boundary. This keeps response DTOs
 * byte-identical for /workload/matrix, /workload/planning, and
 * /workload/forecast.
 */
export interface MatrixAssignmentRow {
  id: string;
  allocationPercent: import('@prisma/client').Prisma.Decimal | null;
  validFrom: Date;
  validTo: Date | null;
  status: import('@prisma/client').ProjectPositionFillStatus;
  person: { id: string; displayName: string };
  project: { id: string; name: string; projectCode: string };
}

export interface PlanningAssignmentRow {
  id: string;
  allocationPercent: import('@prisma/client').Prisma.Decimal | null;
  validFrom: Date;
  validTo: Date | null;
  status: import('@prisma/client').ProjectPositionFillStatus;
  person: { id: string; displayName: string };
  project: { id: string; name: string };
}

@Injectable()
export class WorkloadRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async getMatrixAssignments(filters: WorkloadMatrixFilters): Promise<MatrixAssignmentRow[]> {
    const now = new Date();

    const personIdFilters: string[] | undefined = await this.resolvePersonIdFilters(filters);

    const positions = await this.prisma.projectPosition.findMany({
      where: {
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        activeValidFrom: { lte: now },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: now } }],
        ...(personIdFilters !== undefined ? { activePersonId: { in: personIdFilters } } : {}),
      },
      include: {
        activePerson: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
      orderBy: [{ activePerson: { displayName: 'asc' } }, { project: { name: 'asc' } }],
    });

    return positions
      .filter((p) => p.activePerson !== null && p.activeValidFrom !== null)
      .map((p) => ({
        id: p.id,
        allocationPercent: p.activeAllocationPercent,
        validFrom: p.activeValidFrom as Date,
        validTo: p.activeValidTo,
        status: p.fillStatus,
        person: {
          id: p.activePerson!.id,
          displayName: p.activePerson!.displayName,
        },
        project: {
          id: p.project.id,
          name: p.project.name,
          projectCode: p.project.projectCode,
        },
      }));
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

    // LEAN-P1-3: ProjectAssignment.CREATED has no analogue on ProjectPosition;
    // the lean shape models that lifecycle as DRAFT. Other states map 1:1.
    const overlapping = await this.prisma.projectPosition.findMany({
      where: {
        activePersonId: params.personId,
        fillStatus: { in: ['DRAFT', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        activeValidFrom: { lte: end },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: start } }],
        ...(params.excludeAssignmentId ? { NOT: { id: params.excludeAssignmentId } } : {}),
      },
    });

    const totalExisting = overlapping.reduce(
      (sum, p) => sum + (Number(p.activeAllocationPercent) || 0),
      0,
    );
    const totalWithNew = totalExisting + params.allocationPercent;

    return {
      conflictingAssignments: overlapping.map((p) => ({
        allocationPercent: Number(p.activeAllocationPercent) || 0,
        id: p.id,
        projectName: p.projectId,
      })),
      hasConflict: totalWithNew > 100,
      totalAllocationPercent: totalWithNew,
    };
  }

  public async getPlanningAssignments(filters: WorkloadPlanningFilters): Promise<PlanningAssignmentRow[]> {
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

    const positions = await this.prisma.projectPosition.findMany({
      where: {
        fillStatus: { in: ['DRAFT', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        activeValidFrom: { lte: toDate },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: fromDate } }],
        ...(personIdFilter !== undefined ? { activePersonId: personIdFilter } : {}),
      },
      include: {
        activePerson: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ activePerson: { displayName: 'asc' } }],
    });

    return positions
      .filter((p) => p.activePerson !== null && p.activeValidFrom !== null)
      .map((p) => ({
        id: p.id,
        allocationPercent: p.activeAllocationPercent,
        validFrom: p.activeValidFrom as Date,
        validTo: p.activeValidTo,
        status: p.fillStatus,
        person: {
          id: p.activePerson!.id,
          displayName: p.activePerson!.displayName,
        },
        project: {
          id: p.project.id,
          name: p.project.name,
        },
      }));
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

    // LEAN-P1-3: Fetch all relevant active ProjectPosition fills in the forecast window.
    const positions = await this.prisma.projectPosition.findMany({
      where: {
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        activeValidFrom: { lte: endOfForecast },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: monday } }],
      },
      select: {
        activePersonId: true,
        activeValidFrom: true,
        activeValidTo: true,
      },
    });

    // Normalize to legacy shape (personId / validFrom / validTo) so the
    // forecast aggregation logic below remains unchanged. Skip unfilled rows
    // (activePersonId === null) which have no person to forecast against.
    const fills = positions
      .filter(
        (p): p is typeof p & { activePersonId: string; activeValidFrom: Date } =>
          p.activePersonId !== null && p.activeValidFrom !== null,
      )
      .map((p) => ({
        personId: p.activePersonId,
        validFrom: p.activeValidFrom,
        validTo: p.activeValidTo,
      }));

    // Total active headcount (people with at least one active fill now)
    const activePersonIds = new Set(
      fills
        .filter((a) => a.validFrom <= now && (!a.validTo || a.validTo >= now))
        .map((a) => a.personId),
    );
    const headcount = activePersonIds.size;

    // Find at-risk people: single fill ending within next 14 days, no follow-on
    const twoWeeksOut = new Date(now);
    twoWeeksOut.setUTCDate(now.getUTCDate() + 14);

    const endingSoon = fills.filter(
      (a) => a.validTo && a.validTo >= now && a.validTo <= twoWeeksOut,
    );
    const atRiskPersonIds = new Set<string>();
    for (const a of endingSoon) {
      const hasFollowOn = fills.some(
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
        fills
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
