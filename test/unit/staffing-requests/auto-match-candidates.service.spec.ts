/**
 * LEAN-P4-missing-3 — AutoMatchCandidatesService unit tests.
 *
 * Covers:
 *   - 404 when the position does not exist.
 *   - 80% skill-intersection floor filters out under-matching candidates.
 *   - Date+allocation overlap filter drops conflicting people.
 *   - Top-N truncation + rank assignment (1-based, monotonic).
 *   - Upsert path threads actorId through createdByPersonId/updatedByPersonId.
 *   - Empty result short-circuits the transaction.
 */
import { NotFoundException } from '@nestjs/common';

import {
  AutoMatchCandidatesService,
  AutoMatchSlateRow,
} from '@src/modules/staffing-requests/application/auto-match-candidates.service';
import { SuggestFillsService } from '@src/modules/project-positions/application/suggest-fills.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeCandidate {
  personId: string;
  name: string;
  role: string;
  grade: string | null;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  availabilityHours14d: number;
}

interface FakePosition {
  id: string;
  startDate: Date;
  endDate: Date;
  skills: string[];
  requiredAllocationPercent: number;
}

interface UpsertRecord {
  positionId: string;
  candidatePersonId: string;
  rank: number;
  matchScore: number;
  decision: string;
  createdByPersonId?: string | null;
  updatedByPersonId?: string | null;
}

function buildPrisma(opts: {
  position?: FakePosition | null;
  conflicts?: Array<{ activePersonId: string }>;
}): { prisma: PrismaService; upserts: UpsertRecord[] } {
  const upserts: UpsertRecord[] = [];
  const projectPosition = {
    findUnique: jest.fn().mockResolvedValue(opts.position ?? null),
    findMany: jest.fn().mockResolvedValue(opts.conflicts ?? []),
  };
  const projectPositionCandidate = {
    upsert: jest.fn().mockImplementation(async (args: {
      where: { positionId_candidatePersonId: { positionId: string; candidatePersonId: string } };
      create: { positionId: string; candidatePersonId: string; rank: number; matchScore: number; decision: string; createdByPersonId?: string | null; updatedByPersonId?: string | null };
    }) => {
      upserts.push({
        positionId: args.create.positionId,
        candidatePersonId: args.create.candidatePersonId,
        rank: args.create.rank,
        matchScore: args.create.matchScore,
        decision: args.create.decision,
        createdByPersonId: args.create.createdByPersonId ?? null,
        updatedByPersonId: args.create.updatedByPersonId ?? null,
      });
      return {
        id: `cand-${args.create.candidatePersonId}`,
        candidatePersonId: args.create.candidatePersonId,
        rank: args.create.rank,
        matchScore: args.create.matchScore,
        decision: args.create.decision,
      };
    }),
  };
  const tx = { projectPositionCandidate };
  const prisma = {
    projectPosition,
    $transaction: jest.fn().mockImplementation(async (cb: (t: typeof tx) => Promise<void>) => {
      await cb(tx);
    }),
  } as unknown as PrismaService;
  return { prisma, upserts };
}

function buildSuggestFills(candidates: FakeCandidate[]): SuggestFillsService {
  const stub = {
    suggestForPosition: jest.fn().mockResolvedValue({
      positionId: 'pos-1',
      requiredSkills: [],
      candidates,
    }),
  };
  return stub as unknown as SuggestFillsService;
}

const POSITION_ID = '11111111-1111-1111-1111-111111111111';

function fakePosition(overrides: Partial<FakePosition> = {}): FakePosition {
  return {
    id: POSITION_ID,
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-12-31T00:00:00.000Z'),
    skills: ['React', 'Node', 'TypeScript', 'Postgres', 'AWS'],
    requiredAllocationPercent: 100,
    ...overrides,
  };
}

function fakeCandidate(personId: string, name: string, matchedSkills: string[], missingSkills: string[] = [], matchScore = 0.5): FakeCandidate {
  return {
    personId,
    name,
    role: 'Engineer',
    grade: 'L4',
    matchScore,
    matchedSkills,
    missingSkills,
    availabilityHours14d: 80,
  };
}

