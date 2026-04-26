import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

export interface TimelineAssignmentBlock {
  assignmentId: string;
  personId: string;
  personName: string;
  allocationPercent: number;
  status: string;
}

export interface TimelineRequestBlock {
  requestId: string;
  role: string;
  allocationPercent: number;
  priority: string;
  headcountOpen: number;
}

export interface ProjectWeekData {
  weekStart: string;
  assignments: TimelineAssignmentBlock[];
  totalSupplyPercent: number;
  requests: TimelineRequestBlock[];
  totalDemandPercent: number;
}

export interface ProjectTimelineRow {
  projectId: string;
  projectName: string;
  weekData: ProjectWeekData[];
  totalAssignments: number;
  totalOpenRequests: number;
}

export interface BenchPerson {
  personId: string;
  personName: string;
  availablePercent: number;
  skills: string[];
}

export interface ProjectTimelineResponseDto {
  weeks: string[];
  projects: ProjectTimelineRow[];
  bench: BenchPerson[];
}

@Injectable()
export class ProjectTimelineService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getTimeline(params: {
    from: string;
    weeks: number;
    poolId?: string;
    projectId?: string;
  }): Promise<ProjectTimelineResponseDto> {
    const { from, weeks: weekCount, poolId, projectId } = params;

    // Generate week start dates
    const weekStarts: string[] = [];
    const startDate = new Date(from);
    for (let i = 0; i < weekCount; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i * 7);
      weekStarts.push(d.toISOString().slice(0, 10));
    }
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + weekCount * 7);
    const endDateStr = endDate.toISOString().slice(0, 10);

    // Resolve person scope for pool filter
    let personScope: Set<string> | null = null;
    if (poolId) {
      const memberships = await this.prisma.personResourcePoolMembership.findMany({
        where: { resourcePoolId: poolId },
        select: { personId: true },
      });
      personScope = new Set(memberships.map((m: { personId: string }) => m.personId));
    }

    // Fetch assignments overlapping the window
    const assignmentWhere: Record<string, unknown> = {
      status: { in: ['CREATED', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      validFrom: { lte: endDate },
      OR: [
        { validTo: { gte: new Date(from) } },
        { validTo: null },
      ],
    };
    if (projectId) assignmentWhere.projectId = projectId;
    if (personScope) assignmentWhere.personId = { in: [...personScope] };

    const assignments = await this.prisma.projectAssignment.findMany({
      where: assignmentWhere,
      select: {
        id: true, personId: true, projectId: true,
        allocationPercent: true, validFrom: true, validTo: true, status: true,
      },
    });

    // Fetch open staffing requests overlapping the window
    const requestWhere: Record<string, unknown> = {
      status: { in: ['OPEN', 'IN_REVIEW'] },
      startDate: { lte: endDate },
      endDate: { gte: new Date(from) },
    };
    if (projectId) requestWhere.projectId = projectId;

    const requests = await this.prisma.staffingRequest.findMany({
      where: requestWhere,
      select: {
        id: true, projectId: true, role: true,
        allocationPercent: true, priority: true,
        headcountRequired: true, headcountFulfilled: true,
        startDate: true, endDate: true,
      },
    });

    // Lookup names
    const allPersonIds = [...new Set(assignments.map((a) => a.personId))];
    const allProjectIds = [...new Set([
      ...assignments.map((a) => a.projectId),
      ...requests.map((r) => r.projectId),
    ])];

    const [people, projects] = await Promise.all([
      this.prisma.person.findMany({ where: { id: { in: allPersonIds } }, select: { id: true, displayName: true } }),
      this.prisma.project.findMany({ where: { id: { in: allProjectIds } }, select: { id: true, name: true } }),
    ]);
    const personName = new Map(people.map((p) => [p.id, p.displayName]));
    const projectName = new Map(projects.map((p) => [p.id, p.name]));

    // Build project × week grid
    const projectMap = new Map<string, ProjectTimelineRow>();

    for (const pid of allProjectIds) {
      const weekData: ProjectWeekData[] = weekStarts.map((ws) => ({
        weekStart: ws,
        assignments: [],
        totalSupplyPercent: 0,
        requests: [],
        totalDemandPercent: 0,
      }));
      projectMap.set(pid, {
        projectId: pid,
        projectName: projectName.get(pid) ?? pid,
        weekData,
        totalAssignments: 0,
        totalOpenRequests: 0,
      });
    }

    // Place assignments into week cells
    for (const a of assignments) {
      const row = projectMap.get(a.projectId);
      if (!row) continue;
      row.totalAssignments++;

      const aStart = a.validFrom.toISOString().slice(0, 10);
      const aEnd = a.validTo ? a.validTo.toISOString().slice(0, 10) : '9999-12-31';
      const alloc = a.allocationPercent?.toNumber() ?? 0;

      const block: TimelineAssignmentBlock = {
        assignmentId: a.id,
        personId: a.personId,
        personName: personName.get(a.personId) ?? a.personId,
        allocationPercent: alloc,
        status: a.status,
      };

      for (let i = 0; i < weekStarts.length; i++) {
        const ws = weekStarts[i];
        const we = this.addDays(ws, 6);
        if (aStart <= we && aEnd >= ws) {
          row.weekData[i].assignments.push(block);
          row.weekData[i].totalSupplyPercent += alloc;
        }
      }
    }

    // Place requests into week cells
    for (const r of requests) {
      const row = projectMap.get(r.projectId);
      if (!row) continue;
      row.totalOpenRequests++;

      const rStart = r.startDate.toISOString().slice(0, 10);
      const rEnd = r.endDate.toISOString().slice(0, 10);
      const openHc = r.headcountRequired - r.headcountFulfilled;

      const block: TimelineRequestBlock = {
        requestId: r.id,
        role: r.role,
        allocationPercent: (r.allocationPercent as unknown as { toNumber(): number }).toNumber(),
        priority: r.priority,
        headcountOpen: openHc,
      };

      for (let i = 0; i < weekStarts.length; i++) {
        const ws = weekStarts[i];
        const we = this.addDays(ws, 6);
        if (rStart <= we && rEnd >= ws) {
          row.weekData[i].requests.push(block);
          // DM-4-3: StaffingRequest.allocationPercent is Decimal(5,2) after 2026-04-22.
          row.weekData[i].totalDemandPercent += (r.allocationPercent as unknown as { toNumber(): number }).toNumber() * openHc;
        }
      }
    }

    // Compute bench: people with <20% total allocation
    const personAlloc = new Map<string, number>();
    for (const a of assignments) {
      if (['BOOKED','ONBOARDING','ASSIGNED','ON_HOLD'].includes(a.status)) {
        personAlloc.set(a.personId, (personAlloc.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
      }
    }

    const allActivePeople = await this.prisma.person.findMany({
      where: {
        employmentStatus: 'ACTIVE',
        ...(personScope ? { id: { in: [...personScope] } } : {}),
      },
      select: { id: true, displayName: true },
    });

    const personSkills = await this.prisma.personSkill.findMany({
      where: { personId: { in: allActivePeople.map((p) => p.id) } },
      select: { personId: true, skill: { select: { name: true } } },
    });
    const skillsByPerson = new Map<string, string[]>();
    for (const ps of personSkills) {
      const arr = skillsByPerson.get(ps.personId) ?? [];
      arr.push(ps.skill.name);
      skillsByPerson.set(ps.personId, arr);
    }

    const bench: BenchPerson[] = [];
    for (const p of allActivePeople) {
      const alloc = personAlloc.get(p.id) ?? 0;
      if (alloc < 20) {
        bench.push({
          personId: p.id,
          personName: p.displayName,
          availablePercent: 100 - alloc,
          skills: skillsByPerson.get(p.id) ?? [],
        });
      }
    }
    bench.sort((a, b) => b.availablePercent - a.availablePercent);

    // Sort projects by name
    const projectRows = [...projectMap.values()].sort((a, b) => a.projectName.localeCompare(b.projectName));

    return { weeks: weekStarts, projects: projectRows, bench };
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
