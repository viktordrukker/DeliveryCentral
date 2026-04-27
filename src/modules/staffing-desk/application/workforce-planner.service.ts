import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/* ── Auto-Match types ── */

export type AutoMatchStrategy = 'BALANCED' | 'BEST_FIT' | 'UTILIZE_BENCH' | 'CHEAPEST' | 'GROWTH';
export type CellClass = 'SUGGESTED' | 'ACCEPTABLE' | 'MISMATCH';

export type ProjectStatusFilter = 'ACTIVE' | 'DRAFT' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED';
export type PriorityFilter = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface AutoMatchRequestDto {
  strategy?: AutoMatchStrategy;
  demandIds?: string[];
  lockedPersonIds?: string[];
  /** Monday-aligned ISO date of the first grid week. If provided, demand is filtered to the visible horizon. */
  from?: string;
  /** Grid horizon in weeks. Requires `from` to take effect. */
  weeks?: number;
  /** Minimum skill-match score (0.0–1.0) a candidate must meet to be suggested. Default 0.15. */
  minSkillMatch?: number;
  /** Legacy shortcut for projectStatuses=['ACTIVE','DRAFT']. projectStatuses wins when both are set. */
  includeDrafts?: boolean;
  /** Project statuses in scope. Must match the grid's filter. Defaults to ['ACTIVE']. */
  projectStatuses?: ProjectStatusFilter[];
  /** StaffingRequest priorities to include. RolePlans have no priority and are always included. Defaults to all. */
  priorities?: PriorityFilter[];
  /** Resource pool scope for bench people. */
  poolId?: string;
  /** Org unit scope for bench people. */
  orgUnitId?: string;
}

export interface AutoMatchSuggestion {
  benchPersonId: string;
  benchPersonName: string;
  targetProjectId: string;
  targetProjectName: string;
  demandId: string;
  demandRole: string;
  demandSkills: string[];
  matchedSkills: string[];
  mismatchedSkills: string[];
  matchScore: number;
  cellClass: CellClass;
  rationale: string;
  constraintWarnings: string[];
  weekStart: string;
  /** All Monday-aligned weeks the person should cover for this demand, clamped to grid horizon. */
  coverageWeeks: string[];
  allocationPercent: number;
  /** True when the candidate was picked via fallback (no skill match passed minSkillMatch). */
  fallbackUsed: boolean;
}

export interface UnmatchedDemand {
  demandId: string;
  role: string;
  skills: string[];
  headcountOpen: number;
  projectName: string;
  reason?: string;
}

export interface AutoMatchSummary {
  strategy: AutoMatchStrategy;
  totalDemand: number;
  assignedCount: number;
  unmatchedCount: number;
  strongCount: number;
  mediumCount: number;
  mismatchCount: number;
  avgMatchScore: number;
  estimatedMonthlyCostImpact: number;
  coverageLiftPercent: number;
}

export interface AutoMatchDiagnostics {
  /** Distinct projects that have any open demand in the DB. */
  projectsWithOpenDemand: number;
  /** Projects that survive status + endsOn filters — must match the grid's visible project count. */
  projectsInScope: number;
  /** Sum of headcount across every OPEN StaffingRequest + every ProjectRolePlan slot in the DB. */
  totalHeadcountScanned: number;
  /** Headcount after all filters (project-status, priority, horizon). */
  headcountInScope: number;
  headcountSkippedProjectStatus: number;
  headcountSkippedHorizon: number;
  headcountSkippedPriority: number;
  /** Active people count in the DB (employmentStatus=ACTIVE). */
  totalActivePeople: number;
  /** Eligible bench count after pool/org scope + <20% utilization gate. */
  benchInScope: number;
  suggestionsCreated: number;
  chainedCount: number;
  fallbackCount: number;
  unmatchedHeadcount: number;
}

export interface AutoMatchResultDto {
  strategy: AutoMatchStrategy;
  summary: AutoMatchSummary;
  suggestions: AutoMatchSuggestion[];
  unmatchedDemand: UnmatchedDemand[];
  diagnostics: AutoMatchDiagnostics;
}

export interface PlannerDispatchInput {
  personId: string;
  projectId: string;
  staffingRole: string;
  allocationPercent: number;
  startDate: string;
  note?: string;
}

export interface PlannerExtensionInput {
  assignmentId: string;
  newValidTo: string;
  note?: string;
}

export interface PlannerApplyRequestDto {
  actorId: string;
  dispatches: PlannerDispatchInput[];
  hireRequests: Array<{ projectId: string; role: string; skills: string[]; allocationPercent: number; headcount: number; priority: string; startDate: string; endDate: string }>;
  releases: Array<{ personId: string }>;
  extensions?: PlannerExtensionInput[];
}

export type ExtensionConflictKind =
  | 'employment-inactive'
  | 'termination-conflict'
  | 'project-end-overrun'
  | 'leave-overlap'
  | 'over-allocation';

export type ExtensionConflictSeverity = 'info' | 'warning' | 'danger';

export interface ExtensionConflict {
  kind: ExtensionConflictKind;
  severity: ExtensionConflictSeverity;
  message: string;
  blocking: boolean;
}

export interface ExtensionValidateRequestDto {
  assignmentId: string;
  newValidTo: string;
}

export interface ExtensionValidateResponseDto {
  assignmentId: string;
  personId: string;
  personName: string;
  projectId: string;
  projectName: string;
  currentValidTo: string | null;
  newValidTo: string;
  valid: boolean;
  conflicts: ExtensionConflict[];
}

export type WhyNotDisqualifier =
  | 'fully-allocated'
  | 'on-leave'
  | 'missing-skills'
  | 'wrong-grade'
  | 'inactive'
  | 'not-available';

export interface WhyNotCandidate {
  personId: string;
  personName: string;
  grade: string | null;
  availablePercent: number;
  skillScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  disqualifiers: WhyNotDisqualifier[];
  message: string;
}

export interface WhyNotRequestDto {
  demandId: string;
  topN?: number;
}

export interface WhyNotResponseDto {
  demandId: string;
  demandRole: string;
  demandSkills: string[];
  demandAllocationPercent: number;
  projectName: string;
  candidates: WhyNotCandidate[];
}

export interface PlannerApplyResponseDto {
  assignmentsCreated: number;
  staffingRequestsCreated: number;
  releasesNoted: number;
  extensionsUpdated: number;
  errors: string[];
}

/* ── Response types (match plan exactly) ── */

export interface PlannerAssignmentBlock {
  assignmentId: string;
  personId: string;
  personName: string;
  staffingRole: string;
  allocationPercent: number;
  status: string;
  costPerMonth: number | null;
}

export interface PlannerDemandBlock {
  requestId: string | null;
  rolePlanId: string | null;
  role: string;
  skills: string[];
  allocationPercent: number;
  headcountOpen: number;
  priority: string | null;
}

export interface PlannerProjectWeek {
  weekStart: string;
  assignments: PlannerAssignmentBlock[];
  demands: PlannerDemandBlock[];
  totalSupplyPercent: number;
  totalDemandPercent: number;
}

export interface PlannerProjectRow {
  projectId: string;
  projectName: string;
  projectCode: string;
  status: string;
  startsOn: string | null;
  endsOn: string | null;
  filledHc: number;
  requiredHc: number;
  weekData: PlannerProjectWeek[];
}

export interface PlannerBenchPerson {
  personId: string;
  displayName: string;
  grade: string | null;
  skills: string[];
  daysOnBench: number;
  availablePercent: number;
  costPerMonth: number | null;
}

export interface PlannerRollOff {
  personId: string;
  displayName: string;
  projectName: string;
  projectId: string;
  assignmentEndDate: string;
  allocationPercent: number;
  daysUntilRollOff: number;
  hasFollowOn: boolean;
}

export interface PlannerSkillGap {
  skill: string;
  needed: number;
  available: number;
  gap: number;
}