describe('AutoMatchCandidatesService.execute (LEAN-P4-missing-3)', () => {
  it('throws NotFound when the position does not exist', async () => {
    const { prisma } = buildPrisma({ position: null });
    const svc = new AutoMatchCandidatesService(prisma, buildSuggestFills([]));
    await expect(
      svc.execute({ positionId: POSITION_ID, actorId: 'rm-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('applies the 80% skill-intersection floor (5 required → need ≥4 matched)', async () => {
    const { prisma, upserts } = buildPrisma({ position: fakePosition() });
    // 5 required skills → 80% floor = 4. Ada has 5/5, Bo has 4/5, Cy has 3/5.
    const suggest = buildSuggestFills([
      fakeCandidate('p-ada', 'Ada', ['React', 'Node', 'TypeScript', 'Postgres', 'AWS'], [], 0.95),
      fakeCandidate('p-bo', 'Bo', ['React', 'Node', 'TypeScript', 'Postgres'], ['AWS'], 0.85),
      fakeCandidate('p-cy', 'Cy', ['React', 'Node', 'TypeScript'], ['Postgres', 'AWS'], 0.7),
    ]);
    const svc = new AutoMatchCandidatesService(prisma, suggest);
    const out = await svc.execute({ positionId: POSITION_ID, actorId: 'rm-1' });
    // Cy is dropped (3 < 4). Ada + Bo make it in.
    expect(out.created).toBe(2);
    expect(out.candidates.map((c: AutoMatchSlateRow) => c.personId)).toEqual(['p-ada', 'p-bo']);
    expect(upserts.map((u) => u.candidatePersonId)).toEqual(['p-ada', 'p-bo']);
  });

  it('drops people whose existing assignment overlaps the position window', async () => {
    const { prisma, upserts } = buildPrisma({
      position: fakePosition({ skills: [] }), // no skill floor — exercise date filter only
      conflicts: [{ activePersonId: 'p-busy' }],
    });
    const suggest = buildSuggestFills([
      fakeCandidate('p-free', 'Free', [], [], 0.6),
      fakeCandidate('p-busy', 'Busy', [], [], 0.9),
    ]);
    const svc = new AutoMatchCandidatesService(prisma, suggest);
    const out = await svc.execute({ positionId: POSITION_ID, actorId: 'rm-1' });
    expect(out.created).toBe(1);
    expect(out.candidates[0]!.personId).toBe('p-free');
    expect(upserts.find((u) => u.candidatePersonId === 'p-busy')).toBeUndefined();
  });

  it('truncates to topN and assigns ranks starting at 1', async () => {
    const { prisma, upserts } = buildPrisma({ position: fakePosition({ skills: [] }) });
    const suggest = buildSuggestFills([
      fakeCandidate('p-a', 'A', [], [], 0.9),
      fakeCandidate('p-b', 'B', [], [], 0.8),
      fakeCandidate('p-c', 'C', [], [], 0.7),
      fakeCandidate('p-d', 'D', [], [], 0.6),
      fakeCandidate('p-e', 'E', [], [], 0.5),
      fakeCandidate('p-f', 'F', [], [], 0.4),
    ]);
    const svc = new AutoMatchCandidatesService(prisma, suggest);
    const out = await svc.execute({ positionId: POSITION_ID, actorId: 'rm-1', topN: 3 });
    expect(out.created).toBe(3);
    expect(out.candidates.map((c) => c.rank)).toEqual([1, 2, 3]);
    expect(upserts.map((u) => u.rank)).toEqual([1, 2, 3]);
    expect(upserts.map((u) => u.candidatePersonId)).toEqual(['p-a', 'p-b', 'p-c']);
  });

  it('defaults topN to 5 when omitted', async () => {
    const { prisma } = buildPrisma({ position: fakePosition({ skills: [] }) });
    const suggest = buildSuggestFills(
      Array.from({ length: 10 }, (_, i) => fakeCandidate(`p-${i}`, `P${i}`, [], [], 0.5)),
    );
    const svc = new AutoMatchCandidatesService(prisma, suggest);
    const out = await svc.execute({ positionId: POSITION_ID, actorId: 'rm-1' });
    expect(out.created).toBe(5);
  });

  it('threads actorId through createdByPersonId + updatedByPersonId', async () => {
    const { prisma, upserts } = buildPrisma({ position: fakePosition({ skills: [] }) });
    const suggest = buildSuggestFills([fakeCandidate('p-a', 'A', [], [], 0.9)]);
    const svc = new AutoMatchCandidatesService(prisma, suggest);
    await svc.execute({ positionId: POSITION_ID, actorId: 'rm-actor', topN: 1 });
    expect(upserts[0]!.createdByPersonId).toBe('rm-actor');
    expect(upserts[0]!.updatedByPersonId).toBe('rm-actor');
    expect(upserts[0]!.decision).toBe('PENDING');
  });

  it('returns an empty slate without opening the transaction when no candidates survive filtering', async () => {
    const { prisma } = buildPrisma({ position: fakePosition() });
    // All under the 80% floor.
    const suggest = buildSuggestFills([fakeCandidate('p-a', 'A', ['React'], ['Node', 'TypeScript', 'Postgres', 'AWS'], 0.5)]);
    const svc = new AutoMatchCandidatesService(prisma, suggest);
    const out = await svc.execute({ positionId: POSITION_ID, actorId: 'rm-1' });
    expect(out.created).toBe(0);
    expect(out.candidates).toEqual([]);
    expect((prisma as unknown as { $transaction: jest.Mock }).$transaction).not.toHaveBeenCalled();
  });

  it('accepts a null actorId without writing personId columns', async () => {
    const { prisma, upserts } = buildPrisma({ position: fakePosition({ skills: [] }) });
    const suggest = buildSuggestFills([fakeCandidate('p-a', 'A', [], [], 0.9)]);
    const svc = new AutoMatchCandidatesService(prisma, suggest);
    await svc.execute({ positionId: POSITION_ID, actorId: null, topN: 1 });
    expect(upserts[0]!.createdByPersonId).toBeNull();
    expect(upserts[0]!.updatedByPersonId).toBeNull();
  });
});
