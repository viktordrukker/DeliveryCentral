import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import {
  CreateSkillDto,
  PersonSkillDto,
  SkillDto,
  SkillMatchCandidateDto,
  UpsertPersonSkillItemDto,
} from './contracts/skills.dto';

@Injectable()
export class SkillsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async listSkills(): Promise<SkillDto[]> {
    const skills = await this.prisma.skill.findMany({ orderBy: { name: 'asc' } });
    return skills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category ?? null,
      createdAt: s.createdAt.toISOString(),
    }));
  }

  public async createSkill(dto: CreateSkillDto): Promise<SkillDto> {
    const skill = await this.prisma.skill.create({
      data: { name: dto.name, category: dto.category ?? null },
    });
    return {
      id: skill.id,
      name: skill.name,
      category: skill.category ?? null,
      createdAt: skill.createdAt.toISOString(),
    };
  }

  public async deleteSkill(id: string): Promise<void> {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException(`Skill ${id} not found`);
    await this.prisma.personSkill.deleteMany({ where: { skillId: id } });
    await this.prisma.skill.delete({ where: { id } });
  }

  public async getPersonSkills(personId: string): Promise<PersonSkillDto[]> {
    const rows = await this.prisma.personSkill.findMany({
      where: { personId },
      include: { skill: true },
      orderBy: { skill: { name: 'asc' } },
    });
    return rows.map((r) => ({
      id: r.id,
      personId: r.personId,
      skillId: r.skillId,
      skillName: r.skill.name,
      skillCategory: r.skill.category ?? null,
      proficiency: r.proficiency,
      certified: r.certified,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  public async upsertPersonSkills(
    personId: string,
    items: UpsertPersonSkillItemDto[],
  ): Promise<PersonSkillDto[]> {
    await this.prisma.personSkill.deleteMany({ where: { personId } });

    if (items.length > 0) {
      await this.prisma.personSkill.createMany({
        data: items.map((item) => ({
          personId,
          skillId: item.skillId,
          proficiency: item.proficiency,
          certified: item.certified,
        })),
      });
    }

    return this.getPersonSkills(personId);
  }

  public async skillMatch(
    skillIds: string[],
    projectId?: string,
  ): Promise<SkillMatchCandidateDto[]> {
    if (skillIds.length === 0) return [];

    // Find people who have ALL the specified skills
    const personSkills = await this.prisma.personSkill.findMany({
      where: { skillId: { in: skillIds } },
      include: { skill: true },
    });

    // Group by personId
    const byPerson = new Map<string, { skillIds: Set<string>; skillNames: string[] }>();
    for (const ps of personSkills) {
      if (!byPerson.has(ps.personId)) {
        byPerson.set(ps.personId, { skillIds: new Set(), skillNames: [] });
      }
      const entry = byPerson.get(ps.personId)!;
      entry.skillIds.add(ps.skillId);
      entry.skillNames.push(ps.skill.name);
    }

    // Filter to people who have ALL requested skills
    const matchingPersonIds: string[] = [];
    for (const [personId, entry] of byPerson.entries()) {
      if (skillIds.every((sid) => entry.skillIds.has(sid))) {
        matchingPersonIds.push(personId);
      }
    }

    if (matchingPersonIds.length === 0) return [];

    // Get active assignments for these people to calculate allocation
    const today = new Date();
    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId: { in: matchingPersonIds },
        status: { in: ['ACTIVE', 'APPROVED'] },
        validFrom: { lte: today },
        OR: [{ validTo: null }, { validTo: { gte: today } }],
        ...(projectId ? { NOT: { projectId } } : {}),
      },
      include: { person: { select: { displayName: true } } },
    });

    // Sum allocation per person
    const allocationMap = new Map<string, number>();
    const displayNameMap = new Map<string, string>();
    for (const a of activeAssignments) {
      const current = allocationMap.get(a.personId) ?? 0;
      allocationMap.set(a.personId, current + Number(a.allocationPercent ?? 0));
      displayNameMap.set(a.personId, a.person.displayName);
    }

    // Also get display names for people with no assignments
    const people = await this.prisma.person.findMany({
      where: { id: { in: matchingPersonIds } },
      select: { id: true, displayName: true },
    });
    for (const p of people) {
      if (!displayNameMap.has(p.id)) {
        displayNameMap.set(p.id, p.displayName);
      }
    }

    // Filter to those with < 100% allocation
    const results: SkillMatchCandidateDto[] = [];
    for (const personId of matchingPersonIds) {
      const currentAllocation = allocationMap.get(personId) ?? 0;
      if (currentAllocation < 100) {
        const entry = byPerson.get(personId)!;
        results.push({
          personId,
          displayName: displayNameMap.get(personId) ?? personId,
          matchedSkills: entry.skillNames,
          currentAllocation,
        });
      }
    }

    return results.sort((a, b) => a.currentAllocation - b.currentAllocation);
  }
}
