import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface TeamBuilderRoleRequest {
  role: string;
  skills: string[];
  allocationPercent: number;
  headcount: number;
}

export interface TeamBuilderRequestDto {
  projectId: string;
  roles: TeamBuilderRoleRequest[];
}

export interface TeamBuilderCandidate {
  personId: string;
  displayName: string;
  score: number;
  currentAllocationPercent: number;
  availableCapacityPercent: number;
  matchedSkills: string[];
}

export interface TeamBuilderRoleSuggestion {
  role: string;
  candidates: TeamBuilderCandidate[];
}

export interface TeamBuilderResponseDto {
  suggestions: TeamBuilderRoleSuggestion[];
}

@Injectable()
export class TeamBuilderService {
  public constructor(private readonly prisma: PrismaService) {}

  public async buildTeam(request: TeamBuilderRequestDto): Promise<TeamBuilderResponseDto> {
    // Get all active people with their skills
    const people = await this.prisma.person.findMany({
      where: { employmentStatus: 'ACTIVE' },
      select: { id: true, displayName: true },
    });

    const personSkills = await this.prisma.personSkill.findMany({
      select: { personId: true, skill: { select: { name: true } }, proficiency: true },
    });

    const skillsByPerson = new Map<string, Map<string, number>>();
    for (const ps of personSkills) {
      let personMap = skillsByPerson.get(ps.personId);
      if (!personMap) { personMap = new Map(); skillsByPerson.set(ps.personId, personMap); }
      personMap.set(ps.skill.name, ps.proficiency);
    }

    // Get current allocations
    const assignments = await this.prisma.projectAssignment.findMany({
      where: { status: { in: ['APPROVED', 'ACTIVE'] } },
      select: { personId: true, allocationPercent: true },
    });

    const allocByPerson = new Map<string, number>();
    for (const a of assignments) {
      allocByPerson.set(a.personId, (allocByPerson.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
    }

    // Track who has been allocated across roles to avoid double-booking
    const allocatedInTeam = new Map<string, number>();

    const suggestions: TeamBuilderRoleSuggestion[] = [];

    for (const roleReq of request.roles) {
      const candidates: TeamBuilderCandidate[] = [];

      for (const person of people) {
        const currentAlloc = allocByPerson.get(person.id) ?? 0;
        const teamAlloc = allocatedInTeam.get(person.id) ?? 0;
        const effectiveAlloc = currentAlloc + teamAlloc;
        const available = 100 - effectiveAlloc;

        if (available < roleReq.allocationPercent) continue;

        // Score based on skill match
        const personSkillMap = skillsByPerson.get(person.id) ?? new Map<string, number>();
        const matchedSkills: string[] = [];
        let totalScore = 0;

        for (const skill of roleReq.skills) {
          const proficiency = personSkillMap.get(skill);
          if (proficiency !== undefined) {
            matchedSkills.push(skill);
            totalScore += proficiency / 5; // normalize 1-5 → 0.2-1.0
          }
        }

        // Availability bonus
        const availabilityFactor = available / 100;
        const score = roleReq.skills.length > 0
          ? (totalScore / roleReq.skills.length) * availabilityFactor
          : availabilityFactor;

        if (score > 0 || roleReq.skills.length === 0) {
          candidates.push({
            personId: person.id,
            displayName: person.displayName,
            score: Math.round(score * 100) / 100,
            currentAllocationPercent: effectiveAlloc,
            availableCapacityPercent: available,
            matchedSkills,
          });
        }
      }

      // Sort by score descending, take top N for headcount
      candidates.sort((a, b) => b.score - a.score);

      // Mark top candidates as "allocated" for cross-role constraint
      const topCandidates = candidates.slice(0, roleReq.headcount * 3); // show 3x options
      for (let i = 0; i < Math.min(roleReq.headcount, topCandidates.length); i++) {
        const c = topCandidates[i];
        allocatedInTeam.set(c.personId, (allocatedInTeam.get(c.personId) ?? 0) + roleReq.allocationPercent);
      }

      suggestions.push({ role: roleReq.role, candidates: topCandidates });
    }

    return { suggestions };
  }
}
