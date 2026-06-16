import { NotFoundException } from '@nestjs/common';

import { SuggestFillsService } from '@src/modules/project-positions/application/suggest-fills.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakePersonSkill { proficiency: number; skill: { name: string } }
interface FakePerson {
  id: string;
  displayName: string;
  role: string | null;
  grade: string | null;
  personSkills: FakePersonSkill[];
}

function buildStub(seed: {
  position?: { id: string; role: string | null; skills: string[] } | null;
  people?: FakePerson[];
  activeFills?: Array<{ activePersonId: string }>;
  /** PR-16 (Decision E) — per-person Σ active allocation (default 0 ⇒ 80h free). */
  allocationByPerson?: Record<string, number>;
}): PrismaService {
  const projectPosition = {
    findUnique: async (_q: unknown) => seed.position ?? null,
    // PR-16 (Decision E) — two callers hit findMany:
    //  - the busy anti-join (where.activePersonId = { in: [...] })
    //  - availabilityHours14d's Σ-allocation read (where.activePersonId = '<id>')
    // The allocation read selects allocation columns and filters by a single
    // personId; return that person's allocation rows.
    findMany: async (q: { where?: { activePersonId?: unknown } }) => {
      const ap = q?.where?.activePersonId;
      if (typeof ap === 'string') {
        const pct = seed.allocationByPerson?.[ap] ?? 0;
        return pct > 0 ? [{ activeAllocationPercent: pct, requiredAllocationPercent: pct }] : [];
      }
      return seed.activeFills ?? [];
    },
  };
  const person = {
    findMany: async (_q: unknown): Promise<FakePerson[]> => seed.people ?? [],
  };
  return { projectPosition, person } as unknown as PrismaService;
}

function skill(name: string, proficiency: number): FakePersonSkill {
  return { proficiency, skill: { name } };
}

describe('SuggestFillsService.score (pure)', () => {
  it('scores full skill + role match high', () => {
    const r = SuggestFillsService.score(
      ['React', 'Node'],
      'Engineer',
      new Map([['react', 5], ['node', 3]]),
      'Engineer',
    );
    // skillFit = (5/5 + 3/5)/2 = 0.8 ; +0.3 role +0.1 avail
    expect(r.matchScore).toBe(0.88);
    expect(r.matchedSkills).toEqual(['React', 'Node']);
    expect(r.missingSkills).toEqual([]);
  });

  it('records missing skills and a role mismatch', () => {
    const r = SuggestFillsService.score(
      ['React', 'Node'],
      'Engineer',
      new Map([['react', 5]]),
      'PM',
    );
    // skillFit = (5/5 + 0)/2 = 0.5 ; role 0 ; +0.1 avail
    expect(r.matchScore).toBe(0.4);
    expect(r.matchedSkills).toEqual(['React']);
    expect(r.missingSkills).toEqual(['Node']);
  });

  it('is case-insensitive and uses neutral skillFit when no skills required', () => {
    const r = SuggestFillsService.score([], 'Eng', new Map([['x', 5]]), 'eng');
    // skillFit neutral 0.5·0.6=0.3 ; role match 0.3 ; avail 0.1
    expect(r.matchScore).toBe(0.7);
  });
});