export interface WorkforcePlannerResponseDto {
  weeks: string[];
  projects: PlannerProjectRow[];
  supply: {
    totalFte: number;
    benchPeople: PlannerBenchPerson[];
    rollOffs: PlannerRollOff[];
  };
  demand: {
    totalHcRequired: number;
    bySkill: PlannerSkillGap[];
    draftProjectDemand: number;
  };
  budget: {
    enabled: boolean;
    baselineMonthlyCost: number;
    avgCostPerFte: number;
  };
}

/* ── Service ── */

@Injectable()
export class WorkforcePlannerService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getPlan(params: {
    from: string;
    weeks: number;
    includeDrafts: boolean;
    poolId?: string;
    orgUnitId?: string;
    projectStatuses?: ProjectStatusFilter[];
    priorities?: PriorityFilter[];
  }): Promise<WorkforcePlannerResponseDto> {
    const now = new Date();
    const { from, weeks: weekCount, includeDrafts } = params;

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

    // Person scope for pool/org filters
    let personScope: Set<string> | null = null;
    if (params.poolId) {
      const m = await this.prisma.personResourcePoolMembership.findMany({
        where: { resourcePoolId: params.poolId }, select: { personId: true },
      });
      personScope = new Set(m.map((x: { personId: string }) => x.personId));
    }
    if (params.orgUnitId) {
      const m = await this.prisma.personOrgMembership.findMany({
        where: { orgUnitId: params.orgUnitId }, select: { personId: true },
      });
      const ids = new Set(m.map((x: { personId: string }) => x.personId));
      personScope = personScope ? new Set([...personScope].filter((id) => ids.has(id))) : ids;
    }

    // Projects — projectStatuses wins, otherwise fall back to the includeDrafts shortcut.
    const planStatuses: ProjectStatusFilter[] = params.projectStatuses && params.projectStatuses.length > 0
      ? params.projectStatuses
      : (includeDrafts ? ['ACTIVE', 'DRAFT'] : ['ACTIVE']);
    const projects = await this.prisma.project.findMany({
      where: {
        status: { in: planStatuses as ('ACTIVE' | 'DRAFT' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED')[] },
        OR: [{ endsOn: null }, { endsOn: { gte: new Date(from) } }],
      },
      select: { id: true, name: true, projectCode: true, status: true, startsOn: true, endsOn: true },
    });

    // All assignments overlapping horizon (includes DRAFT so tentative plans show up in grid)
    const assignmentWhere: Record<string, unknown> = {
      status: { in: ['CREATED', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      validFrom: { lte: endDate },
      OR: [{ validTo: { gte: new Date(from) } }, { validTo: null }],
    };
    if (personScope) assignmentWhere.personId = { in: [...personScope] };

    const assignments = await this.prisma.projectAssignment.findMany({
      where: assignmentWhere,
      select: { id: true, personId: true, projectId: true, staffingRole: true, allocationPercent: true, validFrom: true, validTo: true, status: true },
    });

    // Role plans for these projects
    const projectIds = projects.map((p) => p.id);
    const rolePlans = await this.prisma.projectRolePlan.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true, projectId: true, roleName: true, headcount: true, allocationPercent: true, plannedStartDate: true, plannedEndDate: true, requiredSkillIds: true },
    });

    // Staffing requests overlapping horizon (priority-filtered to match autoMatch scope)
    const planPriorityWhere = params.priorities && params.priorities.length > 0
      ? { priority: { in: params.priorities as Array<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'> } }
      : {};
    const requests = await this.prisma.staffingRequest.findMany({
      where: {
        status: { in: ['OPEN', 'IN_REVIEW'] },
        projectId: { in: projectIds },
        startDate: { lte: endDate },
        endDate: { gte: new Date(from) },
        ...planPriorityWhere,
      },
      select: { id: true, projectId: true, role: true, skills: true, allocationPercent: true, headcountRequired: true, headcountFulfilled: true, priority: true, startDate: true, endDate: true },
    });

    // Lookups
    const allPersonIds = [...new Set(assignments.map((a) => a.personId))];
    const [people, allPeople, costRates, personSkills, skills] = await Promise.all([
      this.prisma.person.findMany({ where: { id: { in: allPersonIds } }, select: { id: true, displayName: true } }),
      this.prisma.person.findMany({
        where: { employmentStatus: 'ACTIVE', ...(personScope ? { id: { in: [...personScope] } } : {}) },
        select: { id: true, displayName: true, grade: true, hiredAt: true, createdAt: true },
      }),
      this.prisma.personCostRate.findMany({ select: { personId: true, hourlyRate: true } }),
      this.prisma.personSkill.findMany({
        where: personScope ? { personId: { in: [...personScope] } } : {},
        select: { personId: true, skill: { select: { name: true } } },
      }),
      this.prisma.skill.findMany({ select: { id: true, name: true } }),
    ]);

    const personNameMap = new Map(people.map((p) => [p.id, p.displayName]));
    const costByPerson = new Map<string, number>();
    for (const r of costRates) { costByPerson.set(r.personId, r.hourlyRate.toNumber()); }
    const skillNameMap = new Map(skills.map((s) => [s.id, s.name]));
    const skillsByPerson = new Map<string, string[]>();
    for (const ps of personSkills) {
      const arr = skillsByPerson.get(ps.personId) ?? [];
      arr.push(ps.skill.name);
      skillsByPerson.set(ps.personId, arr);
    }

    // Build project rows
    const projectRows: PlannerProjectRow[] = [];

    for (const proj of projects) {
      const projAssignments = assignments.filter((a) => a.projectId === proj.id);
      const projRolePlans = rolePlans.filter((rp) => rp.projectId === proj.id);
      const projRequests = requests.filter((r) => r.projectId === proj.id);

      // Filled HC = distinct assigned people
      const filledPersonIds = new Set(projAssignments.filter((a) => ['BOOKED','ONBOARDING','ASSIGNED','ON_HOLD'].includes(a.status)).map((a) => a.personId));
      const filledHc = filledPersonIds.size;
      const requiredHc = projRolePlans.reduce((sum, rp) => sum + rp.headcount, 0);

      // Build week data
      const weekData: PlannerProjectWeek[] = weekStarts.map((ws) => {
        const weekEnd = this.addDays(ws, 6);

        // Assignments overlapping this week
        const weekAssignments: PlannerAssignmentBlock[] = [];
        for (const a of projAssignments) {
          // DATE-02: open-ended assignments use null instead of a 9999 sentinel.
          const aStart = a.validFrom.toISOString().slice(0, 10);
          const aEnd = a.validTo ? a.validTo.toISOString().slice(0, 10) : null;
          if (aStart <= weekEnd && (aEnd === null || aEnd >= ws)) {
            const alloc = a.allocationPercent?.toNumber() ?? 0;
            const rate = costByPerson.get(a.personId);
            weekAssignments.push({
              assignmentId: a.id,
              personId: a.personId,
              personName: personNameMap.get(a.personId) ?? a.personId,
              staffingRole: a.staffingRole ?? '',
              allocationPercent: alloc,
              status: a.status,
              costPerMonth: rate ? Math.round(rate * 160 * (alloc / 100)) : null,
            });
          }
        }

        // Demand: merge StaffingRequests + unfilled RolePlans (requests replace matching role plans)
        const weekDemands: PlannerDemandBlock[] = [];
        const coveredRoles = new Set<string>();

        // First: requests (take priority)
        for (const r of projRequests) {
          const rStart = r.startDate.toISOString().slice(0, 10);
          const rEnd = r.endDate.toISOString().slice(0, 10);
          if (rStart <= weekEnd && rEnd >= ws) {
            const openHc = r.headcountRequired - r.headcountFulfilled;
            if (openHc > 0) {
              weekDemands.push({
                requestId: r.id,
                rolePlanId: null,
                role: r.role,
                skills: r.skills,
                allocationPercent: (r.allocationPercent as unknown as { toNumber(): number }).toNumber(),
                headcountOpen: openHc,
                priority: r.priority,
              });
              coveredRoles.add(r.role.toLowerCase());
            }
          }
        }

        // Then: role plans not covered by requests
        for (const rp of projRolePlans) {
          if (coveredRoles.has(rp.roleName.toLowerCase())) continue;
          // DATE-02: open-ended role plans use null. The fallback start date
          // (0000-01-01) is a valid lexicographic minimum used only when both
          // the role plan start and the project start are unset.
          const rpStart = rp.plannedStartDate ? rp.plannedStartDate.toISOString().slice(0, 10) : (proj.startsOn?.toISOString().slice(0, 10) ?? '0000-01-01');
          const rpEnd = rp.plannedEndDate ? rp.plannedEndDate.toISOString().slice(0, 10) : null;
          if (rpStart <= weekEnd && (rpEnd === null || rpEnd >= ws)) {
            // Count how many assignments match this role
            const matchedCount = weekAssignments.filter((a) => a.staffingRole.toLowerCase() === rp.roleName.toLowerCase()).length;
            const openHc = Math.max(0, rp.headcount - matchedCount);
            if (openHc > 0) {
              weekDemands.push({
                requestId: null,
                rolePlanId: rp.id,
                role: rp.roleName,
                skills: rp.requiredSkillIds.map((id) => skillNameMap.get(id) ?? id),
                allocationPercent: rp.allocationPercent?.toNumber() ?? 100,
                headcountOpen: openHc,
                priority: null,
              });
            }
          }
        }

        return {
          weekStart: ws,
          assignments: weekAssignments,
          demands: weekDemands,
          totalSupplyPercent: weekAssignments.reduce((s, a) => s + a.allocationPercent, 0),
          totalDemandPercent: weekDemands.reduce((s, d) => s + d.allocationPercent * d.headcountOpen, 0),
        };
      });

      projectRows.push({
        projectId: proj.id,
        projectName: proj.name,
        projectCode: proj.projectCode,
        status: proj.status,
        startsOn: proj.startsOn?.toISOString() ?? null,
        endsOn: proj.endsOn?.toISOString() ?? null,
        filledHc,
        requiredHc,
        weekData,
      });
    }

    projectRows.sort((a, b) => a.projectName.localeCompare(b.projectName));

    // Supply: bench + roll-offs
    const allocByPerson = new Map<string, number>();
    for (const a of assignments) {
      if (['BOOKED','ONBOARDING','ASSIGNED','ON_HOLD'].includes(a.status)) {
        allocByPerson.set(a.personId, (allocByPerson.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
      }
    }

    // Bench: <20% allocation
    const endedAssignments = await this.prisma.projectAssignment.findMany({
      where: { status: { in: ['COMPLETED', 'CANCELLED'] }, validTo: { not: null, lt: now } },
      select: { personId: true, validTo: true },
      orderBy: { validTo: 'desc' },
    });
    const lastEndByPerson = new Map<string, Date>();
    for (const a of endedAssignments) {
      if (!lastEndByPerson.has(a.personId) && a.validTo) lastEndByPerson.set(a.personId, a.validTo);
    }

    const benchPeople: PlannerBenchPerson[] = [];
    for (const p of allPeople) {
      const alloc = allocByPerson.get(p.id) ?? 0;
      if (alloc >= 20) continue;
      const benchStart = lastEndByPerson.get(p.id) ?? p.hiredAt ?? p.createdAt;
      const rate = costByPerson.get(p.id);
      benchPeople.push({
        personId: p.id,
        displayName: p.displayName,
        grade: p.grade,
        skills: skillsByPerson.get(p.id) ?? [],
        daysOnBench: Math.max(0, Math.round((now.getTime() - benchStart.getTime()) / 86400000)),
        availablePercent: 100 - alloc,
        costPerMonth: rate ? Math.round(rate * 160) : null,
      });
    }
    benchPeople.sort((a, b) => b.daysOnBench - a.daysOnBench);

    // Roll-offs: assignments ending within horizon
    const rollOffAssignments = assignments.filter((a) =>
      (['BOOKED','ONBOARDING','ASSIGNED','ON_HOLD'].includes(a.status)) && a.validTo && a.validTo >= now && a.validTo <= endDate,
    );
    const rollOffPersonIds = [...new Set(rollOffAssignments.map((a) => a.personId))];
    const followOns = rollOffPersonIds.length > 0 ? await this.prisma.projectAssignment.findMany({
      where: { personId: { in: rollOffPersonIds }, status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] }, validFrom: { gte: now } },
      select: { personId: true },
    }) : [];
    const hasFollowOnSet = new Set(followOns.map((a) => a.personId));
    const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));

    const rollOffs: PlannerRollOff[] = rollOffAssignments.map((a) => ({
      personId: a.personId,
      displayName: personNameMap.get(a.personId) ?? a.personId,
      projectName: projectNameMap.get(a.projectId) ?? a.projectId,
      projectId: a.projectId,
      assignmentEndDate: a.validTo!.toISOString(),
      allocationPercent: a.allocationPercent?.toNumber() ?? 0,
      daysUntilRollOff: Math.max(0, Math.round((a.validTo!.getTime() - now.getTime()) / 86400000)),
      hasFollowOn: hasFollowOnSet.has(a.personId),
    })).sort((a, b) => a.daysUntilRollOff - b.daysUntilRollOff);

    // Demand summary: skill gaps
    const skillDemand = new Map<string, number>();
    const skillSupply = new Map<string, number>();
    for (const proj of projectRows) {
      for (const wd of proj.weekData) {
        for (const d of wd.demands) {
          for (const sk of d.skills) {
            skillDemand.set(sk, (skillDemand.get(sk) ?? 0) + d.headcountOpen);
          }
        }
      }
    }
    // Count available people per skill (bench + underallocated)
    for (const p of allPeople) {
      const alloc = allocByPerson.get(p.id) ?? 0;
      if (alloc < 100) {
        for (const sk of (skillsByPerson.get(p.id) ?? [])) {
          skillSupply.set(sk, (skillSupply.get(sk) ?? 0) + 1);
        }
      }
    }
    const bySkill: PlannerSkillGap[] = [...new Set([...skillDemand.keys(), ...skillSupply.keys()])].map((sk) => {
      const needed = skillDemand.get(sk) ?? 0;
      const available = skillSupply.get(sk) ?? 0;
      return { skill: sk, needed, available, gap: needed - available };
    }).filter((g) => g.needed > 0 || g.gap !== 0).sort((a, b) => b.gap - a.gap);

    const totalHcRequired = projectRows.reduce((sum, p) => sum + p.requiredHc, 0);
    const draftProjectDemand = projectRows.filter((p) => p.status === 'DRAFT').reduce((sum, p) => sum + p.requiredHc, 0);

    // Budget
    const budgetSetting = await this.prisma.platformSetting.findUnique({ where: { key: 'budgetSimulation.enabled' } });
    const budgetEnabled = budgetSetting ? Boolean(budgetSetting.value) : false;

    let baselineMonthlyCost = 0;
    if (budgetEnabled) {
      for (const p of allPeople) {
        const rate = costByPerson.get(p.id);
        if (rate) baselineMonthlyCost += Math.round(rate * 160);
      }
    }

    return {
      weeks: weekStarts,
      projects: projectRows,
      supply: { totalFte: allPeople.length, benchPeople, rollOffs },
      demand: { totalHcRequired, bySkill, draftProjectDemand },
      budget: {
        enabled: budgetEnabled,
        baselineMonthlyCost,
        avgCostPerFte: allPeople.length > 0 ? Math.round(baselineMonthlyCost / allPeople.length) : 0,
      },
    };
  }

  /* ── Auto-Match: strategy-driven matching with constraint awareness ── */

  public async autoMatch(params: AutoMatchRequestDto = {}): Promise<AutoMatchResultDto> {
    const strategy: AutoMatchStrategy = params.strategy ?? 'BALANCED';
    const lockedSet = new Set(params.lockedPersonIds ?? []);
    const demandSubset = params.demandIds && params.demandIds.length > 0 ? new Set(params.demandIds) : null;
    // Skill-match floor: candidates below this are never suggested. GROWTH strategy is exempt (it
    // intentionally targets 0.2–0.6 partial-match stretch assignments).
    const rawMin = typeof params.minSkillMatch === 'number' ? params.minSkillMatch : 0.15;
    const minSkillMatch = strategy === 'GROWTH' ? 0 : Math.max(0, Math.min(1, rawMin));

    // Priority filter — applies to StaffingRequest only (RolePlans have no priority).
    const priorityFilter = params.priorities && params.priorities.length > 0 ? new Set(params.priorities) : null;

    const now = new Date();

    // Snap any date to the Monday of its week (UTC) so suggestions align with the grid's Monday-based weeks.
    const toMondayIso = (d: Date): string => {
      const day = d.getUTCDay();
      const daysFromMonday = day === 0 ? 6 : day - 1;
      const m = new Date(d);
      m.setUTCDate(m.getUTCDate() - daysFromMonday);
      return m.toISOString().slice(0, 10);
    };

    // Clamp a demand date into the visible horizon so a suggestion always lands on a grid cell.
    // Open demand that started before the horizon shows on the first visible week; future demand uses its own Monday.
    const clampToHorizon = (d: Date, horizonStart: Date | null, horizonEnd: Date | null): string => {
      let target = d;
      if (horizonStart && target < horizonStart) target = horizonStart;
      if (horizonEnd) {
        const lastVisible = new Date(horizonEnd.getTime() - 7 * 86400000);
        if (target > lastVisible) target = lastVisible;
      }
      return toMondayIso(target);
    };

    // Horizon window: only consider demand whose date range overlaps [horizonStart, horizonEnd].
    // Without a horizon, auto-match returns suggestions for far-future demand that never renders in the grid.
    const horizonStart = params.from ? new Date(params.from) : null;
    const horizonEnd = horizonStart && params.weeks
      ? new Date(horizonStart.getTime() + params.weeks * 7 * 86400000)
      : null;

    const requestWhere: { status: { in: Array<'OPEN' | 'IN_REVIEW'> }; startDate?: { lte: Date }; endDate?: { gte: Date }; priority?: { in: Array<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'> } } = {
      status: { in: ['OPEN', 'IN_REVIEW'] },
    };
    if (horizonStart && horizonEnd) {
      requestWhere.startDate = { lte: horizonEnd };
      requestWhere.endDate = { gte: horizonStart };
    }
    if (priorityFilter) {
      requestWhere.priority = { in: [...priorityFilter] as Array<'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'> };
    }
    const requests = await this.prisma.staffingRequest.findMany({
      where: requestWhere,
      select: { id: true, projectId: true, role: true, skills: true, allocationPercent: true, headcountRequired: true, headcountFulfilled: true, priority: true, startDate: true, endDate: true },
    });

    const allRolePlans = await this.prisma.projectRolePlan.findMany({
      select: { id: true, projectId: true, roleName: true, requiredSkillIds: true, allocationPercent: true, headcount: true, plannedStartDate: true, plannedEndDate: true },
    });
    // Role plans have nullable dates, so filter in-memory. An undated plan is assumed current.
    const rolePlans = horizonStart && horizonEnd
      ? allRolePlans.filter((rp) => {
        const rpStart = rp.plannedStartDate ?? horizonStart;
        const rpEnd = rp.plannedEndDate ?? horizonEnd;
        return rpStart <= horizonEnd && rpEnd >= horizonStart;
      })
      : allRolePlans;

    // Project-status scope — must match the grid. projectStatuses wins; falls back to includeDrafts shortcut.
    const resolvedStatuses: ProjectStatusFilter[] = params.projectStatuses && params.projectStatuses.length > 0
      ? params.projectStatuses
      : (params.includeDrafts ? ['ACTIVE', 'DRAFT'] : ['ACTIVE']);
    const projectIds = [...new Set([...requests.map((r) => r.projectId), ...rolePlans.map((rp) => rp.projectId)])];
    // Match getPlan's project visibility exactly: same status whitelist AND the same endsOn guard
    // (projects whose end predates the horizon start never render in the grid, so they must not
    // produce auto-match suggestions either).
    const projectWhere: {
      id: { in: string[] };
      status: { in: ('ACTIVE' | 'DRAFT' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED')[] };
      OR?: Array<{ endsOn: null } | { endsOn: { gte: Date } }>;
    } = {
      id: { in: projectIds },
      status: { in: resolvedStatuses as ('ACTIVE' | 'DRAFT' | 'ON_HOLD' | 'CLOSED' | 'COMPLETED' | 'ARCHIVED')[] },
    };
    if (horizonStart) {
      projectWhere.OR = [{ endsOn: null }, { endsOn: { gte: horizonStart } }];
    }
    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: { id: true, name: true, endsOn: true },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p]));
    const visibleProjectIds = new Set(projects.map((p) => p.id));
    const visibleRequests = requests.filter((r) => visibleProjectIds.has(r.projectId));
    const visibleRolePlans = rolePlans.filter((rp) => visibleProjectIds.has(rp.projectId));

    // Person scope — match getPlan exactly so the same bench people are eligible on both endpoints.
    let personScope: Set<string> | null = null;
    if (params.poolId) {
      const m = await this.prisma.personResourcePoolMembership.findMany({
        where: { resourcePoolId: params.poolId }, select: { personId: true },
      });
      personScope = new Set(m.map((x) => x.personId));
    }
    if (params.orgUnitId) {
      const m = await this.prisma.personOrgMembership.findMany({
        where: { orgUnitId: params.orgUnitId }, select: { personId: true },
      });
      const ids = new Set(m.map((x) => x.personId));
      personScope = personScope ? new Set([...personScope].filter((id) => ids.has(id))) : ids;
    }

    const priorityOrder: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    interface DemandItem {
      id: string;
      projectId: string;
      projectName: string;
      projectEndsOn: Date | null;
      role: string;
      skillNames: string[];
      allocationPercent: number;
      headcountOpen: number;
      priority: number;
      weekStart: string;
      startDate: Date;
      endDate: Date;
    }

    // Enumerate Monday ISO dates inside [start, end], clamped to horizon.
    const enumerateCoverageWeeks = (start: Date, end: Date): string[] => {
      const lowerMs = Math.max(
        horizonStart ? horizonStart.getTime() : -Infinity,
        start.getTime(),
      );
      const effectiveHorizonEnd = horizonEnd ? horizonEnd.getTime() - 7 * 86400000 : Infinity;
      const upperMs = Math.min(effectiveHorizonEnd, end.getTime());
      if (upperMs < lowerMs) return [];
      const weeks: string[] = [];
      let cur = new Date(lowerMs);
      // Snap start to its Monday
      cur = new Date(toMondayIso(cur));
      while (cur.getTime() <= upperMs) {
        weeks.push(cur.toISOString().slice(0, 10));
        cur = new Date(cur.getTime() + 7 * 86400000);
      }
      return weeks;
    };

    const allSkillIds = visibleRolePlans.flatMap((rp) => rp.requiredSkillIds);
    const skillLookup = allSkillIds.length > 0 ? await this.prisma.skill.findMany({ where: { id: { in: allSkillIds } }, select: { id: true, name: true } }) : [];
    const skillNameById = new Map(skillLookup.map((s) => [s.id, s.name]));

    const demandList: DemandItem[] = [];

    for (const r of visibleRequests) {
      const openHc = r.headcountRequired - r.headcountFulfilled;
      if (openHc <= 0) continue;
      const proj = projectMap.get(r.projectId);
      demandList.push({
        id: r.id,
        projectId: r.projectId,
        projectName: proj?.name ?? r.projectId,
        projectEndsOn: proj?.endsOn ?? null,
        role: r.role,
        skillNames: r.skills,
        allocationPercent: (r.allocationPercent as unknown as { toNumber(): number }).toNumber(),
        headcountOpen: openHc,
        priority: priorityOrder[r.priority] ?? 2,
        weekStart: clampToHorizon(r.startDate, horizonStart, horizonEnd),
        startDate: r.startDate,
        endDate: r.endDate,
      });
    }

    const requestRolesByProject = new Map<string, Set<string>>();
    for (const r of visibleRequests) {
      const set = requestRolesByProject.get(r.projectId) ?? new Set();
      set.add(r.role.toLowerCase());
      requestRolesByProject.set(r.projectId, set);
    }
    for (const rp of visibleRolePlans) {
      if (requestRolesByProject.get(rp.projectId)?.has(rp.roleName.toLowerCase())) continue;
      const proj = projectMap.get(rp.projectId);
      const rpStart = rp.plannedStartDate ?? now;
      const rpEnd = rp.plannedEndDate ?? horizonEnd ?? new Date(now.getTime() + 180 * 86400000);
      demandList.push({
        id: rp.id,
        projectId: rp.projectId,
        projectName: proj?.name ?? rp.projectId,
        projectEndsOn: proj?.endsOn ?? null,
        role: rp.roleName,
        skillNames: rp.requiredSkillIds.map((id) => skillNameById.get(id) ?? id),
        allocationPercent: rp.allocationPercent?.toNumber() ?? 100,
        headcountOpen: rp.headcount,
        priority: 2,
        weekStart: clampToHorizon(rpStart, horizonStart, horizonEnd),
        startDate: rpStart,
        endDate: rpEnd,
      });
    }

    const filteredDemand = demandSubset ? demandList.filter((d) => demandSubset.has(d.id)) : demandList;
    // Chain-friendly ordering: earliest-starting demand first (so completed-then-available people can be
    // rolled onto later demand). Priority + headcount break ties within the same startDate.
    filteredDemand.sort((a, b) => a.weekStart.localeCompare(b.weekStart) || a.priority - b.priority || b.headcountOpen - a.headcountOpen);

    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: { status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] } },
      select: { personId: true, allocationPercent: true },
    });
    const allocByPerson = new Map<string, number>();
    for (const a of activeAssignments) {
      allocByPerson.set(a.personId, (allocByPerson.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
    }

    const allPeople = await this.prisma.person.findMany({
      where: { employmentStatus: 'ACTIVE', ...(personScope ? { id: { in: [...personScope] } } : {}) },
      select: { id: true, displayName: true, grade: true, hiredAt: true, createdAt: true },
    });
    const benchPeople = allPeople.filter((p) => (allocByPerson.get(p.id) ?? 0) < 20 && !lockedSet.has(p.id));
    const benchIds = benchPeople.map((p) => p.id);

    const personSkills = await this.prisma.personSkill.findMany({
      where: { personId: { in: benchIds } },
      select: { personId: true, proficiency: true, skill: { select: { name: true } } },
    });
    const skillsByPerson = new Map<string, Map<string, number>>();
    for (const ps of personSkills) {
      let m = skillsByPerson.get(ps.personId);
      if (!m) { m = new Map(); skillsByPerson.set(ps.personId, m); }
      m.set(ps.skill.name, ps.proficiency);
    }

    const costRates = await this.prisma.personCostRate.findMany({
      where: { personId: { in: benchIds } },
      select: { personId: true, hourlyRate: true },
    });
    const costByPerson = new Map<string, number>();
    for (const r of costRates) costByPerson.set(r.personId, Math.round(r.hourlyRate.toNumber() * 160));

    const endedAssignments = await this.prisma.projectAssignment.findMany({
      where: { status: { in: ['COMPLETED', 'CANCELLED'] }, validTo: { not: null, lt: now }, personId: { in: benchIds } },
      select: { personId: true, validTo: true },
      orderBy: { validTo: 'desc' },
    });
    const lastEndByPerson = new Map<string, Date>();
    for (const a of endedAssignments) {
      if (!lastEndByPerson.has(a.personId) && a.validTo) lastEndByPerson.set(a.personId, a.validTo);
    }
    const daysOnBenchByPerson = new Map<string, number>();
    for (const p of benchPeople) {
      const benchStart = lastEndByPerson.get(p.id) ?? p.hiredAt ?? p.createdAt;
      daysOnBenchByPerson.set(p.id, Math.max(0, Math.round((now.getTime() - benchStart.getTime()) / 86400000)));
    }

    // Approved leave windows overlapping the 180-day leave lookup window
    const leaveLookupEnd = new Date(now);
    leaveLookupEnd.setUTCDate(leaveLookupEnd.getUTCDate() + 180);
    const leaves = benchIds.length > 0 ? await this.prisma.leaveRequest.findMany({
      where: { status: 'APPROVED', personId: { in: benchIds }, endDate: { gte: now }, startDate: { lte: leaveLookupEnd } },
      select: { personId: true, startDate: true, endDate: true },
    }) : [];
    const leavesByPerson = new Map<string, Array<{ start: string; end: string }>>();
    for (const lv of leaves) {
      const arr = leavesByPerson.get(lv.personId) ?? [];
      arr.push({ start: lv.startDate.toISOString().slice(0, 10), end: lv.endDate.toISOString().slice(0, 10) });
      leavesByPerson.set(lv.personId, arr);
    }

    const maxBenchDays = Math.max(1, ...[...daysOnBenchByPerson.values()]);
    const maxCost = Math.max(1, ...[...costByPerson.values()]);

    // Track simulated allocation (person cumulative across this batch)
    const simAlloc = new Map<string, number>(allocByPerson);

    const computeSkillScore = (personSkillMap: Map<string, number> | undefined, demandSkills: string[]): { score: number; matched: string[]; missing: string[] } => {
      if (!personSkillMap || demandSkills.length === 0) return { score: 0, matched: [], missing: demandSkills };
      const matched: string[] = [];
      const missing: string[] = [];
      let total = 0;
      for (const sk of demandSkills) {
        const prof = personSkillMap.get(sk);
        if (prof !== undefined) { total += prof / 5; matched.push(sk); }
        else { missing.push(sk); }
      }
      return { score: total / demandSkills.length, matched, missing };
    };

    const scoreByStrategy = (skillScore: number, benchRatio: number, costRatio: number, isJunior: boolean): number => {
      switch (strategy) {
        case 'BEST_FIT': return skillScore;
        case 'UTILIZE_BENCH': return 0.7 * benchRatio + 0.3 * skillScore;
        case 'CHEAPEST': return 0.7 * costRatio + 0.3 * skillScore;
        case 'GROWTH': {
          if (skillScore < 0.2 || skillScore > 0.6) return 0;
          const stretchBonus = (0.6 - skillScore) * 2;
          return stretchBonus + 0.25 * benchRatio + (isJunior ? 0.15 : 0);
        }
        case 'BALANCED':
        default: return 0.5 * skillScore + 0.3 * benchRatio + 0.2 * costRatio;
      }
    };

    const classify = (skillScore: number): CellClass => {
      if (skillScore >= 0.7) return 'SUGGESTED';
      if (skillScore >= 0.4) return 'ACCEPTABLE';
      return 'MISMATCH';
    };

    const addDaysStr = (dateStr: string, days: number): string => {
      const d = new Date(dateStr);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };

    // Per-person "busy until" Monday — replaces consumed-once so a person finishing project A
    // can be proposed for project B starting the next week (chain/follow-on staffing).
    const personBusyUntil = new Map<string, string>();
    let chainedCount = 0;

    const suggestions: AutoMatchSuggestion[] = [];
    const unmatchedDemand: UnmatchedDemand[] = [];

    for (const demand of filteredDemand) {
      // Hard constraint: project ends before demand start
      if (demand.projectEndsOn) {
        const endStr = demand.projectEndsOn.toISOString().slice(0, 10);
        if (demand.weekStart > endStr) {
          unmatchedDemand.push({
            demandId: demand.id,
            role: demand.role,
            skills: demand.skillNames,
            headcountOpen: demand.headcountOpen,
            projectName: demand.projectName,
            reason: `Project closes ${endStr} — demand starts after`,
          });
          continue;
        }
      }

      const weekEndStr = addDaysStr(demand.weekStart, 6);
      const coverageWeeks = enumerateCoverageWeeks(demand.startDate, demand.endDate);
      let filled = 0;

      for (let hc = 0; hc < demand.headcountOpen; hc++) {
        // Three-tier selection:
        //   Tier 0 — chain candidate: person whose previous assignment ends <= this demand's start.
        //            Ranked by busyUntil descending (tighter chain = better), then strategy score.
        //   Tier 1 — skill-qualified fresh candidate (passes minSkillMatch), ranked by strategy score.
        //   Tier 2 — fallback: longest-benched eligible person regardless of skill.
        let bestChain: {
          person: (typeof benchPeople)[number];
          stratScore: number;
          skillScore: number;
          matched: string[];
          missing: string[];
          warnings: string[];
          prevBusyUntil: string;
        } | null = null;
        let bestQualified: {
          person: (typeof benchPeople)[number];
          stratScore: number;
          skillScore: number;
          matched: string[];
          missing: string[];
          warnings: string[];
        } | null = null;
        let bestFallback: {
          person: (typeof benchPeople)[number];
          benchDays: number;
          skillScore: number;
          matched: string[];
          missing: string[];
          warnings: string[];
        } | null = null;

        for (const person of benchPeople) {
          const busyUntil = personBusyUntil.get(person.id);
          // Person available if never busy or previous engagement ends strictly before this demand's start.
          if (busyUntil && busyUntil >= demand.weekStart) continue;

          const currentAlloc = simAlloc.get(person.id) ?? 0;
          // Over-allocation only relevant for fresh bench people; chained people have freed their capacity.
          if (!busyUntil && currentAlloc + demand.allocationPercent > 100) continue;

          const leaveWindows = leavesByPerson.get(person.id) ?? [];
          const onLeave = leaveWindows.some((w) => w.start <= weekEndStr && w.end >= demand.weekStart);
          if (onLeave) continue;

          const { score: skillScore, matched, missing } = computeSkillScore(skillsByPerson.get(person.id), demand.skillNames);
          const benchDays = daysOnBenchByPerson.get(person.id) ?? 0;
          const benchRatio = benchDays / maxBenchDays;
          const costRatio = 1 - ((costByPerson.get(person.id) ?? 0) / maxCost);
          const gradeLabel = (person.grade ?? '').toUpperCase();
          const isJunior = gradeLabel.startsWith('J') || gradeLabel.includes('JUNIOR') || gradeLabel.includes('ASSOC');

          const warnings: string[] = [];
          const costPerMonth = costByPerson.get(person.id);
          if (costPerMonth !== undefined && costPerMonth > maxCost * 0.85) warnings.push('High cost-per-month');

          // Tier 2: any eligible person ranked by longest bench time
          if (!bestFallback || benchDays > bestFallback.benchDays) {
            bestFallback = { person, benchDays, skillScore, matched, missing, warnings };
          }

          // Tiers 0/1: only candidates clearing the skill floor
          if (skillScore < minSkillMatch) continue;
          const stratScore = scoreByStrategy(skillScore, benchRatio, costRatio, isJunior);
          if (stratScore <= 0) continue;

          if (busyUntil) {
            // Chain candidate — prefer tighter chains (busyUntil closest to demand start)
            if (!bestChain || busyUntil > bestChain.prevBusyUntil || (busyUntil === bestChain.prevBusyUntil && stratScore > bestChain.stratScore)) {
              bestChain = { person, stratScore, skillScore, matched, missing, warnings, prevBusyUntil: busyUntil };
            }
          } else if (!bestQualified || stratScore > bestQualified.stratScore) {
            bestQualified = { person, stratScore, skillScore, matched, missing, warnings };
          }
        }

        const chainPicked = bestChain !== null;
        const chosen = bestChain ?? bestQualified ?? bestFallback;
        if (!chosen) break;
        const fallbackUsed = !bestChain && !bestQualified;
        if (chainPicked) chainedCount++;

        // Record busy-until for future chaining consideration
        const lastWeek = coverageWeeks.length > 0 ? coverageWeeks[coverageWeeks.length - 1] : demand.weekStart;
        personBusyUntil.set(chosen.person.id, lastWeek);
        if (!chainPicked) {
          simAlloc.set(chosen.person.id, (simAlloc.get(chosen.person.id) ?? 0) + demand.allocationPercent);
        }

        const cellClass = classify(chosen.skillScore);
        const rationaleParts: string[] = [];
        if (chainPicked) rationaleParts.push('chain: rolls off previous engagement');
        else if (fallbackUsed) rationaleParts.push('fallback: longest bench');
        rationaleParts.push(`${Math.round(chosen.skillScore * 100)}% skill match`);
        rationaleParts.push(`${daysOnBenchByPerson.get(chosen.person.id) ?? 0}d on bench`);
        const cost = costByPerson.get(chosen.person.id);
        if (cost !== undefined) rationaleParts.push(`$${Math.round(cost / 1000)}k/mo`);
        if (chosen.missing.length > 0) rationaleParts.push(`missing: ${chosen.missing.slice(0, 2).join(', ')}`);
        rationaleParts.push(`covers ${coverageWeeks.length} week${coverageWeeks.length === 1 ? '' : 's'}`);
        const rationale = `${strategy.toLowerCase()} → ${rationaleParts.join(' · ')}`;

        suggestions.push({
          benchPersonId: chosen.person.id,
          benchPersonName: chosen.person.displayName,
          targetProjectId: demand.projectId,
          targetProjectName: demand.projectName,
          demandId: demand.id,
          demandRole: demand.role,
          demandSkills: demand.skillNames,
          matchedSkills: chosen.matched,
          mismatchedSkills: chosen.missing,
          matchScore: Math.round(chosen.skillScore * 100) / 100,
          cellClass,
          rationale,
          constraintWarnings: chosen.warnings,
          weekStart: demand.weekStart,
          coverageWeeks: coverageWeeks.length > 0 ? coverageWeeks : [demand.weekStart],
          allocationPercent: demand.allocationPercent,
          fallbackUsed,
        });
        filled++;
      }

      if (filled < demand.headcountOpen) {
        unmatchedDemand.push({
          demandId: demand.id,
          role: demand.role,
          skills: demand.skillNames,
          headcountOpen: demand.headcountOpen - filled,
          projectName: demand.projectName,
          reason: 'No eligible bench person (capacity, or leave constraints)',
        });
      }
    }

    const totalDemandHc = filteredDemand.reduce((s, d) => s + d.headcountOpen, 0);
    const strongCount = suggestions.filter((s) => s.cellClass === 'SUGGESTED').length;
    const mediumCount = suggestions.filter((s) => s.cellClass === 'ACCEPTABLE').length;
    const mismatchCount = suggestions.filter((s) => s.cellClass === 'MISMATCH').length;
    const avgMatchScore = suggestions.length > 0 ? suggestions.reduce((s, x) => s + x.matchScore, 0) / suggestions.length : 0;
    const estimatedMonthlyCostImpact = suggestions.reduce((s, x) => s + ((costByPerson.get(x.benchPersonId) ?? 0) * (x.allocationPercent / 100)), 0);
    const coverageLiftPercent = totalDemandHc > 0 ? (suggestions.length / totalDemandHc) * 100 : 0;

    // Diagnostics — HC-based so the numbers reconcile against the grid's demand dashes.
    const [rawRequests, rawRolePlans, totalActivePeople] = await Promise.all([
      this.prisma.staffingRequest.findMany({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
        select: { projectId: true, priority: true, headcountRequired: true, headcountFulfilled: true, startDate: true, endDate: true },
      }),
      this.prisma.projectRolePlan.findMany({
        select: { projectId: true, headcount: true, plannedStartDate: true, plannedEndDate: true },
      }),
      this.prisma.person.count({ where: { employmentStatus: 'ACTIVE' } }),
    ]);

    const rawRequestHc = rawRequests.reduce((s, r) => s + Math.max(0, r.headcountRequired - r.headcountFulfilled), 0);
    const rawRolePlanHc = rawRolePlans.reduce((s, rp) => s + rp.headcount, 0);
    const totalHeadcountScanned = rawRequestHc + rawRolePlanHc;
    const headcountInScope = filteredDemand.reduce((s, d) => s + d.headcountOpen, 0);

    const projectsWithDemand = new Set<string>([
      ...rawRequests.map((r) => r.projectId),
      ...rawRolePlans.map((rp) => rp.projectId),
    ]).size;

    // Breakdown of what each filter removed, measured in HC.
    const requestsAfterHorizon = horizonStart && horizonEnd
      ? rawRequests.filter((r) => r.startDate <= horizonEnd && r.endDate >= horizonStart)
      : rawRequests;
    const rolePlansAfterHorizon = horizonStart && horizonEnd
      ? rawRolePlans.filter((rp) => {
        const s = rp.plannedStartDate ?? horizonStart;
        const e = rp.plannedEndDate ?? horizonEnd;
        return s <= horizonEnd && e >= horizonStart;
      })
      : rawRolePlans;
    const hcAfterHorizon = requestsAfterHorizon.reduce((s, r) => s + Math.max(0, r.headcountRequired - r.headcountFulfilled), 0)
      + rolePlansAfterHorizon.reduce((s, rp) => s + rp.headcount, 0);
    const headcountSkippedHorizon = Math.max(0, totalHeadcountScanned - hcAfterHorizon);

    const requestsAfterPriority = priorityFilter
      ? requestsAfterHorizon.filter((r) => priorityFilter.has(r.priority as PriorityFilter))
      : requestsAfterHorizon;
    const hcAfterPriority = requestsAfterPriority.reduce((s, r) => s + Math.max(0, r.headcountRequired - r.headcountFulfilled), 0)
      + rolePlansAfterHorizon.reduce((s, rp) => s + rp.headcount, 0);
    const headcountSkippedPriority = Math.max(0, hcAfterHorizon - hcAfterPriority);

    const headcountSkippedProjectStatus = Math.max(0, hcAfterPriority - headcountInScope);

    const diagnostics: AutoMatchDiagnostics = {
      projectsWithOpenDemand: projectsWithDemand,
      projectsInScope: projects.length,
      totalHeadcountScanned,
      headcountInScope,
      headcountSkippedProjectStatus,
      headcountSkippedHorizon,
      headcountSkippedPriority,
      totalActivePeople,
      benchInScope: benchPeople.length,
      suggestionsCreated: suggestions.length,
      chainedCount,
      fallbackCount: suggestions.filter((s) => s.fallbackUsed).length,
      unmatchedHeadcount: unmatchedDemand.reduce((s, u) => s + u.headcountOpen, 0),
    };

    return {
      strategy,
      summary: {
        strategy,
        totalDemand: totalDemandHc,
        assignedCount: suggestions.length,
        unmatchedCount: unmatchedDemand.reduce((s, u) => s + u.headcountOpen, 0),
        strongCount,
        mediumCount,
        mismatchCount,
        avgMatchScore: Math.round(avgMatchScore * 100) / 100,
        estimatedMonthlyCostImpact: Math.round(estimatedMonthlyCostImpact),
        coverageLiftPercent: Math.round(coverageLiftPercent * 10) / 10,
      },
      suggestions,
      unmatchedDemand,
      diagnostics,
    };
  }

  /* ── Apply: bulk-create assignments + staffing requests ── */

  public async applyPlan(request: PlannerApplyRequestDto): Promise<PlannerApplyResponseDto> {
    const errors: string[] = [];
    let assignmentsCreated = 0;
    let staffingRequestsCreated = 0;

    // Create assignments for dispatches
    for (const d of request.dispatches) {
      try {
        await this.prisma.projectAssignment.create({
          data: {
            personId: d.personId,
            projectId: d.projectId,
            staffingRole: d.staffingRole,
            allocationPercent: d.allocationPercent,
            validFrom: new Date(d.startDate),
            status: 'PROPOSED',
            requestedAt: new Date(),
            notes: d.note ?? null,
          },
        });
        assignmentsCreated++;
      } catch (e: unknown) {
        errors.push(`Assignment for ${d.personId}: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    }

    // Create staffing requests for hires
    for (const h of request.hireRequests) {
      try {
        await this.prisma.staffingRequest.create({
          data: {
            projectId: h.projectId,
            requestedByPersonId: request.actorId,
            role: h.role,
            skills: h.skills,
            allocationPercent: h.allocationPercent,
            headcountRequired: h.headcount,
            priority: h.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
            startDate: new Date(h.startDate),
            endDate: new Date(h.endDate),
            status: 'OPEN',
          },
        });
        staffingRequestsCreated++;
      } catch (e: unknown) {
        errors.push(`Staffing request for ${h.role}: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    }

    // Apply extensions
    let extensionsUpdated = 0;
    for (const ext of request.extensions ?? []) {
      try {
        const existing = await this.prisma.projectAssignment.findUnique({
          where: { id: ext.assignmentId },
          select: { id: true, notes: true },
        });
        if (!existing) {
          errors.push(`Extension: assignment ${ext.assignmentId} not found`);
          continue;
        }
        const mergedNote = [existing.notes, ext.note].filter(Boolean).join('\n');
        await this.prisma.projectAssignment.update({
          where: { id: ext.assignmentId },
          data: {
            validTo: new Date(ext.newValidTo),
            notes: mergedNote.trim().length > 0 ? mergedNote : null,
          },
        });
        extensionsUpdated++;
      } catch (e: unknown) {
        errors.push(`Extension ${ext.assignmentId}: ${e instanceof Error ? e.message : 'unknown error'}`);
      }
    }

    return {
      assignmentsCreated,
      staffingRequestsCreated,
      releasesNoted: request.releases.length,
      extensionsUpdated,
      errors,
    };
  }

  /* ── Extension validation ── */

  public async validateExtension(request: ExtensionValidateRequestDto): Promise<ExtensionValidateResponseDto> {
    const assignment = await this.prisma.projectAssignment.findUnique({
      where: { id: request.assignmentId },
      select: {
        id: true, personId: true, projectId: true, validFrom: true, validTo: true, allocationPercent: true, status: true,
        person: { select: { id: true, displayName: true, employmentStatus: true, terminatedAt: true } },
        project: { select: { id: true, name: true, endsOn: true } },
      },
    });

    if (!assignment) {
      throw new Error(`Assignment ${request.assignmentId} not found`);
    }

    const currentValidToDate = assignment.validTo ?? assignment.validFrom;
    const newValidToDate = new Date(request.newValidTo);
    const conflicts: ExtensionConflict[] = [];

    // Hard: person employment not active
    if (assignment.person.employmentStatus !== 'ACTIVE') {
      conflicts.push({
        kind: 'employment-inactive',
        severity: 'danger',
        blocking: true,
        message: `${assignment.person.displayName} is ${assignment.person.employmentStatus.toLowerCase()} — cannot extend`,
      });
    }

    // Hard: termination before new validTo
    if (assignment.person.terminatedAt && assignment.person.terminatedAt < newValidToDate) {
      conflicts.push({
        kind: 'termination-conflict',
        severity: 'danger',
        blocking: true,
        message: `${assignment.person.displayName} terminates ${assignment.person.terminatedAt.toISOString().slice(0, 10)} — before proposed end`,
      });
    }

    // Hard: project closes before new validTo
    if (assignment.project.endsOn && assignment.project.endsOn < newValidToDate) {
      conflicts.push({
        kind: 'project-end-overrun',
        severity: 'danger',
        blocking: true,
        message: `Project ${assignment.project.name} closes ${assignment.project.endsOn.toISOString().slice(0, 10)} — before proposed end`,
      });
    }

    // Anomaly (non-blocking): approved leave overlap
    if (newValidToDate > currentValidToDate) {
      const overlappingLeaves = await this.prisma.leaveRequest.findMany({
        where: {
          personId: assignment.person.id,
          status: 'APPROVED',
          startDate: { lte: newValidToDate },
          endDate: { gte: currentValidToDate },
        },
        select: { startDate: true, endDate: true, type: true },
        orderBy: { startDate: 'asc' },
      });
      for (const lv of overlappingLeaves) {
        conflicts.push({
          kind: 'leave-overlap',
          severity: 'warning',
          blocking: false,
          message: `${lv.type} leave ${lv.startDate.toISOString().slice(0, 10)} → ${lv.endDate.toISOString().slice(0, 10)} overlaps extension window`,
        });
      }

      // Anomaly (non-blocking): over-allocation on any day in the extension window
      const allocShare = assignment.allocationPercent?.toNumber() ?? 0;
      if (allocShare > 0) {
        const others = await this.prisma.projectAssignment.findMany({
          where: {
            personId: assignment.person.id,
            id: { not: assignment.id },
            status: { in: ['CREATED', 'PROPOSED', 'BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
            validFrom: { lte: newValidToDate },
            OR: [{ validTo: { gte: currentValidToDate } }, { validTo: null }],
          },
          select: { allocationPercent: true, validFrom: true, validTo: true, project: { select: { name: true } } },
        });
        for (const o of others) {
          const oAlloc = o.allocationPercent?.toNumber() ?? 0;
          if (oAlloc + allocShare > 100) {
            conflicts.push({
              kind: 'over-allocation',
              severity: 'warning',
              blocking: false,
              message: `${o.project.name} holds ${oAlloc}% in overlap — extension would push total to ${oAlloc + allocShare}%`,
            });
          }
        }
      }
    }

    const hasBlocking = conflicts.some((c) => c.blocking);

    return {
      assignmentId: assignment.id,
      personId: assignment.person.id,
      personName: assignment.person.displayName,
      projectId: assignment.project.id,
      projectName: assignment.project.name,
      currentValidTo: assignment.validTo ? assignment.validTo.toISOString().slice(0, 10) : null,
      newValidTo: request.newValidTo,
      valid: !hasBlocking,
      conflicts,
    };
  }

  /* ── Why-not: explain why an unmatched demand couldn't be filled ── */

  public async whyNot(request: WhyNotRequestDto): Promise<WhyNotResponseDto> {
    const topN = request.topN ?? 5;

    // Resolve demand from either StaffingRequest or ProjectRolePlan
    const asRequest = await this.prisma.staffingRequest.findUnique({
      where: { id: request.demandId },
      select: {
        id: true, projectId: true, role: true, skills: true, allocationPercent: true, startDate: true, endDate: true,
      },
    });

    let demandRole: string;
    let demandSkills: string[];
    let demandAlloc: number;
    let demandProjectId: string;
    let demandStart: Date;
    let demandEnd: Date;

    if (asRequest) {
      demandRole = asRequest.role;
      demandSkills = asRequest.skills;
      demandAlloc = (asRequest.allocationPercent as unknown as { toNumber(): number }).toNumber();
      demandProjectId = asRequest.projectId;
      demandStart = asRequest.startDate;
      demandEnd = asRequest.endDate;
    } else {
      const asPlan = await this.prisma.projectRolePlan.findUnique({
        where: { id: request.demandId },
        select: {
          id: true, projectId: true, roleName: true, requiredSkillIds: true, allocationPercent: true,
          plannedStartDate: true, plannedEndDate: true,
        },
      });
      if (!asPlan) throw new Error(`Demand ${request.demandId} not found`);

      const skillRows = asPlan.requiredSkillIds.length > 0
        ? await this.prisma.skill.findMany({ where: { id: { in: asPlan.requiredSkillIds } }, select: { id: true, name: true } })
        : [];
      const skillNameById = new Map(skillRows.map((s) => [s.id, s.name]));
      demandRole = asPlan.roleName;
      demandSkills = asPlan.requiredSkillIds.map((id) => skillNameById.get(id) ?? id);
      demandAlloc = asPlan.allocationPercent?.toNumber() ?? 100;
      demandProjectId = asPlan.projectId;
      demandStart = asPlan.plannedStartDate ?? new Date();
      demandEnd = asPlan.plannedEndDate ?? new Date(demandStart.getTime() + 180 * 86400000);
    }

    const demandProject = await this.prisma.project.findUnique({
      where: { id: demandProjectId },
      select: { name: true },
    });
    const demandProjectName = demandProject?.name ?? demandProjectId;

    // Load all people + current allocation + skills + leave
    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: { status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] } },
      select: { personId: true, allocationPercent: true },
    });
    const allocByPerson = new Map<string, number>();
    for (const a of activeAssignments) {
      allocByPerson.set(a.personId, (allocByPerson.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
    }

    const people = await this.prisma.person.findMany({
      select: { id: true, displayName: true, grade: true, employmentStatus: true },
    });

    const personSkillRows = await this.prisma.personSkill.findMany({
      select: { personId: true, proficiency: true, skill: { select: { name: true } } },
    });
    const skillsByPerson = new Map<string, Map<string, number>>();
    for (const ps of personSkillRows) {
      let m = skillsByPerson.get(ps.personId);
      if (!m) { m = new Map(); skillsByPerson.set(ps.personId, m); }
      m.set(ps.skill.name, ps.proficiency);
    }

    const leaves = await this.prisma.leaveRequest.findMany({
      where: { status: 'APPROVED', startDate: { lte: demandEnd }, endDate: { gte: demandStart } },
      select: { personId: true, startDate: true, endDate: true },
    });
    const leavingPersonIds = new Set(leaves.map((l) => l.personId));

    // Rank candidates by weighted closeness score (excluding skill-zero matches for noise)
    interface Scored {
      person: (typeof people)[number];
      skillScore: number;
      matched: string[];
      missing: string[];
      availablePercent: number;
      disqualifiers: WhyNotDisqualifier[];
    }

    const scored: Scored[] = [];
    for (const p of people) {
      const alloc = allocByPerson.get(p.id) ?? 0;
      const available = 100 - alloc;
      const personSkills = skillsByPerson.get(p.id);

      let skillScore = 0;
      const matched: string[] = [];
      const missing: string[] = [];
      if (demandSkills.length > 0) {
        if (personSkills) {
          let total = 0;
          for (const sk of demandSkills) {
            const prof = personSkills.get(sk);
            if (prof !== undefined) { total += prof / 5; matched.push(sk); }
            else missing.push(sk);
          }
          skillScore = total / demandSkills.length;
        } else {
          missing.push(...demandSkills);
        }
      }

      const disqualifiers: WhyNotDisqualifier[] = [];
      if (p.employmentStatus !== 'ACTIVE') disqualifiers.push('inactive');
      if (available < demandAlloc && p.employmentStatus === 'ACTIVE') disqualifiers.push('fully-allocated');
      if (leavingPersonIds.has(p.id)) disqualifiers.push('on-leave');
      if (demandSkills.length > 0 && skillScore < 0.4) disqualifiers.push('missing-skills');

      scored.push({ person: p, skillScore, matched, missing, availablePercent: available, disqualifiers });
    }

    // Rank: closest to qualifying = higher skill score × availability ratio, deprioritize disqualified
    scored.sort((a, b) => {
      const aFit = a.skillScore * Math.min(1, a.availablePercent / Math.max(1, demandAlloc)) - a.disqualifiers.length * 0.1;
      const bFit = b.skillScore * Math.min(1, b.availablePercent / Math.max(1, demandAlloc)) - b.disqualifiers.length * 0.1;
      return bFit - aFit;
    });

    const candidates: WhyNotCandidate[] = scored.slice(0, topN).map((s) => {
      const parts: string[] = [];
      if (s.disqualifiers.length === 0) parts.push('Qualifies but was not reached this pass');
      if (s.disqualifiers.includes('inactive')) parts.push(`${s.person.employmentStatus.toLowerCase()} employment`);
      if (s.disqualifiers.includes('fully-allocated')) parts.push(`only ${s.availablePercent}% free (needs ${demandAlloc}%)`);
      if (s.disqualifiers.includes('on-leave')) parts.push('approved leave overlaps window');
      if (s.disqualifiers.includes('missing-skills') && s.missing.length > 0) parts.push(`missing ${s.missing.slice(0, 3).join(', ')}`);
      return {
        personId: s.person.id,
        personName: s.person.displayName,
        grade: s.person.grade,
        availablePercent: s.availablePercent,
        skillScore: Math.round(s.skillScore * 100) / 100,
        matchedSkills: s.matched,
        missingSkills: s.missing,
        disqualifiers: s.disqualifiers,
        message: parts.join(' · ') || 'Available candidate',
      };
    });

    return {
      demandId: request.demandId,
      demandRole,
      demandSkills,
      demandAllocationPercent: demandAlloc,
      projectName: demandProjectName,
      candidates,
    };
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
}
