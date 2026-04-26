import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface SupplyPersonDto {
  personId: string;
  displayName: string;
  grade: string | null;
  skills: string[];
  currentAllocationPercent: number;
  availablePercent: number;
  poolName: string | null;
}

export interface SkillDistributionEntry {
  skill: string;
  peopleCount: number;
  avgAvailability: number;
}

export interface GradeDistributionEntry {
  grade: string;
  count: number;
}

export interface SupplyProfileResponseDto {
  totalPeople: number;
  availablePeople: number;
  benchPeople: number;
  skillDistribution: SkillDistributionEntry[];
  gradeDistribution: GradeDistributionEntry[];
  people: SupplyPersonDto[];
}

@Injectable()
export class SupplyProfileService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getProfile(params: { poolId?: string; orgUnitId?: string }): Promise<SupplyProfileResponseDto> {
    // Resolve people in scope
    let personIds: string[] | null = null;

    if (params.poolId) {
      const memberships = await this.prisma.personResourcePoolMembership.findMany({
        where: { resourcePoolId: params.poolId },
        select: { personId: true },
      });
      personIds = memberships.map((m: { personId: string }) => m.personId);
    }

    if (params.orgUnitId) {
      const orgMembers = await this.prisma.personOrgMembership.findMany({
        where: { orgUnitId: params.orgUnitId },
        select: { personId: true },
      });
      const orgIds = orgMembers.map((m: { personId: string }) => m.personId);
      personIds = personIds ? personIds.filter((id) => orgIds.includes(id)) : orgIds;
    }

    // Get all active people
    const peopleWhere: Record<string, unknown> = { employmentStatus: 'ACTIVE' };
    if (personIds) peopleWhere.id = { in: personIds };

    const people = await this.prisma.person.findMany({
      where: peopleWhere,
      select: { id: true, displayName: true, grade: true },
    });

    // Get their skills
    const personSkills = await this.prisma.personSkill.findMany({
      where: { personId: { in: people.map((p) => p.id) } },
      select: { personId: true, skill: { select: { name: true } } },
    });

    const skillsByPerson = new Map<string, string[]>();
    for (const ps of personSkills) {
      const arr = skillsByPerson.get(ps.personId) ?? [];
      arr.push(ps.skill.name);
      skillsByPerson.set(ps.personId, arr);
    }

    // Get active assignments for allocation
    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId: { in: people.map((p) => p.id) },
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      },
      select: { personId: true, allocationPercent: true },
    });

    const allocByPerson = new Map<string, number>();
    for (const a of assignments) {
      allocByPerson.set(a.personId, (allocByPerson.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
    }

    // Get pool names
    const poolMemberships = await this.prisma.personResourcePoolMembership.findMany({
      where: { personId: { in: people.map((p) => p.id) } },
      select: { personId: true, resourcePool: { select: { name: true } } },
    });
    const poolByPerson = new Map<string, string>();
    for (const pm of poolMemberships) {
      if (!poolByPerson.has(pm.personId)) {
        poolByPerson.set(pm.personId, pm.resourcePool.name);
      }
    }

    // Build response
    const result: SupplyPersonDto[] = [];
    let available = 0;
    let bench = 0;
    const skillCounts = new Map<string, { count: number; totalAvail: number }>();
    const gradeCounts = new Map<string, number>();

    for (const p of people) {
      const alloc = allocByPerson.get(p.id) ?? 0;
      const avail = Math.max(0, 100 - alloc);
      const skills = skillsByPerson.get(p.id) ?? [];

      if (alloc < 100) available++;
      if (alloc === 0) bench++;

      const grade = p.grade ?? 'Unknown';
      gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);

      for (const skill of skills) {
        const entry = skillCounts.get(skill) ?? { count: 0, totalAvail: 0 };
        entry.count++;
        entry.totalAvail += avail;
        skillCounts.set(skill, entry);
      }

      result.push({
        personId: p.id,
        displayName: p.displayName,
        grade: p.grade,
        skills,
        currentAllocationPercent: alloc,
        availablePercent: avail,
        poolName: poolByPerson.get(p.id) ?? null,
      });
    }

    // Sort by available capacity descending
    result.sort((a, b) => b.availablePercent - a.availablePercent);

    const skillDistribution: SkillDistributionEntry[] = [...skillCounts.entries()]
      .map(([skill, { count, totalAvail }]) => ({
        skill,
        peopleCount: count,
        avgAvailability: count > 0 ? Math.round(totalAvail / count) : 0,
      }))
      .sort((a, b) => b.peopleCount - a.peopleCount);

    const gradeDistribution: GradeDistributionEntry[] = [...gradeCounts.entries()]
      .map(([grade, count]) => ({ grade, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPeople: people.length,
      availablePeople: available,
      benchPeople: bench,
      skillDistribution,
      gradeDistribution,
      people: result,
    };
  }
}
