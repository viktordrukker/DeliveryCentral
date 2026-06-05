import { NotFoundException } from '@nestjs/common';

import { SkillEndorsementService } from '@src/modules/skills/application/skill-endorsement.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * LEAN-P4c-4 — Manager-side endorsement of self-added skills.
 *
 * Covers:
 *   1. listPending() returns only `selfEndorsed=true AND endorsedByPersonId IS NULL` rows
 *      mapped to the `skill-review` source shape.
 *   2. approve() stamps `endorsedByPersonId` + `endorsedAt`, returns id, audits.
 *   3. reject() deletes the row, audits.
 *   4. approve()/reject() raise NotFoundException for unknown ids.
 */
describe('SkillEndorsementService', () => {
  interface CapturedUpdate {
    where: unknown;
    data: Record<string, unknown>;
  }
  interface CapturedDelete {
    where: unknown;
  }
  interface CapturedFindMany {
    where: unknown;
    select: unknown;
  }
  interface AuditRecordCall {
    actionType: string;
    actorId: string;
    targetEntityId?: string;
    targetEntityType?: string;
    metadata?: Record<string, unknown>;
  }

  function buildPrismaStub(opts: {
    findManyRows?: Array<{
      id: string;
      personId: string;
      skillId: string;
      proficiency: number;
      updatedAt: Date;
      skill: { id: string; name: string; publicId: string | null };
      person: { id: string; displayName: string };
    }>;
    existing?: { id: string; selfEndorsed: boolean; endorsedByPersonId: string | null; skillId: string; personId: string } | null;
    onUpdate?: (args: CapturedUpdate) => void;
    onDelete?: (args: CapturedDelete) => void;
    onFindMany?: (args: CapturedFindMany) => void;
  }): PrismaService {
    return {
      personSkill: {
        findMany: async (args: CapturedFindMany) => {
          opts.onFindMany?.(args);
          return opts.findManyRows ?? [];
        },
        findUnique: async () => opts.existing ?? null,
        update: async (args: CapturedUpdate) => {
          opts.onUpdate?.(args);
          return {
            id: (args.where as { id: string }).id,
            endorsedAt: (args.data as { endorsedAt: Date }).endorsedAt,
          };
        },
        delete: async (args: CapturedDelete) => {
          opts.onDelete?.(args);
          return { id: (args.where as { id: string }).id };
        },
      },
    } as unknown as PrismaService;
  }

  function buildAuditLogger(): { calls: AuditRecordCall[]; logger: { record: (input: AuditRecordCall) => void } } {
    const calls: AuditRecordCall[] = [];
    return {
      calls,
      logger: { record: (input: AuditRecordCall) => calls.push(input) },
    };
  }

  describe('listPending', () => {
    it('returns selfEndorsed=true AND endorsedByPersonId=null rows mapped to skill-review', async () => {
      let captured: CapturedFindMany | null = null;
      const prisma = buildPrismaStub({
        findManyRows: [
          {
            id: 'ps-1',
            personId: 'p-1',
            skillId: 'sk-1',
            proficiency: 4,
            updatedAt: new Date('2026-06-04T10:00:00Z'),
            skill: { id: 'sk-1', name: 'TypeScript', publicId: 'skl_abc1234567' },
            person: { id: 'p-1', displayName: 'Ethan Brooks' },
          },
        ],
        onFindMany: (args) => {
          captured = args;
        },
      });
      const svc = new SkillEndorsementService(prisma);

      const result = await svc.listPending();

      expect(captured).not.toBeNull();
      expect((captured as unknown as CapturedFindMany).where).toEqual({
        selfEndorsed: true,
        endorsedByPersonId: null,
      });
      expect(result).toHaveLength(1);
      const item = result[0]!;
      expect(item.source).toBe('skill-review');
      expect(item.id).toBe('ps-1');
      expect(item.title).toBe('Endorse skill: TypeScript (proficiency 4)');
      expect(item.submittedBy).toEqual({ personId: 'p-1', displayName: 'Ethan Brooks' });
      expect(item.submittedAt).toBe('2026-06-04T10:00:00.000Z');
      expect(item.href).toBe('/people/p-1/skills');
      expect(item.meta).toMatchObject({
        personId: 'p-1',
        skillId: 'skl_abc1234567',
        skillName: 'TypeScript',
        proficiency: 4,
      });
    });

    it('returns empty when no pending endorsements', async () => {
      const prisma = buildPrismaStub({ findManyRows: [] });
      const svc = new SkillEndorsementService(prisma);
      const result = await svc.listPending();
      expect(result).toEqual([]);
    });
  });

  describe('approve', () => {
    it('stamps endorsedByPersonId + endorsedAt and emits an audit record', async () => {
      let captured: CapturedUpdate | null = null;
      const prisma = buildPrismaStub({
        existing: {
          id: 'ps-1',
          selfEndorsed: true,
          endorsedByPersonId: null,
          skillId: 'sk-1',
          personId: 'p-1',
        },
        onUpdate: (args) => {
          captured = args;
        },
      });
      const audit = buildAuditLogger();
      const svc = new SkillEndorsementService(prisma, audit.logger as never);

      const result = await svc.approve('ps-1', 'hr-actor-1');

      expect(result.id).toBe('ps-1');
      expect(captured).not.toBeNull();
      const data = (captured as unknown as CapturedUpdate).data;
      expect(data.endorsedByPersonId).toBe('hr-actor-1');
      expect(data.endorsedAt).toBeInstanceOf(Date);
      expect(audit.calls).toHaveLength(1);
      expect(audit.calls[0]!.actionType).toBe('skill.endorsement.approved');
      expect(audit.calls[0]!.actorId).toBe('hr-actor-1');
      expect(audit.calls[0]!.targetEntityType).toBe('Skill');
      expect(audit.calls[0]!.targetEntityId).toBe('sk-1');
    });

    it('throws NotFoundException for unknown personSkillId', async () => {
      const prisma = buildPrismaStub({ existing: null });
      const svc = new SkillEndorsementService(prisma);
      await expect(svc.approve('missing', 'hr-actor-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('reject', () => {
    it('deletes the row and emits an audit record (with reason)', async () => {
      let captured: CapturedDelete | null = null;
      const prisma = buildPrismaStub({
        existing: {
          id: 'ps-2',
          selfEndorsed: true,
          endorsedByPersonId: null,
          skillId: 'sk-2',
          personId: 'p-2',
        },
        onDelete: (args) => {
          captured = args;
        },
      });
      const audit = buildAuditLogger();
      const svc = new SkillEndorsementService(prisma, audit.logger as never);

      const result = await svc.reject('ps-2', 'hr-actor-2', 'wrong proficiency');

      expect(result.id).toBe('ps-2');
      expect(captured).not.toBeNull();
      expect((captured as unknown as CapturedDelete).where).toEqual({ id: 'ps-2' });
      expect(audit.calls).toHaveLength(1);
      expect(audit.calls[0]!.actionType).toBe('skill.endorsement.rejected');
      expect(audit.calls[0]!.actorId).toBe('hr-actor-2');
      expect(audit.calls[0]!.metadata).toMatchObject({
        personSkillId: 'ps-2',
        reason: 'wrong proficiency',
      });
    });

    it('throws NotFoundException for unknown personSkillId', async () => {
      const prisma = buildPrismaStub({ existing: null });
      const svc = new SkillEndorsementService(prisma);
      await expect(svc.reject('missing', 'hr-actor-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
