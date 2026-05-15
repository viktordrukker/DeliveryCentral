import { Injectable, Optional } from '@nestjs/common';

import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
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

/**
 * F-11.3 / D-122 + D-123 — scoring weights resolved per-call from
 * PlatformSettings. Defaults match the pre-D-122 hardcoded constants so
 * tenants who do not override get identical behaviour.
 */
interface SuggestionWeights {
  importance: { niceToHave: number; preferred: number; required: number };
  proficiency: { exact: number; oneOff: number; twoOff: number; threeOrMoreOff: number };
  recentRoleWindowMonths: number;
  recencyModifier: number;
}

const DEFAULT_WEIGHTS: SuggestionWeights = {
  importance: { niceToHave: 0.5, preferred: 1.0, required: 2.0 },
  proficiency: { exact: 1.0, oneOff: 0.6, twoOff: 0.3, threeOrMoreOff: 0 },
  recentRoleWindowMonths: 12,
  recencyModifier: 1.2,
};

function importanceWeightFor(weights: SuggestionWeights, importance: SkillRequirement['importance']): number {
  if (importance === 'NICE_TO_HAVE') return weights.importance.niceToHave;
  if (importance === 'REQUIRED') return weights.importance.required;
  return weights.importance.preferred;
}

// Proficiency is an int 1-5 (or similar). Normalize to 0-1 scale.
function proficiencyMatchScore(weights: SuggestionWeights, personLevel: number, requiredLevel = 3): number {
  if (personLevel >= requiredLevel) return weights.proficiency.exact;
  const diff = requiredLevel - personLevel;
  if (diff === 1) return weights.proficiency.oneOff;
  if (diff === 2) return weights.proficiency.twoOff;
  return weights.proficiency.threeOrMoreOff;
}

@Injectable()
export class StaffingSuggestionsService {
  public constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly platformSettings?: PlatformSettingsService,
  ) {}

  private async loadWeights(): Promise<SuggestionWeights> {
    if (!this.platformSettings) return DEFAULT_WEIGHTS;
    const num = async (key: string, fallback: number): Promise<number> => {
      const raw = await this.platformSettings!.getRawValue(key);
      if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
      return fallback;
    };
    return {
      importance: {
        niceToHave: await num('staffing.suggestion.skillWeights.niceToHave', DEFAULT_WEIGHTS.importance.niceToHave),
        preferred: await num('staffing.suggestion.skillWeights.preferred', DEFAULT_WEIGHTS.importance.preferred),
        required: await num('staffing.suggestion.skillWeights.required', DEFAULT_WEIGHTS.importance.required),
      },
      proficiency: {
        exact: await num('staffing.suggestion.proficiencyScore.exact', DEFAULT_WEIGHTS.proficiency.exact),
        oneOff: await num('staffing.suggestion.proficiencyScore.oneOff', DEFAULT_WEIGHTS.proficiency.oneOff),
        twoOff: await num('staffing.suggestion.proficiencyScore.twoOff', DEFAULT_WEIGHTS.proficiency.twoOff),
        threeOrMoreOff: await num(
          'staffing.suggestion.proficiencyScore.threeOrMoreOff',
          DEFAULT_WEIGHTS.proficiency.threeOrMoreOff,
        ),
      },
      recentRoleWindowMonths: await num(
        'staffing.suggestion.recentRoleWindowMonths',
        DEFAULT_WEIGHTS.recentRoleWindowMonths,
      ),
      recencyModifier: await num('staffing.suggestion.recencyModifier', DEFAULT_WEIGHTS.recencyModifier),
    };
  }

  public async suggest(params: {
    allocationPercent: number;
    endDate: string;
    skills: SkillRequirement[];
    startDate: string;
  }): Promise<SuggestionCandidate[]> {
    if (params.skills.length === 0) {
      return [];
    }

    const weights = await this.loadWeights();
    const skillNames = params.skills.map((s) => s.skillName.toLowerCase());

    // Find skills by name
    const matchingSkills = await this.prisma.skill.findMany({
      where: { name: { in: skillNames, mode: 'insensitive' } },
      select: { id: true, name: true },
    });

    if (matchingSkills.length === 0) return [];

    const skillIds = matchingSkills.map((s) => s.id);

    // Find person skills matching any required skill
    const personSkills = await this.prisma.personSkill.findMany({
      where: { skillId: { in: skillIds } },
      select: { personId: true, skillId: true, proficiency: true },
    });

    // Collect unique person IDs and intersect with Person rows that actually
    // exist. The person_skills.personId column is not FK-constrained (it's a
    // plain text column), so orphan rows from older seeds can leak through.
    // Without this filter the matcher would surface a personId for which no
    // Person exists, which (a) renders as a raw UUID in the picker and (b)
    // would later trip the FK on StaffingRequestProposalCandidate when the
    // RM submits the slate.
    const candidatePersonIds = [...new Set(personSkills.map((ps) => ps.personId))];
    if (candidatePersonIds.length === 0) return [];
    const existingPeople = await this.prisma.person.findMany({
      where: { id: { in: candidatePersonIds } },
      select: { id: true, displayName: true },
    });
    const personIds = existingPeople.map((p) => p.id);
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
    const recentRoleCutoff = new Date();
    recentRoleCutoff.setMonth(recentRoleCutoff.getMonth() - weights.recentRoleWindowMonths);

    for (const a of assignments) {
      const current = allocationMap.get(a.personId) ?? 0;
      allocationMap.set(a.personId, current + Number(a.allocationPercent ?? 0));

      if (a.validFrom >= recentRoleCutoff) {
        if (!recentRoleMap.has(a.personId)) {
          recentRoleMap.set(a.personId, new Set());
        }
        recentRoleMap.get(a.personId)!.add((a.staffingRole ?? '').toLowerCase());
      }
    }

    const displayNameMap = new Map(existingPeople.map((p) => [p.id, p.displayName]));

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

        const importanceWeight = importanceWeightFor(weights, requirement.importance);
        let proficiencyScore = 0;
        let recencyMod = 1.0;

        if (personSkillForReq) {
          proficiencyScore = proficiencyMatchScore(weights, personSkillForReq.proficiency);

          // Recency modifier: does the person's recent roles mention this skill?
          const recentRoles = recentRoleMap.get(personId) ?? new Set();
          const skillKeyword = skillNameLower.split(' ')[0];
          if ([...recentRoles].some((role) => role.includes(skillKeyword))) {
            recencyMod = weights.recencyModifier;
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
