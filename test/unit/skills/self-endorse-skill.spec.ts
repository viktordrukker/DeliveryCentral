import { NotFoundException } from '@nestjs/common';

import { SelfEndorseSkillService } from '@src/modules/skills/application/self-endorse-skill.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P4d-4 — Employee self-endorsement service.
 *
 * Covers:
 *   1. New (personId, skillId) row inserts with selfEndorsed=true.
 *   2. Existing row triggers proficiency-only update; selfEndorsed
 *      is NOT flipped from a prior FALSE (no silent demotion of
 *      manager-recorded data).
 *   3. Unknown skill id rejects with NotFoundException.
 *   4. PublicId (`skl_…`) acceptance.
 */
describe('SelfEndorseSkillService', () => {
  interface CapturedCreate {
    data: Record<string, unknown>;
  }
  interface CapturedUpdate {
    where: unknown;
    data: Record<string, unknown>;
  }

  function buildStub(opts: {
    skill?: { id: string; publicId: string | null; name: string; category: string | null } | null;
    existing?: { id: string; personId: string; skillId: string; proficiency: number; certified: boolean; selfEndorsed: boolean } | null;
    onCreate?: (args: CapturedCreate) => void;
    onUpdate?: (args: CapturedUpdate) => void;
    skillByPublicId?: { id: string; publicId: string | null; name: string; category: string | null } | null;
  }): PrismaService {
    return {
      skill: {
        findUnique: async (args: { where: { id?: string; publicId?: string } }) => {
          if (args.where.publicId) return opts.skillByPublicId ?? null;
          return opts.skill ?? null;
        },
      },
      personSkill: {
        findUnique: async () => opts.existing ?? null,
        create: async (args: { data: Record<string, unknown>; include?: unknown }) => {
          opts.onCreate?.({ data: args.data });
          return {
            id: 'ps-new',
            personId: args.data.personId,
            skillId: args.data.skillId,
            proficiency: args.data.proficiency,
            certified: args.data.certified ?? false,
            selfEndorsed: args.data.selfEndorsed ?? false,
            updatedAt: new Date('2026-06-05T00:00:00Z'),
            skill: {
              id: args.data.skillId,
              publicId: opts.skill?.publicId ?? null,
              name: opts.skill?.name ?? 'Test',
              category: opts.skill?.category ?? null,
            },
          };
        },
        update: async (args: { where: unknown; data: Record<string, unknown>; include?: unknown }) => {
          opts.onUpdate?.({ where: args.where, data: args.data });
          const existing = opts.existing!;
          return {
            id: existing.id,
            personId: existing.personId,
            skillId: existing.skillId,
            proficiency: (args.data.proficiency as number) ?? existing.proficiency,
            certified: existing.certified,
            selfEndorsed: existing.selfEndorsed,
            updatedAt: new Date('2026-06-05T01:00:00Z'),
            skill: {
              id: existing.skillId,
              publicId: opts.skill?.publicId ?? null,
              name: opts.skill?.name ?? 'Test',
              category: opts.skill?.category ?? null,
            },
          };
        },
      },
    } as unknown as PrismaService;
  }

  it('inserts new row with selfEndorsed=true when no prior entry exists', async () => {
    let createCapture: CapturedCreate = { data: {} };
    const stub = buildStub({
      skill: { id: 'sk-1', publicId: 'skl_test', name: 'TypeScript', category: 'Engineering' },
      existing: null,
      onCreate: (c) => (createCapture = c),
    });
    const svc = new SelfEndorseSkillService(stub);

    const result = await svc.endorse('person-1', 'sk-1', 3);

    expect(createCapture.data.selfEndorsed).toBe(true);
    expect(createCapture.data.proficiency).toBe(3);
    expect(createCapture.data.certified).toBe(false);
    expect(createCapture.data.personId).toBe('person-1');
    expect(result.skillName).toBe('TypeScript');
    expect(result.proficiency).toBe(3);
  });

  it('updates only proficiency on existing row; does not flip selfEndorsed', async () => {
    let updateCapture: CapturedUpdate = { where: {}, data: {} };
    const stub = buildStub({
      skill: { id: 'sk-1', publicId: null, name: 'NestJS', category: null },
      existing: {
        id: 'ps-7',
        personId: 'person-1',
        skillId: 'sk-1',
        proficiency: 2,
        certified: true,
        selfEndorsed: false,
      },
      onUpdate: (u) => (updateCapture = u),
    });
    const svc = new SelfEndorseSkillService(stub);

    const result = await svc.endorse('person-1', 'sk-1', 4);

    // Only proficiency is mutated. selfEndorsed must NOT be set to true.
    expect(updateCapture.data.proficiency).toBe(4);
    expect(updateCapture.data).not.toHaveProperty('selfEndorsed');
    expect(result.proficiency).toBe(4);
  });

  it('throws NotFoundException when skill id is unknown', async () => {
    const stub = buildStub({ skill: null });
    const svc = new SelfEndorseSkillService(stub);

    await expect(svc.endorse('person-1', 'sk-missing', 2)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts a publicId (skl_…) and resolves via publicId lookup', async () => {
    let createCapture: CapturedCreate = { data: {} };
    const stub = buildStub({
      skillByPublicId: { id: 'sk-1', publicId: 'skl_abc1234567', name: 'Python', category: 'Engineering' },
      skill: { id: 'sk-1', publicId: 'skl_abc1234567', name: 'Python', category: 'Engineering' },
      existing: null,
      onCreate: (c) => (createCapture = c),
    });
    const svc = new SelfEndorseSkillService(stub);

    const result = await svc.endorse('person-1', 'skl_abc1234567', 2);

    expect(createCapture.data.skillId).toBe('sk-1');
    expect(createCapture.data.selfEndorsed).toBe(true);
    expect(result.skillName).toBe('Python');
  });
});
