import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PulseRepository } from '../infrastructure/pulse.repository';

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function buildWeekList(weeks: number): Date[] {
  const result: Date[] = [];
  const now = getMondayOfWeek(new Date());
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    result.push(d);
  }
  return result;
}

export interface PersonThreeSixtyDto {
  personId: string;
  displayName: string;
  moodTrend: Array<{ weekStart: string; mood: number | null }>;
  workloadTrend: Array<{ weekStart: string; allocationPercent: number }>;
  hoursTrend: Array<{ weekStart: string; hours: number }>;
  currentMood: number | null;
  currentAllocation: number;
  alertActive: boolean;
}

@Injectable()
export class PeopleThreeSixtyService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly pulseRepo: PulseRepository,
  ) {}

  public async get360(personId: string, weeks: number): Promise<PersonThreeSixtyDto> {
    // Resolve display name
    const person = await this.prisma.person.findUnique({
      where: { id: personId },
      select: { displayName: true },
    });
    const displayName = person?.displayName ?? personId;

    const weekDates = buildWeekList(weeks);
    const fromDate = weekDates[0];
    const toDate = weekDates[weekDates.length - 1];

    // ── Mood trend ────────────────────────────────────────────────────────────
    const pulseRecords = await this.pulseRepo.findForPeople([personId], fromDate, toDate);
    const pulseMap = new Map<string, number>();
    for (const p of pulseRecords) {
      pulseMap.set(toDateStr(p.weekStart), p.mood);
    }

    const moodTrend = weekDates.map((d) => ({
      weekStart: toDateStr(d),
      mood: pulseMap.get(toDateStr(d)) ?? null,
    }));

    // ── Workload trend ────────────────────────────────────────────────────────
    // Use active assignments to derive allocation per week
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId,
        validFrom: { lte: toDate },
        OR: [{ validTo: null }, { validTo: { gte: fromDate } }],
      },
      select: { validFrom: true, validTo: true, allocationPercent: true },
    });

    const workloadTrend = weekDates.map((d) => {
      const weekEnd = new Date(d);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      let total = 0;
      for (const a of assignments) {
        const aStart = new Date(a.validFrom);
        const aEnd = a.validTo ? new Date(a.validTo) : new Date('2099-12-31');
        if (aStart <= weekEnd && aEnd >= d) {
          total += Number(a.allocationPercent);
        }
      }
      return { weekStart: toDateStr(d), allocationPercent: total };
    });

    // ── Hours trend ───────────────────────────────────────────────────────────
    const timesheetWeeks = await this.prisma.timesheetWeek.findMany({
      where: {
        personId,
        weekStart: { gte: fromDate, lte: toDate },
        status: 'APPROVED',
      },
      select: {
        weekStart: true,
        entries: { select: { hours: true } },
      },
    });

    const hoursMap = new Map<string, number>();
    for (const tw of timesheetWeeks) {
      const key = toDateStr(tw.weekStart);
      const total = tw.entries.reduce((sum, e) => sum + Number(e.hours), 0);
      hoursMap.set(key, total);
    }

    const hoursTrend = weekDates.map((d) => ({
      weekStart: toDateStr(d),
      hours: hoursMap.get(toDateStr(d)) ?? 0,
    }));

    // ── Derived fields ────────────────────────────────────────────────────────
    const currentMood = moodTrend[moodTrend.length - 1]?.mood ?? null;
    const currentAllocation = workloadTrend[workloadTrend.length - 1]?.allocationPercent ?? 0;

    // Alert: mood <= 2 for 2+ consecutive weeks (from most recent backwards)
    let alertActive = false;
    let consecutiveLow = 0;
    for (let i = moodTrend.length - 1; i >= 0; i--) {
      const m = moodTrend[i].mood;
      if (m !== null && m <= 2) {
        consecutiveLow++;
        if (consecutiveLow >= 2) {
          alertActive = true;
          break;
        }
      } else {
        break;
      }
    }

    return {
      personId,
      displayName,
      moodTrend,
      workloadTrend,
      hoursTrend,
      currentMood,
      currentAllocation,
      alertActive,
    };
  }
}
