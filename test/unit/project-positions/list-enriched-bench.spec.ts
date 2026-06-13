import { ListEnrichedBenchService } from '@src/modules/project-positions/application/list-enriched-bench.service';
import type { SuggestFillsService } from '@src/modules/project-positions/application/suggest-fills.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeSuggestion {
  personId: string;
  projectIds: string[];
}

/**
 * W2-06 stub — SuggestFillsService.suggestForPerson returns a precomputed
 * set of projectIds per person. Default = empty list. Tests opting into
 * suggested-fill behaviour pass `suggestions:` to control output.
 */
function buildSuggestStub(suggestions: FakeSuggestion[] = []): SuggestFillsService {
  const byPerson = new Map(suggestions.map((s) => [s.personId, s.projectIds]));
  return {
    suggestForPerson: async (personId: string) => ({
      personId,
      candidates: (byPerson.get(personId) ?? []).map((projectId, idx) => ({
        positionId: `pos-${projectId}-${idx}`,
        projectId,
        projectName: projectId,
        role: 'Engineer',
        matchScore: 0.7,
        matchedSkills: [],
        missingSkills: [],
      })),
    }),
  } as unknown as SuggestFillsService;
}

interface FakePerson {
  id: string;
  displayName: string;
  role: string | null;
  location: string | null;
  grade: string | null;
  hiredAt: Date | null;
}

interface FakeHistory {
  previousPersonId: string;
  occurredAt: Date;
}

/**
 * Stub mirrors the canonical bench helper's shape: `person.findMany`
 * resolves the active employee cohort, `projectPosition.groupBy` returns
 * the personIds currently holding an active fill (these are subtracted
 * from the bench). The second `person.findMany` (called by the service
 * to hydrate display attributes) returns rows whose id matches the
 * canonical bench-id set.
 */
