import { ListEnrichedBenchService } from '@src/modules/project-positions/application/list-enriched-bench.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakePerson {
  id: string;
  displayName: string;
  role: string | null;
  location: string | null;
  grade: string | null;
  hiredAt: Date | null;
}

interface FakeFill {
  activePersonId: string;
  activeAllocationPercent: number;
}

interface FakeHistory {
  previousPersonId: string;
  occurredAt: Date;
}

function buildStub(seed: {
  people?: FakePerson[];
  activeFills?: FakeFill[];
  releasedHistory?: FakeHistory[];
}): PrismaService {
  const person = {
    findMany: async (_q: unknown): Promise<FakePerson[]> => seed.people ?? [],
  };
  const projectPosition = {
    findMany: async (_q: unknown): Promise<FakeFill[]> => seed.activeFills ?? [],
  };
  const projectPositionFillHistory = {
    groupBy: async (_q: unknown): Promise<Array<{ previousPersonId: string; _max: { occurredAt: Date } }>> => {
      const grouped = new Map<string, Date>();
      for (const h of seed.releasedHistory ?? []) {
        const prev = grouped.get(h.previousPersonId);
        if (!prev || h.occurredAt > prev) grouped.set(h.previousPersonId, h.occurredAt);
      }
      return [...grouped.entries()].map(([previousPersonId, occurredAt]) => ({
        previousPersonId,
        _max: { occurredAt },
      }));
    },
  };
  return { person, projectPosition, projectPositionFillHistory } as unknown as PrismaService;
}

describe('ListEnrichedBenchService (FE-#261)', () => {
  it('returns empty when no active persons exist', async () => {
    const svc = new ListEnrichedBenchService(buildStub({}));
    expect(await svc.listBench()).toEqual([]);
  });

  it('excludes persons with an active fill', async () => {
    const today = new Date();
    const prisma = buildStub({
      people: [
        { id: 'p1', displayName: 'On Bench', role: 'PM', location: 'NYC', grade: 'L5', hiredAt: new Date('2026-01-01') },
        { id: 'p2', displayName: 'Booked', role: 'PM', location: 'LON', grade: 'L4', hiredAt: new Date('2026-01-01') },
      ],
      activeFills: [{ activePersonId: 'p2', activeAllocationPercent: 100 }],
    });
    void today;
    const svc = new ListEnrichedBenchService(prisma);
    const rows = await svc.listBench();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.personId).toBe('p1');
    expect(rows[0]!.name).toBe('On Bench');
    expect(rows[0]!.availabilityHours14d).toBe(80);
  });

  it('computes daysOnBench from most recent RELEASED history (or hiredAt fallback)', async () => {
    const asOf = new Date('2026-05-24T00:00:00Z');
    const prisma = buildStub({
      people: [
        { id: 'p1', displayName: 'Recent Release', role: 'PM', location: null, grade: null, hiredAt: new Date('2026-01-01') },
        { id: 'p2', displayName: 'Never Assigned', role: 'PM', location: null, grade: null, hiredAt: new Date('2026-05-04') },
      ],
      releasedHistory: [
        { previousPersonId: 'p1', occurredAt: new Date('2026-05-14T00:00:00Z') }, // 10d ago
      ],
    });
    const svc = new ListEnrichedBenchService(prisma);
    const rows = await svc.listBench({ asOf });
    const p1 = rows.find((r) => r.personId === 'p1')!;
    const p2 = rows.find((r) => r.personId === 'p2')!;
    expect(p1.daysOnBench).toBe(10);
    expect(p2.daysOnBench).toBe(20); // 2026-05-04 → 2026-05-24
  });

  it('isOnBench is always true; suggestedProjectIds defaults to []', async () => {
    const prisma = buildStub({
      people: [{ id: 'p1', displayName: 'Solo', role: 'Eng', location: null, grade: null, hiredAt: null }],
    });
    const svc = new ListEnrichedBenchService(prisma);
    const rows = await svc.listBench();
    expect(rows[0]!.isOnBench).toBe(true);
    expect(rows[0]!.suggestedProjectIds).toEqual([]);
  });
});
