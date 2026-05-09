import { PulseService } from '@src/modules/pulse/application/pulse.service';
import { PulseRepository } from '@src/modules/pulse/infrastructure/pulse.repository';
import { InAppNotificationService } from '@src/modules/in-app-notifications/application/in-app-notification.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeEntry {
  personId: string;
  weekStart: Date;
  mood: number;
}

function mondayOf(d: Date): Date {
  const c = new Date(d);
  const day = c.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setUTCDate(c.getUTCDate() + diff);
  c.setUTCHours(0, 0, 0, 0);
  return c;
}

function shiftWeeks(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + 7 * n);
  return c;
}

function buildPrisma(entries: FakeEntry[]): PrismaService {
  return {
    pulseEntry: {
      findMany: async (args: {
        where: {
          personId: { in: string[] };
          weekStart: { gte: Date; lte: Date };
        };
        select?: unknown;
      }): Promise<Array<{ weekStart: Date; mood: number }>> => {
        const ids = new Set(args.where.personId.in);
        return entries
          .filter(
            (e) =>
              ids.has(e.personId) &&
              e.weekStart >= args.where.weekStart.gte &&
              e.weekStart <= args.where.weekStart.lte,
          )
          .map((e) => ({ weekStart: e.weekStart, mood: e.mood }));
      },
    },
  } as unknown as PrismaService;
}

const fakeRepo = {} as unknown as PulseRepository;
const fakeInApp = {} as unknown as InAppNotificationService;

describe('PulseService.getTeamTrend', () => {
  it('returns a weekly series with avgMood, responseCount and strugglingCount', async () => {
    const todayMonday = mondayOf(new Date());
    const lastWeekMonday = shiftWeeks(todayMonday, -1);
    const twoWeeksAgoMonday = shiftWeeks(todayMonday, -2);

    const entries: FakeEntry[] = [
      // Two weeks ago: 2 entries (mood 3, mood 1) → avg 2, struggling 1
      { personId: 'p1', weekStart: twoWeeksAgoMonday, mood: 3 },
      { personId: 'p2', weekStart: twoWeeksAgoMonday, mood: 1 },
      // Last week: 1 entry (mood 5) → avg 5, struggling 0
      { personId: 'p1', weekStart: lastWeekMonday, mood: 5 },
      // This week: empty → avg null
    ];

    const service = new PulseService(fakeRepo, buildPrisma(entries), fakeInApp);
    const trend = await service.getTeamTrend(['p1', 'p2'], 3);

    expect(trend.scopePersonCount).toBe(2);
    expect(trend.weeks).toHaveLength(3);

    expect(trend.weeks[0]).toMatchObject({ responseCount: 2, strugglingCount: 1 });
    expect(trend.weeks[0].avgMood).toBe(2);

    expect(trend.weeks[1]).toMatchObject({ responseCount: 1, strugglingCount: 0 });
    expect(trend.weeks[1].avgMood).toBe(5);

    expect(trend.weeks[2]).toMatchObject({ responseCount: 0, strugglingCount: 0, avgMood: null });
  });

  it('returns an empty trend (zero scope) when no person IDs are supplied', async () => {
    const service = new PulseService(fakeRepo, buildPrisma([]), fakeInApp);
    const trend = await service.getTeamTrend([], 4);
    expect(trend.scopePersonCount).toBe(0);
    expect(trend.weeks).toHaveLength(4);
    for (const week of trend.weeks) {
      expect(week.avgMood).toBeNull();
      expect(week.responseCount).toBe(0);
      expect(week.strugglingCount).toBe(0);
    }
  });

  it('clamps weeks to [1, 52]', async () => {
    const service = new PulseService(fakeRepo, buildPrisma([]), fakeInApp);
    const tooMany = await service.getTeamTrend([], 9999);
    expect(tooMany.weeks).toHaveLength(52);
    const tooFew = await service.getTeamTrend([], 0);
    expect(tooFew.weeks).toHaveLength(1);
  });

  it('produces weekStart dates that are sorted oldest → newest', async () => {
    const service = new PulseService(fakeRepo, buildPrisma([]), fakeInApp);
    const trend = await service.getTeamTrend([], 5);
    const dates = trend.weeks.map((w) => w.weekStart);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });
});