describe('SuggestFillsService.suggestForPosition', () => {
  const position = { id: 'pos1', role: 'Engineer', skills: ['React', 'Node'] };

  it('throws NotFound when the position does not exist', async () => {
    const svc = new SuggestFillsService(buildStub({ position: null }));
    await expect(svc.suggestForPosition('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ranks by match score, excludes busy people, and respects the limit', async () => {
    const svc = new SuggestFillsService(
      buildStub({
        position,
        people: [
          { id: 'a', displayName: 'Ada', role: 'Engineer', grade: 'L5', personSkills: [skill('React', 5), skill('Node', 3)] },
          { id: 'b', displayName: 'Bo', role: 'PM', grade: 'L4', personSkills: [skill('React', 5)] },
          { id: 'c', displayName: 'Cy', role: 'Engineer', grade: 'L3', personSkills: [skill('React', 4), skill('Node', 4)] },
          { id: 'busy', displayName: 'Zed', role: 'Engineer', grade: 'L5', personSkills: [skill('React', 5), skill('Node', 5)] },
        ],
        activeFills: [{ activePersonId: 'busy' }], // Zed is filled → excluded
      }),
    );
    const res = await svc.suggestForPosition('pos1', 2);
    expect(res.positionId).toBe('pos1');
    expect(res.requiredSkills).toEqual(['React', 'Node']);
    // Zed excluded; top-2 by score: Ada (0.88) then Cy (0.6·0.8=0.48+0.3+0.1=0.88 too) — tie broken by name → Ada, Cy
    expect(res.candidates).toHaveLength(2);
    expect(res.candidates.map((c) => c.personId)).toEqual(['a', 'c']);
    expect(res.candidates.every((c) => c.personId !== 'busy')).toBe(true);
    expect(res.candidates[0]!.availabilityHours14d).toBe(80);
  });

  it('returns empty candidates when there are no people', async () => {
    const svc = new SuggestFillsService(buildStub({ position, people: [] }));
    const res = await svc.suggestForPosition('pos1');
    expect(res.candidates).toEqual([]);
  });

  it('PR-16: derives availabilityHours14d from Σ active allocation (not a hardcoded 80)', async () => {
    const svc = new SuggestFillsService(
      buildStub({
        position,
        people: [
          { id: 'free', displayName: 'Free', role: 'Engineer', grade: 'L5', personSkills: [skill('React', 5), skill('Node', 5)] },
          { id: 'half', displayName: 'Half', role: 'Engineer', grade: 'L5', personSkills: [skill('React', 5), skill('Node', 5)] },
        ],
        activeFills: [], // neither is fully busy → both are bench candidates
        allocationByPerson: { half: 50 }, // 50% allocated → 40h free
      }),
    );
    const res = await svc.suggestForPosition('pos1', 5);
    const free = res.candidates.find((c) => c.personId === 'free')!;
    const half = res.candidates.find((c) => c.personId === 'half')!;
    expect(free.availabilityHours14d).toBe(80);
    expect(half.availabilityHours14d).toBe(40);
  });
});

interface FakePersonRow {
  id: string;
  role: string | null;
  personSkills: FakePersonSkill[];
}
interface FakeOpenPosition {
  id: string;
  projectId: string;
  role: string;
  skills: string[];
  project: { name: string };
}

function buildPersonStub(seed: {
  person?: FakePersonRow | null;
  openPositions?: FakeOpenPosition[];
}): PrismaService {
  const person = {
    findUnique: async (_q: unknown): Promise<FakePersonRow | null> => seed.person ?? null,
  };
  const projectPosition = {
    findMany: async (_q: unknown): Promise<FakeOpenPosition[]> => seed.openPositions ?? [],
  };
  return { person, projectPosition } as unknown as PrismaService;
}

describe('SuggestFillsService.suggestForPerson', () => {
  const ada: FakePersonRow = {
    id: 'ada',
    role: 'Engineer',
    personSkills: [skill('React', 5), skill('Node', 3)],
  };

  it('throws NotFound when the person does not exist', async () => {
    const svc = new SuggestFillsService(buildPersonStub({ person: null }));
    await expect(svc.suggestForPerson('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('ranks open positions by score and respects the limit', async () => {
    const svc = new SuggestFillsService(
      buildPersonStub({
        person: ada,
        openPositions: [
          // perfect role + 2/2 skills → highest score
          { id: 'p-perfect', projectId: 'proj-a', role: 'Engineer', skills: ['React', 'Node'], project: { name: 'Apollo' } },
          // role match + 1/2 skills → lower
          { id: 'p-partial', projectId: 'proj-b', role: 'Engineer', skills: ['React', 'Go'], project: { name: 'Atlas' } },
          // role mismatch → much lower
          { id: 'p-wrongrole', projectId: 'proj-c', role: 'PM', skills: ['React'], project: { name: 'Orion' } },
        ],
      }),
    );
    const res = await svc.suggestForPerson('ada', 2);
    expect(res.personId).toBe('ada');
    expect(res.candidates).toHaveLength(2);
    expect(res.candidates[0]!.positionId).toBe('p-perfect');
    expect(res.candidates[0]!.projectName).toBe('Apollo');
    expect(res.candidates[1]!.positionId).toBe('p-partial');
    expect(res.candidates[0]!.matchScore).toBeGreaterThan(res.candidates[1]!.matchScore);
  });

  it('returns empty candidates when no open positions exist', async () => {
    const svc = new SuggestFillsService(buildPersonStub({ person: ada, openPositions: [] }));
    const res = await svc.suggestForPerson('ada');
    expect(res.candidates).toEqual([]);
  });

  it('resolves a publicId via { publicId } and a uuid via { id } (no UUID-column crash)', async () => {
    // Regression: suggestForPerson 500'd on v2 when given a `usr_…` publicId
    // because it queried `where: { id: <publicId> }` against a UUID column.
    const calls: Array<{ id?: string; publicId?: string }> = [];
    const prisma = {
      person: {
        findUnique: async (q: { where: { id?: string; publicId?: string } }) => {
          calls.push(q.where);
          return { id: 'bbbb0001-0000-0000-0000-000000000003', role: 'Engineer', personSkills: [] };
        },
      },
      projectPosition: { findMany: async () => [] },
    } as unknown as PrismaService;
    const svc = new SuggestFillsService(prisma);
    await svc.suggestForPerson('usr_a444cfe3ab85');
    await svc.suggestForPerson('bbbb0001-0000-0000-0000-000000000003');
    expect(calls[0]).toEqual({ publicId: 'usr_a444cfe3ab85' });
    expect(calls[1]).toEqual({ id: 'bbbb0001-0000-0000-0000-000000000003' });
  });

  it('uses identical scoring to suggestForPosition for the same (person, position) pair', async () => {
    // Same skills + roles on both sides; score must match exactly.
    const personId = 'ada';
    const positionId = 'pos-same';
    const sharedSkills = ['React', 'Node'];

    const fromPositionSide = await new SuggestFillsService(
      buildStub({
        position: { id: positionId, role: 'Engineer', skills: sharedSkills },
        people: [{ id: personId, displayName: 'Ada', role: 'Engineer', grade: 'L5', personSkills: ada.personSkills }],
        activeFills: [],
      }),
    ).suggestForPosition(positionId);

    const fromPersonSide = await new SuggestFillsService(
      buildPersonStub({
        person: ada,
        openPositions: [
          { id: positionId, projectId: 'p1', role: 'Engineer', skills: sharedSkills, project: { name: 'Apollo' } },
        ],
      }),
    ).suggestForPerson(personId);

    expect(fromPositionSide.candidates[0]!.matchScore).toBe(fromPersonSide.candidates[0]!.matchScore);
  });
});