function buildStub(seed: {
  people?: FakePerson[];
  filledPersonIds?: string[];
  releasedHistory?: FakeHistory[];
}): PrismaService {
  const filled = new Set(seed.filledPersonIds ?? []);
  const benchPeople = (seed.people ?? []).filter((p) => !filled.has(p.id));
  let findManyCall = 0;
  const person = {
    // First call inside listBenchPersonIds — returns the active cohort with
    // just `id`. Second call inside listBench — returns bench-only rows
    // with display attributes. We honour whichever shape Prisma asks for
    // by reading the caller's `select`/`where` is too much for this stub,
    // so we use call-order to switch shape.
    findMany: async (_q: unknown) => {
      findManyCall += 1;
      if (findManyCall === 1) {
        return (seed.people ?? []).map((p) => ({ id: p.id }));
      }
      return benchPeople;
    },
  };
  const projectPosition = {
    groupBy: async (_q: unknown) =>
      (seed.filledPersonIds ?? []).map((id) => ({ activePersonId: id })),
    // PR-16 (Decision E) — availabilityHours14d reads active allocation via
    // projectPosition.findMany. Bench people carry no active fill → empty.
    findMany: async (_q: unknown) => [] as Array<{ activeAllocationPercent: unknown; requiredAllocationPercent: unknown }>,
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
    const svc = new ListEnrichedBenchService(buildStub({}), buildSuggestStub());
    expect(await svc.listBench()).toEqual([]);
  });

  it('excludes persons with an active fill', async () => {
    const today = new Date();
    const prisma = buildStub({
      people: [
        { id: 'p1', displayName: 'On Bench', role: 'PM', location: 'NYC', grade: 'L5', hiredAt: new Date('2026-01-01') },
        { id: 'p2', displayName: 'Booked', role: 'PM', location: 'LON', grade: 'L4', hiredAt: new Date('2026-01-01') },
      ],
      filledPersonIds: ['p2'],
    });
    void today;
    const svc = new ListEnrichedBenchService(prisma, buildSuggestStub());
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
    const svc = new ListEnrichedBenchService(prisma, buildSuggestStub());
    const rows = await svc.listBench({ asOf });
    const p1 = rows.find((r) => r.personId === 'p1')!;
    const p2 = rows.find((r) => r.personId === 'p2')!;
    expect(p1.daysOnBench).toBe(10);
    expect(p1.daysOnBenchBasis).toBe('fill-history');
    expect(p2.daysOnBench).toBe(20); // 2026-05-04 → 2026-05-24
    // PR-16 (Decision E) — never-assigned person is labelled explicitly.
    expect(p2.daysOnBenchBasis).toBe('no-fill-history');
  });

  it('isOnBench is always true; suggestedProjectIds defaults to [] when SuggestFills returns no matches', async () => {
    const prisma = buildStub({
      people: [{ id: 'p1', displayName: 'Solo', role: 'Eng', location: null, grade: null, hiredAt: null }],
    });
    const svc = new ListEnrichedBenchService(prisma, buildSuggestStub());
    const rows = await svc.listBench();
    expect(rows[0]!.isOnBench).toBe(true);
    expect(rows[0]!.suggestedProjectIds).toEqual([]);
  });

  it('W2-06: populates suggestedProjectIds from SuggestFillsService.suggestForPerson', async () => {
    const prisma = buildStub({
      people: [
        { id: 'p1', displayName: 'A', role: 'Eng', location: null, grade: null, hiredAt: null },
        { id: 'p2', displayName: 'B', role: 'Eng', location: null, grade: null, hiredAt: null },
      ],
    });
    const suggest = buildSuggestStub([
      { personId: 'p1', projectIds: ['proj-alpha', 'proj-beta'] },
      { personId: 'p2', projectIds: [] },
    ]);
    const svc = new ListEnrichedBenchService(prisma, suggest);
    const rows = await svc.listBench();
    const p1 = rows.find((r) => r.personId === 'p1')!;
    const p2 = rows.find((r) => r.personId === 'p2')!;
    expect(p1.suggestedProjectIds).toEqual(['proj-alpha', 'proj-beta']);
    expect(p2.suggestedProjectIds).toEqual([]);
  });

  it('W2-06: dedupes projectIds when multiple positions point at the same project', async () => {
    const prisma = buildStub({
      people: [{ id: 'p1', displayName: 'A', role: 'Eng', location: null, grade: null, hiredAt: null }],
    });
    // Two candidates ranking the same projectId — output should keep one.
    const suggest = buildSuggestStub([
      { personId: 'p1', projectIds: ['proj-alpha', 'proj-alpha', 'proj-beta'] },
    ]);
    const svc = new ListEnrichedBenchService(prisma, suggest);
    const rows = await svc.listBench();
    expect(rows[0]!.suggestedProjectIds).toEqual(['proj-alpha', 'proj-beta']);
  });

  it('W2-06: degrades gracefully when SuggestFills throws for a single person', async () => {
    const prisma = buildStub({
      people: [
        { id: 'p1', displayName: 'A', role: 'Eng', location: null, grade: null, hiredAt: null },
        { id: 'p2', displayName: 'B', role: 'Eng', location: null, grade: null, hiredAt: null },
      ],
    });
    const flaky: SuggestFillsService = {
      suggestForPerson: async (personId: string) => {
        if (personId === 'p1') throw new Error('boom');
        return {
          personId,
          candidates: [
            {
              positionId: 'pos-x',
              projectId: 'proj-gamma',
              projectName: 'Gamma',
              role: 'Eng',
              matchScore: 0.5,
              matchedSkills: [],
              missingSkills: [],
            },
          ],
        };
      },
    } as unknown as SuggestFillsService;
    const svc = new ListEnrichedBenchService(prisma, flaky);
    const rows = await svc.listBench();
    const p1 = rows.find((r) => r.personId === 'p1')!;
    const p2 = rows.find((r) => r.personId === 'p2')!;
    expect(p1.suggestedProjectIds).toEqual([]);
    expect(p2.suggestedProjectIds).toEqual(['proj-gamma']);
  });

  it('row count reconciles with the canonical bench helper', async () => {
    // 5 active people, 2 filled — canonical bench = 3 people.
    // Endpoint must return exactly 3 rows (no broken positionsHeld filter
    // silently dropping rows like PR #525's miss).
    const prisma = buildStub({
      people: [
        { id: 'p1', displayName: 'A', role: 'PM', location: null, grade: null, hiredAt: new Date('2026-01-01') },
        { id: 'p2', displayName: 'B', role: 'PM', location: null, grade: null, hiredAt: new Date('2026-01-01') },
        { id: 'p3', displayName: 'C', role: 'PM', location: null, grade: null, hiredAt: new Date('2026-01-01') },
        { id: 'p4', displayName: 'D', role: 'PM', location: null, grade: null, hiredAt: new Date('2026-01-01') },
        { id: 'p5', displayName: 'E', role: 'PM', location: null, grade: null, hiredAt: new Date('2026-01-01') },
      ],
      filledPersonIds: ['p2', 'p4'],
    });
    const svc = new ListEnrichedBenchService(prisma, buildSuggestStub());
    const rows = await svc.listBench();
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.personId).sort()).toEqual(['p1', 'p3', 'p5']);
  });
});
