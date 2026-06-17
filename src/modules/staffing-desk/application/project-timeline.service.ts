import { Injectable } from '@nestjs/common';

import { decimalToNumber } from '@src/shared/persistence/decimal';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/** The Monday (UTC, 00:00) of the week containing `d`. Used to default a
 * missing/invalid `from` so the timeline never crashes on `Invalid time value`. */
function mondayOfUtc(d: Date): Date {
  const day = d.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  m.setUTCDate(m.getUTCDate() - daysFromMonday);
  return m;
}

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

    // Generate week start dates. Guard `from`: a missing/unparseable value
    // yields an Invalid Date and d.toISOString() then throws RangeError,
    // 500-ing the timeline. Default to the current week's UTC Monday.
    const weekStarts: string[] = [];
    const parsedFrom = from ? new Date(from) : new Date(NaN);
    const startDate = Number.isNaN(parsedFrom.getTime()) ? mondayOfUtc(new Date()) : parsedFrom;
    for (let i = 0; i < weekCount; i++) {
      const d = new Date(startDate);
      d.setUTCDate(d.getUTCDate() + i * 7);
      weekStarts.push(d.toISOString().slice(0, 10));
    }
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + weekCount * 7);

    // Resolve person scope for pool filter
    let personScope: Set<string> | null = null;
    if (poolId) {
      const memberships = await this.prisma.personResourcePoolMembership.findMany({
        where: { resourcePoolId: poolId },
        select: { personId: true },
      });
      personScope = new Set(memberships.map((m: { personId: string }) => m.personId));
    }

    // SoT PR 14b — canonical reads from ProjectPosition.
    // Active-fill positions (replaces legacy ProjectAssignment window read).
    const activeWhere: Record<string, unknown> = {
      fillStatus: { in: ['PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      activePersonId: { not: null },
      activeValidFrom: { lte: endDate },
      OR: [
        { activeValidTo: { gte: new Date(from) } },
        { activeValidTo: null },
      ],
    };
    if (projectId) activeWhere.projectId = projectId;
    if (personScope) activeWhere.activePersonId = { in: [...personScope] };

    const activePositions = await this.prisma.projectPosition.findMany({
      where: activeWhere,
      select: {
        id: true, activePersonId: true, projectId: true,
        activeAllocationPercent: true, activeValidFrom: true, activeValidTo: true, fillStatus: true,
      },
    });

    // Open-demand positions (replaces legacy StaffingRequest window read).
    const openWhere: Record<string, unknown> = {
      fillStatus: { in: ['OPEN', 'PROPOSED'] },
      startDate: { lte: endDate },
      endDate: { gte: new Date(from) },
    };
    if (projectId) openWhere.projectId = projectId;

    const openDemand = await this.prisma.projectPosition.findMany({
      where: openWhere,
      select: {
        id: true, projectId: true, role: true,
        requiredAllocationPercent: true, priority: true,
        startDate: true, endDate: true,
      },
    });

    // Adapt to the legacy shape so the rest of this method (below) is unchanged.
    const assignments = activePositions
      .filter((p): p is typeof p & { activePersonId: string; activeValidFrom: Date } =>
        p.activePersonId !== null && p.activeValidFrom !== null,
      )
      .map((p) => ({
        id: p.id,
        personId: p.activePersonId,
        projectId: p.projectId,
        allocationPercent: p.activeAllocationPercent,
        validFrom: p.activeValidFrom,
        validTo: p.activeValidTo,
        status: p.fillStatus as string,
      }));
    const requests = openDemand.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      role: p.role,
      allocationPercent: p.requiredAllocationPercent,
      priority: p.priority,
      headcountRequired: 1,
      headcountFulfilled: 0,
      startDate: p.startDate,
      endDate: p.endDate,
    }));

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

      // DATE-02: use `null` to mean "open ended" instead of a far-future
      // sentinel string. The week-overlap check below handles null explicitly.
      const aStart = a.validFrom.toISOString().slice(0, 10);
      const aEnd = a.validTo ? a.validTo.toISOString().slice(0, 10) : null;
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
        if (aStart <= we && (aEnd === null || aEnd >= ws)) {
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
        allocationPercent: decimalToNumber(r.allocationPercent),
        priority: r.priority,
        headcountOpen: openHc,
      };

      for (let i = 0; i < weekStarts.length; i++) {
        const ws = weekStarts[i];
        const we = this.addDays(ws, 6);
        if (rStart <= we && rEnd >= ws) {
          row.weekData[i].requests.push(block);
          // DM-4-3: StaffingRequest.allocationPercent is Decimal(5,2) after 2026-04-22.
          row.weekData[i].totalDemandPercent += decimalToNumber(r.allocationPercent) * openHc;
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
