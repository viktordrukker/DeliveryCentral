import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

type TimesheetWeekWithEntries = Prisma.TimesheetWeekGetPayload<{
  include: { entries: true };
}>;

@Injectable()
export class TimesheetRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findWeekWithEntries(
    personId: string,
    weekStart: Date,
  ): Promise<TimesheetWeekWithEntries | null> {
    return this.prisma.timesheetWeek.findUnique({
      where: { personId_weekStart: { personId, weekStart } },
      include: { entries: true },
    });
  }

  public async findWeekById(id: string): Promise<TimesheetWeekWithEntries | null> {
    return this.prisma.timesheetWeek.findUnique({
      where: { id },
      include: { entries: true },
    });
  }

  public async createWeek(
    personId: string,
    weekStart: Date,
  ): Promise<TimesheetWeekWithEntries> {
    return this.prisma.timesheetWeek.create({
      data: { personId, weekStart },
      include: { entries: true },
    });
  }

  public async updateWeek(
    id: string,
    data: Prisma.TimesheetWeekUpdateInput,
  ): Promise<TimesheetWeekWithEntries> {
    // FIXME(DATA-06): TimesheetWeek has a version field but updates don't use optimistic locking.
    // Compare with prisma-project-assignment.repository.ts:228 — the right pattern is updateMany
    // with `where: { id, version: aggregate.version }` + throw on count == 0. Apply once callers
    // are refactored to thread the current version through (currently service mutates by id only).
    return this.prisma.timesheetWeek.update({
      where: { id },
      data,
      include: { entries: true },
    });
  }

  public async upsertEntry(
    timesheetWeekId: string,
    projectId: string,
    date: Date,
    hours: Prisma.Decimal | number,
    capex: boolean,
    description?: string,
    benchCategory?: string,
    workLabel?: string,
    workItemId?: string,
  ): Promise<Prisma.TimesheetEntryGetPayload<Record<string, never>>> {
    const bench = benchCategory ?? '';
    const work = workLabel ?? '';
    return this.prisma.timesheetEntry.upsert({
      where: {
        timesheetWeekId_projectId_benchCategory_workLabel_date: {
          timesheetWeekId,
          projectId,
          benchCategory: bench,
          workLabel: work,
          date,
        },
      },
      create: {
        timesheetWeekId,
        projectId,
        date,
        hours,
        capex,
        description,
        benchCategory: bench,
        workLabel: work,
        workItemId: workItemId ?? null,
      },
      update: {
        hours,
        capex,
        description,
        workItemId: workItemId ?? null,
      },
    });
  }

  public async renameRowInMonth(
    personId: string,
    monthStart: Date,
    monthEnd: Date,
    kind: 'BENCH' | 'WORK_LABEL',
    projectId: string | undefined,
    oldLabel: string,
    newLabel: string,
  ): Promise<{ count: number }> {
    const where: Prisma.TimesheetEntryWhereInput = {
      timesheetWeek: { personId, status: 'DRAFT' },
      date: { gte: monthStart, lte: monthEnd },
    };
    if (kind === 'BENCH') {
      where.benchCategory = oldLabel;
    } else {
      where.workLabel = oldLabel;
      if (projectId) where.projectId = projectId;
    }
    const data: Prisma.TimesheetEntryUpdateManyMutationInput =
      kind === 'BENCH' ? { benchCategory: newLabel } : { workLabel: newLabel };
    return this.prisma.timesheetEntry.updateMany({ where, data });
  }

  public async deleteRowInMonth(
    personId: string,
    monthStart: Date,
    monthEnd: Date,
    kind: 'BENCH' | 'WORK_LABEL',
    projectId: string | undefined,
    label: string,
  ): Promise<{ count: number }> {
    const where: Prisma.TimesheetEntryWhereInput = {
      timesheetWeek: { personId, status: 'DRAFT' },
      date: { gte: monthStart, lte: monthEnd },
    };
    if (kind === 'BENCH') {
      where.benchCategory = label;
    } else {
      where.workLabel = label;
      if (projectId) where.projectId = projectId;
    }
    return this.prisma.timesheetEntry.deleteMany({ where });
  }

  public async findApprovalQueue(query: {
    status?: string;
    personId?: string;
    from?: string;
    to?: string;
  }): Promise<TimesheetWeekWithEntries[]> {
    const where: Prisma.TimesheetWeekWhereInput = {};

    if (query.status) {
      where.status = query.status as Prisma.EnumTimesheetStatusFilter;
    } else {
      where.status = 'SUBMITTED';
    }

    if (query.personId) {
      where.personId = query.personId;
    }

    if (query.from) {
      where.weekStart = { gte: new Date(query.from) };
    }

    if (query.to) {
      where.weekStart = {
        ...(typeof where.weekStart === 'object' && where.weekStart !== null
          ? (where.weekStart as object)
          : {}),
        lte: new Date(query.to),
      };
    }

    return this.prisma.timesheetWeek.findMany({
      where,
      include: { entries: true },
      orderBy: { weekStart: 'asc' },
    });
  }

  public async findHistory(
    personId: string,
    from?: string,
    to?: string,
  ): Promise<TimesheetWeekWithEntries[]> {
    const where: Prisma.TimesheetWeekWhereInput = { personId };

    if (from) {
      where.weekStart = { gte: new Date(from) };
    }

    if (to) {
      where.weekStart = {
        ...(typeof where.weekStart === 'object' && where.weekStart !== null
          ? (where.weekStart as object)
          : {}),
        lte: new Date(to),
      };
    }

    return this.prisma.timesheetWeek.findMany({
      where,
      include: { entries: true },
      orderBy: { weekStart: 'desc' },
    });
  }

  public async findLocksForDate(date: Date): Promise<{ id: string }[]> {
    return this.prisma.periodLock.findMany({
      where: {
        periodFrom: { lte: date },
        periodTo: { gte: date },
      },
      select: { id: true },
    });
  }

  public async findApprovedEntries(
    from?: string,
    to?: string,
    projectId?: string,
    personId?: string,
  ): Promise<
    Array<
      Prisma.TimesheetEntryGetPayload<Record<string, never>> & {
        timesheetWeek: { personId: string; weekStart: Date };
      }
    >
  > {
    const weekWhere: Prisma.TimesheetWeekWhereInput = { status: 'APPROVED' };

    if (personId) {
      weekWhere.personId = personId;
    }

    if (from) {
      weekWhere.weekStart = { gte: new Date(from) };
    }

    if (to) {
      weekWhere.weekStart = {
        ...(typeof weekWhere.weekStart === 'object' && weekWhere.weekStart !== null
          ? (weekWhere.weekStart as object)
          : {}),
        lte: new Date(to),
      };
    }

    const entryWhere: Prisma.TimesheetEntryWhereInput = {
      timesheetWeek: weekWhere,
    };

    if (projectId) {
      entryWhere.projectId = projectId;
    }

    return this.prisma.timesheetEntry.findMany({
      where: entryWhere,
      include: { timesheetWeek: { select: { personId: true, weekStart: true } } },
      orderBy: { date: 'asc' },
    }) as unknown as Promise<
      Array<
        Prisma.TimesheetEntryGetPayload<Record<string, never>> & {
          timesheetWeek: { personId: string; weekStart: Date };
        }
      >
    >;
  }
}
