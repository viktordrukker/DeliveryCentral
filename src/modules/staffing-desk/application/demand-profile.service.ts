import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface SkillGapEntry {
  skill: string;
  headcountNeeded: number;
  availableSupply: number;
  gap: number;
}

export interface PriorityBreakdownEntry {
  priority: string;
  headcount: number;
}

export interface DemandRequestDto {
  requestId: string;
  projectName: string;
  role: string;
  allocationPercent: number;
  priority: string;
  skills: string[];
  headcountRequired: number;
  headcountFulfilled: number;
  startDate: string;
  endDate: string;
  daysOpen: number;
}

export interface DemandProfileResponseDto {
  totalRequests: number;
  totalHeadcountNeeded: number;
  headcountOpen: number;
  skillDemand: SkillGapEntry[];
  priorityBreakdown: PriorityBreakdownEntry[];
  requests: DemandRequestDto[];
}

@Injectable()
export class DemandProfileService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getProfile(params: { projectId?: string }): Promise<DemandProfileResponseDto> {
    const where: Record<string, unknown> = { status: { in: ['OPEN', 'IN_REVIEW'] } };
    if (params.projectId) where.projectId = params.projectId;

    const openRequests = await this.prisma.staffingRequest.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    // Resolve project names
    const projectIds = [...new Set(openRequests.map((r) => r.projectId))];
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true },
    });
    const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));

    // Gather all demanded skills and count available supply
    const allSkills = new Set<string>();
    const skillDemandMap = new Map<string, number>();
    const priorityMap = new Map<string, number>();
    let totalHcNeeded = 0;
    let hcOpen = 0;
    const now = Date.now();

    const requestDtos: DemandRequestDto[] = [];

    for (const r of openRequests) {
      const openHc = r.headcountRequired - r.headcountFulfilled;
      totalHcNeeded += r.headcountRequired;
      hcOpen += openHc;

      const prio = r.priority ?? 'MEDIUM';
      priorityMap.set(prio, (priorityMap.get(prio) ?? 0) + openHc);

      for (const skill of r.skills) {
        allSkills.add(skill);
        skillDemandMap.set(skill, (skillDemandMap.get(skill) ?? 0) + openHc);
      }

      requestDtos.push({
        requestId: r.id,
        projectName: projectNameMap.get(r.projectId) ?? r.projectId,
        role: r.role,
        allocationPercent: (r.allocationPercent as unknown as { toNumber(): number }).toNumber(),
        priority: prio,
        skills: r.skills,
        headcountRequired: r.headcountRequired,
        headcountFulfilled: r.headcountFulfilled,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        daysOpen: Math.max(0, Math.round((now - r.createdAt.getTime()) / 86400000)),
      });
    }

    // Count available supply per skill
    const skillSupply = new Map<string, number>();
    if (allSkills.size > 0) {
      const skills = await this.prisma.skill.findMany({
        where: { name: { in: [...allSkills] } },
        select: { id: true, name: true },
      });
      const skillIdToName = new Map(skills.map((s) => [s.id, s.name]));

      const personSkills = await this.prisma.personSkill.findMany({
        where: { skillId: { in: skills.map((s) => s.id) } },
        select: { personId: true, skillId: true },
      });

      // Get active allocations
      const personIds = [...new Set(personSkills.map((ps) => ps.personId))];
      const assignments = await this.prisma.projectAssignment.findMany({
        where: { personId: { in: personIds }, status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] } },
        select: { personId: true, allocationPercent: true },
      });
      const allocByPerson = new Map<string, number>();
      for (const a of assignments) {
        allocByPerson.set(a.personId, (allocByPerson.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
      }

      // Count people available per skill
      for (const ps of personSkills) {
        const alloc = allocByPerson.get(ps.personId) ?? 0;
        if (alloc < 100) {
          const skillName = skillIdToName.get(ps.skillId);
          if (skillName) {
            skillSupply.set(skillName, (skillSupply.get(skillName) ?? 0) + 1);
          }
        }
      }
    }

    const skillDemand: SkillGapEntry[] = [...skillDemandMap.entries()]
      .map(([skill, needed]) => {
        const available = skillSupply.get(skill) ?? 0;
        return { skill, headcountNeeded: needed, availableSupply: available, gap: needed - available };
      })
      .sort((a, b) => b.gap - a.gap);

    const priorityBreakdown: PriorityBreakdownEntry[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']
      .filter((p) => priorityMap.has(p))
      .map((p) => ({ priority: p, headcount: priorityMap.get(p)! }));

    return {
      totalRequests: openRequests.length,
      totalHeadcountNeeded: totalHcNeeded,
      headcountOpen: hcOpen,
      skillDemand,
      priorityBreakdown,
      requests: requestDtos,
    };
  }
}
