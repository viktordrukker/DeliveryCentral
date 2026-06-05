import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PersonSkillDto } from './contracts/skills.dto';

/**
 * LEAN-P4d-4 — Employee self-endorsement.
 *
 * Bypasses HR review for the original-write case so an employee can add
 * skills to their profile directly from the /me workspace. The resulting
 * `PersonSkill` row is flagged `selfEndorsed=true`; HR can still review
 * the unverified pool via the existing dashboards (no gate is added on
 * the manager-side flow).
 *
 * Upsert semantics on (personId, skillId):
 *   - If no row exists, insert with `selfEndorsed=true`.
 *   - If a row already exists, the service treats the request as a
 *     proficiency update and leaves `selfEndorsed` at its current
 *     value. We do NOT flip an existing manager-recorded row to
 *     self-endorsed — that would silently demote verified data.
 */
@Injectable()
export class SelfEndorseSkillService {
  public constructor(private readonly prisma: PrismaService) {}

  public async endorse(
    personId: string,
    skillIdOrPublicId: string,
    proficiency: number,
  ): Promise<PersonSkillDto> {
    const skill = await this.resolveSkill(skillIdOrPublicId);

    const existing = await this.prisma.personSkill.findUnique({
      where: { personId_skillId: { personId, skillId: skill.id } },
    });

    const row = existing
      ? await this.prisma.personSkill.update({
          where: { personId_skillId: { personId, skillId: skill.id } },
          data: { proficiency },
          include: { skill: true },
        })
      : await this.prisma.personSkill.create({
          data: {
            personId,
            skillId: skill.id,
            proficiency,
            certified: false,
            selfEndorsed: true,
          },
          include: { skill: true },
        });

    return {
      id: row.id,
      personId: row.personId,
      skillId: row.skill.publicId ?? row.skillId,
      skillName: row.skill.name,
      skillCategory: row.skill.category ?? null,
      proficiency: row.proficiency,
      certified: row.certified,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async resolveSkill(idOrPublicId: string) {
    const skill = /^skl_[A-Za-z0-9]{10,}$/.test(idOrPublicId)
      ? await this.prisma.skill.findUnique({ where: { publicId: idOrPublicId } })
      : await this.prisma.skill.findUnique({ where: { id: idOrPublicId } });
    if (!skill) throw new NotFoundException(`Skill ${idOrPublicId} not found`);
    return skill;
  }
}
