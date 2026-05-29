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
}): PrismaService {
  const projectPosition = {
    findUnique: async (_q: unknown) => seed.position ?? null,
    findMany: async (_q: unknown) => seed.activeFills ?? [],
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
});
