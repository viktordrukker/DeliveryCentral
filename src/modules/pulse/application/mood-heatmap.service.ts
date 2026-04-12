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

function buildWeeksBetween(from: Date, to: Date): string[] {
  const weeks: string[] = [];
  const cur = getMondayOfWeek(from);
  const end = getMondayOfWeek(to);
  while (cur <= end) {
    weeks.push(toDateStr(cur));
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return weeks;
}

export interface MoodHeatmapResponse {
  people: Array<{
    id: string;
    displayName: string;
    weeklyMoods: Array<{ weekStart: string; mood: number | null }>;
  }>;
  weeks: string[];
  teamAverages: Array<{ weekStart: string; average: number | null }>;
}

@Injectable()
export class MoodHeatmapService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly pulseRepo: PulseRepository,
  ) {}

  public async getHeatmap(params: {
    from?: string;
    to?: string;
    orgUnitId?: string;
    managerId?: string;
    poolId?: string;
  }): Promise<MoodHeatmapResponse> {
    const now = new Date();
    const toDate = params.to ? new Date(params.to) : now;
    const fromDate = params.from
      ? new Date(params.from)
      : new Date(new Date(toDate).setUTCDate(toDate.getUTCDate() - 12 * 7));

    // Resolve candidate people
    let personIds: string[] | undefined;

    if (params.orgUnitId) {
      const members = await this.prisma.personOrgMembership.findMany({
        where: { orgUnitId: params.orgUnitId },
        select: { personId: true },
      });
      personIds = members.map((m) => m.personId);
    }

    if (params.managerId) {
      const lines = await this.prisma.reportingLine.findMany({
        where: {
          managerPersonId: params.managerId,
          validFrom: { lte: toDate },
          OR: [{ validTo: null }, { validTo: { gte: fromDate } }],
        },
        select: { subjectPersonId: true },
      });
      const lineIds = lines.map((l) => l.subjectPersonId);
      personIds = personIds ? personIds.filter((id) => lineIds.includes(id)) : lineIds;
    }

    if (params.poolId) {
      const memberships = await this.prisma.personResourcePoolMembership.findMany({
        where: { resourcePoolId: params.poolId },
        select: { personId: true },
      });
      const poolIds = memberships.map((m) => m.personId);
      personIds = personIds ? personIds.filter((id) => poolIds.includes(id)) : poolIds;
    }

    // Load people
    const peopleWhere = personIds ? { id: { in: personIds } } : {};
    const people = await this.prisma.person.findMany({
      where: peopleWhere,
      select: { id: true, displayName: true },
      take: 200,
    });

    const weeks = buildWeeksBetween(fromDate, toDate);

    if (people.length === 0) {
      return {
        people: [],
        weeks,
        teamAverages: weeks.map((w) => ({ weekStart: w, average: null })),
      };
    }

    const pulseRecords = await this.pulseRepo.findForPeople(
      people.map((p) => p.id),
      fromDate,
      toDate,
    );

    // Build map: personId -> weekStart -> mood
    const moodMap = new Map<string, Map<string, number>>();
    for (const r of pulseRecords) {
      if (!moodMap.has(r.personId)) {
        moodMap.set(r.personId, new Map());
      }
      moodMap.get(r.personId)!.set(toDateStr(r.weekStart), r.mood);
    }

    const peopleData = people.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      weeklyMoods: weeks.map((w) => ({
        weekStart: w,
        mood: moodMap.get(p.id)?.get(w) ?? null,
      })),
    }));

    // Team averages
    const teamAverages = weeks.map((w) => {
      const moods = peopleData
        .map((p) => p.weeklyMoods.find((wm) => wm.weekStart === w)?.mood ?? null)
        .filter((m): m is number => m !== null);
      const average =
        moods.length > 0 ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : null;
      return { weekStart: w, average };
    });

    return { people: peopleData, weeks, teamAverages };
  }
}
