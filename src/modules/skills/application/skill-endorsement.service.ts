import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ApprovalQueueItemDto } from '@src/modules/dashboard/application/contracts/approval-queue-item.dto';

interface PendingPersonSkill {
  id: string;
  personId: string;
  skillId: string;
  proficiency: number;
  updatedAt: Date;
  skill: { id: string; name: string; publicId: string | null };
  person: { id: string; displayName: string };
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * LEAN-P4c-4 — Manager-side endorsement of self-added skills.
 *
 * A `PersonSkill` row is "pending HR endorsement" when:
 *   selfEndorsed = TRUE AND endorsedByPersonId IS NULL
 *
 * HR managers (HR_GOVERNANCE_ROLES) see these in the unified /approvals
 * queue. APPROVE stamps the endorsement; REJECT deletes the row outright
 * because the data quality is presumed bad — there is no archive flag.
 *
 * Audit: both decisions emit a `skill.endorsement.*` audit log record
 * scoped to the underlying Skill aggregate (the queue item identifies
 * the row by PersonSkill.id).
 */
@Injectable()
export class SkillEndorsementService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogger?: AuditLoggerService,
  ) {}

  public async listPending(): Promise<ApprovalQueueItemDto[]> {
    const rows = (await this.prisma.personSkill.findMany({
      where: { selfEndorsed: true, endorsedByPersonId: null },
      select: {
        id: true,
        personId: true,
        skillId: true,
        proficiency: true,
        updatedAt: true,
        skill: { select: { id: true, name: true, publicId: true } },
        person: { select: { id: true, displayName: true } },
      },
      take: 100,
    })) as PendingPersonSkill[];

    return rows.map((r) => {
      const submittedAt = r.updatedAt;
      const ageHours = Math.max(0, Math.floor((Date.now() - submittedAt.getTime()) / HOUR_MS));
      return {
        id: r.id,
        source: 'skill-review',
        title: `Endorse skill: ${r.skill.name} (proficiency ${r.proficiency})`,
        submittedBy: { personId: r.person.id, displayName: r.person.displayName },
        submittedAt: submittedAt.toISOString(),
        slaDueAt: null,
        slaBreachedAt: null,
        slaStage: null,
        ageHours,
        href: `/people/${r.personId}/skills`,
        meta: {
          personId: r.personId,
          skillId: r.skill.publicId ?? r.skillId,
          skillName: r.skill.name,
          proficiency: r.proficiency,
        },
      };
    });
  }

  public async approve(
    personSkillId: string,
    actorId: string,
  ): Promise<{ id: string; endorsedAt: Date }> {
    const existing = await this.prisma.personSkill.findUnique({
      where: { id: personSkillId },
      select: { id: true, selfEndorsed: true, endorsedByPersonId: true, skillId: true, personId: true },
    });
    if (!existing) {
      throw new NotFoundException(`PersonSkill ${personSkillId} not found.`);
    }

    const now = new Date();
    const updated = await this.prisma.personSkill.update({
      where: { id: personSkillId },
      data: {
        endorsedByPersonId: actorId,
        endorsedAt: now,
      },
      select: { id: true, endorsedAt: true },
    });

    this.auditLogger?.record({
      actionType: 'skill.endorsement.approved',
      actorId,
      category: 'approval',
      changeSummary: `Skill endorsement approved for person ${existing.personId}, skill ${existing.skillId}.`,
      details: { personSkillId, personId: existing.personId, skillId: existing.skillId },
      metadata: { personSkillId, personId: existing.personId, skillId: existing.skillId },
      targetEntityId: existing.skillId,
      targetEntityType: 'Skill',
    });

    return { id: updated.id, endorsedAt: updated.endorsedAt ?? now };
  }

  public async reject(
    personSkillId: string,
    actorId: string,
    reason?: string,
  ): Promise<{ id: string }> {
    const existing = await this.prisma.personSkill.findUnique({
      where: { id: personSkillId },
      select: { id: true, skillId: true, personId: true },
    });
    if (!existing) {
      throw new NotFoundException(`PersonSkill ${personSkillId} not found.`);
    }

    await this.prisma.personSkill.delete({ where: { id: personSkillId } });

    this.auditLogger?.record({
      actionType: 'skill.endorsement.rejected',
      actorId,
      category: 'approval',
      changeSummary: `Skill endorsement rejected for person ${existing.personId}, skill ${existing.skillId}.`,
      details: {
        personSkillId,
        personId: existing.personId,
        skillId: existing.skillId,
        reason: reason ?? null,
      },
      metadata: {
        personSkillId,
        personId: existing.personId,
        skillId: existing.skillId,
        reason: reason ?? null,
      },
      targetEntityId: existing.skillId,
      targetEntityType: 'Skill',
    });

    return { id: personSkillId };
  }
}
