import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

@Injectable()
export class FinancialRepository {
  public constructor(private readonly prisma: PrismaService) {}

  // ─── Capitalisation ───────────────────────────────────────────────────────

  public async findApprovedEntriesForCapitalisation(
    from: Date,
    to: Date,
    projectId?: string,
  ): Promise<
    Array<{
      projectId: string;
      hours: Prisma.Decimal;
      capex: boolean;
      date: Date;
      timesheetWeek: { personId: string };
    }>
  > {
    const entryWhere: Prisma.TimesheetEntryWhereInput = {
      timesheetWeek: {
        status: 'APPROVED',
        weekStart: { gte: from, lte: to },
      },
    };

    if (projectId) {
      entryWhere.projectId = projectId;
    }

    return this.prisma.timesheetEntry.findMany({
      where: entryWhere,
      select: {
        projectId: true,
        hours: true,
        capex: true,
        date: true,
        timesheetWeek: { select: { personId: true } },
      },
      orderBy: { date: 'asc' },
    }) as Promise<
      Array<{
        projectId: string;
        hours: Prisma.Decimal;
        capex: boolean;
        date: Date;
        timesheetWeek: { personId: string };
      }>
    >;
  }

  public async findProjectNamesByIds(
    projectIds: string[],
  ): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
  }

  public async findActiveAssignmentsForProjects(
    projectIds: string[],
  ): Promise<
    Array<{ projectId: string; allocationPercent: Prisma.Decimal | null }>
  > {
    // SoT PR 14b — canonical read from ProjectPosition.
    // status=BOOKED + validTo=null on legacy = fillStatus=BOOKED + activeValidTo=null on canonical.
    const positions = await this.prisma.projectPosition.findMany({
      where: {
        projectId: { in: projectIds },
        fillStatus: 'BOOKED',
        activeValidTo: null,
      },
      select: { projectId: true, activeAllocationPercent: true },
    });
    return positions.map((p) => ({
      projectId: p.projectId,
      allocationPercent: p.activeAllocationPercent,
    }));
  }

  // ─── Period Locks ─────────────────────────────────────────────────────────

  public async createPeriodLock(data: {
    periodFrom: Date;
    periodTo: Date;
    lockedBy: string;
  }): Promise<{ id: string; periodFrom: Date; periodTo: Date; lockedBy: string; lockedAt: Date }> {
    return this.prisma.periodLock.create({ data });
  }

  public async findAllPeriodLocks(): Promise<
    Array<{ id: string; periodFrom: Date; periodTo: Date; lockedBy: string; lockedAt: Date }>
  > {
    return this.prisma.periodLock.findMany({ orderBy: { periodFrom: 'desc' } });
  }

  public async findPeopleByIds(
    personIds: string[],
  ): Promise<Array<{ id: string; displayName: string; publicId: string | null }>> {
    if (personIds.length === 0) return [];
    return this.prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, displayName: true, publicId: true },
    });
  }

  public async deletePeriodLock(id: string): Promise<void> {
    await this.prisma.periodLock.delete({ where: { id } });
  }

  public async findLocksForDate(date: Date): Promise<
    Array<{ id: string; periodFrom: Date; periodTo: Date }>
  > {
    return this.prisma.periodLock.findMany({
      where: {
        periodFrom: { lte: date },
        periodTo: { gte: date },
      },
    });
  }

  // ─── Project Budget ───────────────────────────────────────────────────────

  public async upsertProjectBudget(data: {
    projectId: string;
    fiscalYear: number;
    capexBudget: Prisma.Decimal;
    opexBudget: Prisma.Decimal;
    // F-111 / D-103-write-path — optional actor for both create + update.
    actorId?: string;
  }): Promise<{
    id: string;
    projectId: string;
    fiscalYear: number;
    capexBudget: Prisma.Decimal;
    opexBudget: Prisma.Decimal;
  }> {
    return this.prisma.projectBudget.upsert({
      where: { projectId_fiscalYear: { projectId: data.projectId, fiscalYear: data.fiscalYear } },
      create: {
        projectId: data.projectId,
        fiscalYear: data.fiscalYear,
        capexBudget: data.capexBudget,
        opexBudget: data.opexBudget,
        createdByPersonId: data.actorId ?? null,
        updatedByPersonId: data.actorId ?? null,
      },
      update: {
        capexBudget: data.capexBudget,
        opexBudget: data.opexBudget,
        updatedByPersonId: data.actorId ?? null,
      },
    });
  }

  public async findProjectBudget(projectId: string, fiscalYear: number): Promise<{
    id: string;
    projectId: string;
    fiscalYear: number;
    capexBudget: Prisma.Decimal;
    opexBudget: Prisma.Decimal;
  } | null> {
    return this.prisma.projectBudget.findUnique({
      where: { projectId_fiscalYear: { projectId, fiscalYear } },
    });
  }

  // ─── Person Cost Rate ─────────────────────────────────────────────────────

  public async createPersonCostRate(data: {
    personId: string;
    effectiveFrom: Date;
    hourlyRate: Prisma.Decimal;
    rateType: string;
    // F-124 / D-103-write-path round 34 — actor for createdByPersonId
    // (immutable row — no updatedByPersonId column on this aggregate).
    actorId?: string;
  }): Promise<{
    id: string;
    personId: string;
    effectiveFrom: Date;
    hourlyRate: Prisma.Decimal;
    rateType: string;
    createdAt: Date;
  }> {
    // DM-4-2: rateType is now `PersonCostRateType` enum; cast the
    // string input via `as never` to keep the repo signature string-
    // typed for callers.
    const { actorId, ...rest } = data;
    return this.prisma.personCostRate.create({
      data: {
        ...rest,
        rateType: rest.rateType as never,
        // F-124 / D-103-write-path — populate creator on insert.
        createdByPersonId: actorId ?? null,
      },
    });
  }

  public async findEffectiveCostRates(
    personIds: string[],
    asOf: Date,
  ): Promise<Array<{ personId: string; hourlyRate: Prisma.Decimal; effectiveFrom: Date }>> {
    // For each person, find the most recent rate effective on or before asOf
    const rates = await this.prisma.personCostRate.findMany({
      where: {
        personId: { in: personIds },
        effectiveFrom: { lte: asOf },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    // Deduplicate — take the first (most recent) rate per person
    const seen = new Set<string>();
    const result: Array<{ personId: string; hourlyRate: Prisma.Decimal; effectiveFrom: Date }> = [];

    for (const r of rates) {
      if (!seen.has(r.personId)) {
        seen.add(r.personId);
        result.push({ personId: r.personId, hourlyRate: r.hourlyRate, effectiveFrom: r.effectiveFrom });
      }
    }

    return result;
  }

  // ─── Budget Dashboard ─────────────────────────────────────────────────────

  public async findApprovedEntriesForProject(
    projectId: string,
    fiscalYear: number,
  ): Promise<
    Array<{
      date: Date;
      hours: Prisma.Decimal;
      timesheetWeek: { personId: string };
      staffingRole?: string | null;
    }>
  > {
    const yearStart = new Date(Date.UTC(fiscalYear, 0, 1));
    const yearEnd = new Date(Date.UTC(fiscalYear, 11, 31));

    return this.prisma.timesheetEntry.findMany({
      where: {
        projectId,
        timesheetWeek: {
          status: 'APPROVED',
          weekStart: { gte: yearStart, lte: yearEnd },
        },
      },
      select: {
        date: true,
        hours: true,
        timesheetWeek: { select: { personId: true } },
      },
      orderBy: { date: 'asc' },
    }) as Promise<
      Array<{
        date: Date;
        hours: Prisma.Decimal;
        timesheetWeek: { personId: string };
        staffingRole?: string | null;
      }>
    >;
  }

  public async findApprovedAssignmentRolesForProject(
    projectId: string,
  ): Promise<Array<{ personId: string; staffingRole: string; allocationPercent: Prisma.Decimal | null }>> {
    // SoT PR 14b — canonical read from ProjectPosition.
    // status=BOOKED on legacy => fillStatus=BOOKED on canonical (active person assigned).
    const positions = await this.prisma.projectPosition.findMany({
      where: { projectId, fillStatus: 'BOOKED', activePersonId: { not: null } },
      select: {
        activePersonId: true,
        role: true,
        activeAllocationPercent: true,
      },
    });
    return positions
      .filter((p): p is typeof p & { activePersonId: string } => p.activePersonId !== null)
      .map((p) => ({
        personId: p.activePersonId,
        staffingRole: p.role ?? '',
        allocationPercent: p.activeAllocationPercent,
      }));
  }
}
