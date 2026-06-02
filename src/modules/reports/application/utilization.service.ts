import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface UtilizationPersonRow {
  actualHours: number;
  assignedHours: number;
  availableHours: number;
  personId: string;
  personName: string;
  utilizationPercent: number;
}

export interface UtilizationReport {
  byPerson: UtilizationPersonRow[];
  fromDate: string;
  stdHoursPerDay: number;
  toDate: string;
}

function countWorkdays(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

@Injectable()
export class UtilizationService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getReport(params: {
    from: string;
    orgUnitId?: string;
    personId?: string;
    stdHoursPerDay?: number;
    to: string;
  }): Promise<UtilizationReport> {
    const fromDate = new Date(params.from);
    const toDate = new Date(params.to);
    const stdHoursPerDay = params.stdHoursPerDay ?? 8;
    const totalWorkdays = countWorkdays(fromDate, toDate);
    const availableHoursPerPerson = totalWorkdays * stdHoursPerDay;

    // LEAN-P1-3: read active ProjectPosition rows in place of legacy
    // ProjectAssignment. activePersonId is the analogue of personId on the
    // fill side; aggregation logic is unchanged.
    const positions = await this.prisma.projectPosition.findMany({
      where: {
        fillStatus: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        activeValidFrom: { lte: toDate },
        OR: [{ activeValidTo: null }, { activeValidTo: { gte: fromDate } }],
        ...(params.personId ? { activePersonId: params.personId } : {}),
      },
      select: {
        activePersonId: true,
        activeAllocationPercent: true,
      },
    });

    // Find person names (skipping any unfilled positions where activePersonId is null)
    const personIds = [
      ...new Set(
        positions
          .map((p) => p.activePersonId)
          .filter((id): id is string => id !== null),
      ),
    ];
    const people = await this.prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, displayName: true },
    });
    const personNameMap = new Map(people.map((p) => [p.id, p.displayName]));

    // Find actual timesheet hours in the period (from approved weeks)
    const timesheetWeeks = await this.prisma.timesheetWeek.findMany({
      where: {
        weekStart: { gte: fromDate, lte: toDate },
        status: 'APPROVED',
        ...(params.personId ? { personId: params.personId } : {}),
        ...(personIds.length > 0 && !params.personId ? { personId: { in: personIds } } : {}),
      },
      select: { personId: true, entries: { select: { hours: true } } },
    });

    const actualHoursMap = new Map<string, number>();
    for (const week of timesheetWeeks) {
      const current = actualHoursMap.get(week.personId) ?? 0;
      const weekTotal = week.entries.reduce((sum, e) => sum + Number(e.hours ?? 0), 0);
      actualHoursMap.set(week.personId, current + weekTotal);
    }

    // Aggregate by person (skip unfilled positions with null activePersonId)
    const personMap = new Map<string, number>();
    for (const position of positions) {
      if (!position.activePersonId) continue;
      const current = personMap.get(position.activePersonId) ?? 0;
      personMap.set(
        position.activePersonId,
        current + Number(position.activeAllocationPercent ?? 0),
      );
    }

    const byPerson: UtilizationPersonRow[] = [...personMap.entries()].map(([personId, totalAllocation]) => {
      const assignedHours = (totalAllocation / 100) * availableHoursPerPerson;
      const actualHours = actualHoursMap.get(personId) ?? 0;
      return {
        actualHours: Math.round(actualHours * 10) / 10,
        assignedHours: Math.round(assignedHours * 10) / 10,
        availableHours: availableHoursPerPerson,
        personId,
        personName: personNameMap.get(personId) ?? personId,
        utilizationPercent:
          availableHoursPerPerson > 0
            ? Math.round((assignedHours / availableHoursPerPerson) * 1000) / 10
            : 0,
      };
    });

    return {
      byPerson,
      fromDate: params.from,
      stdHoursPerDay,
      toDate: params.to,
    };
  }
}
