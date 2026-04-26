import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface SkillRequirement {
  importance: 'NICE_TO_HAVE' | 'PREFERRED' | 'REQUIRED';
  skillName: string;
}

export interface SkillBreakdown {
  availabilityModifier: number;
  importanceWeight: number;
  proficiencyMatch: number;
  recencyModifier: number;
  score: number;
  skillName: string;
}

export interface SuggestionCandidate {
  availableCapacityPercent: number;
  currentAllocationPercent: number;
  displayName: string;
  personId: string;
  score: number;
  skillBreakdown: SkillBreakdown[];
}

const IMPORTANCE_WEIGHTS: Record<string, number> = {
  NICE_TO_HAVE: 0.5,
  PREFERRED: 1.0,
  REQUIRED: 2.0,
};

// Proficiency is an int 1-5 (or similar). Normalize to 0-1 scale.
function proficiencyMatchScore(personLevel: number, requiredLevel = 3): number {
  if (personLevel >= requiredLevel) return 1.0;
  const diff = requiredLevel - personLevel;
  if (diff === 1) return 0.6;
  if (diff === 2) return 0.3;
  return 0;
}

@Injectable()
export class StaffingSuggestionsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async suggest(params: {
    allocationPercent: number;
    endDate: string;
    skills: SkillRequirement[];
    startDate: string;
  }): Promise<SuggestionCandidate[]> {
    if (params.skills.length === 0) {
      return [];
    }

    const skillNames = params.skills.map((s) => s.skillName.toLowerCase());

    // Find skills by name
    const matchingSkills = await this.prisma.skill.findMany({
      where: { name: { in: skillNames, mode: 'insensitive' } },
      select: { id: true, name: true },
    });

    if (matchingSkills.length === 0) return [];

    const skillIdToName = new Map(matchingSkills.map((s) => [s.id, s.name.toLowerCase()]));
    const skillIds = matchingSkills.map((s) => s.id);

    // Find person skills matching any required skill
    const personSkills = await this.prisma.personSkill.findMany({
      where: { skillId: { in: skillIds } },
      select: { personId: true, skillId: true, proficiency: true },
    });

    // Collect unique person IDs
    const personIds = [...new Set(personSkills.map((ps) => ps.personId))];
    if (personIds.length === 0) return [];

    // Get current allocations for these people in the requested period
    const from = new Date(params.startDate);
    const to = new Date(params.endDate);

    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId: { in: personIds },
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: to },
        OR: [{ validTo: null }, { validTo: { gte: from } }],
      },
      select: { personId: true, allocationPercent: true, staffingRole: true, validFrom: true },
    });

    const allocationMap = new Map<string, number>();
    const recentRoleMap = new Map<string, Set<string>>();
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    for (const a of assignments) {
      const current = allocationMap.get(a.personId) ?? 0;
      allocationMap.set(a.personId, current + Number(a.allocationPercent ?? 0));

      if (a.validFrom >= twelveMonthsAgo) {
        if (!recentRoleMap.has(a.personId)) {
          recentRoleMap.set(a.personId, new Set());
        }
        recentRoleMap.get(a.personId)!.add((a.staffingRole ?? '').toLowerCase());
      }
    }

    // Get display names
    const people = await this.prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, displayName: true },
    });
    const displayNameMap = new Map(people.map((p) => [p.id, p.displayName]));

    // Group person skills by person
    const skillsByPerson = new Map<string, { skillId: string; proficiency: number }[]>();
    for (const ps of personSkills) {
      if (!skillsByPerson.has(ps.personId)) {
        skillsByPerson.set(ps.personId, []);
      }
      skillsByPerson.get(ps.personId)!.push({ skillId: ps.skillId, proficiency: ps.proficiency });
    }

    // Compute scores
    const candidates: SuggestionCandidate[] = [];

    for (const personId of personIds) {
      const personSkillList = skillsByPerson.get(personId) ?? [];
      const currentAllocation = allocationMap.get(personId) ?? 0;
      const availabilityModifier = Math.max(0, Math.min(1, 1.0 - currentAllocation / 100));

      const breakdown: SkillBreakdown[] = [];
      let totalScore = 0;

      for (const requirement of params.skills) {
        const skillNameLower = requirement.skillName.toLowerCase();
        const matchingSkillId = matchingSkills.find(
          (s) => s.name.toLowerCase() === skillNameLower,
        )?.id;
        const personSkillForReq = personSkillList.find((ps) => ps.skillId === matchingSkillId);

        const importanceWeight = IMPORTANCE_WEIGHTS[requirement.importance] ?? 1.0;
        let proficiencyScore = 0;
        let recencyMod = 1.0;

        if (personSkillForReq) {
          proficiencyScore = proficiencyMatchScore(personSkillForReq.proficiency);

          // Recency modifier: does the person's recent roles mention this skill?
          const recentRoles = recentRoleMap.get(personId) ?? new Set();
          const skillKeyword = skillNameLower.split(' ')[0];
          if ([...recentRoles].some((role) => role.includes(skillKeyword))) {
            recencyMod = 1.2;
          }
        }

        const skillScore = proficiencyScore * importanceWeight * availabilityModifier * recencyMod;
        totalScore += skillScore;

        breakdown.push({
          availabilityModifier,
          importanceWeight,
          proficiencyMatch: proficiencyScore,
          recencyModifier: recencyMod,
          score: Math.round(skillScore * 1000) / 1000,
          skillName: requirement.skillName,
        });
      }

      candidates.push({
        availableCapacityPercent: Math.round(Math.max(0, 100 - currentAllocation)),
        currentAllocationPercent: currentAllocation,
        displayName: displayNameMap.get(personId) ?? personId,
        personId,
        score: Math.round(totalScore * 1000) / 1000,
        skillBreakdown: breakdown,
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }
}
