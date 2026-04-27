import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';

interface PlannedVsActualQuery {
  asOf?: string;
  personId?: string;
  projectId?: string;
  weeks?: number;
}

interface PersonSummary {
  displayName: string;
  id: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  projectCode: string;
}

@Injectable()
export class PlannedVsActualQueryService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  public async execute(query: PlannedVsActualQuery) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Planned vs actual asOf is invalid.');
    }

    const weeksIncluded = Math.min(Math.max(query.weeks ?? 4, 1), 12);
    const windowEnd = this.endOfIsoWeek(asOf);
    const windowStart = this.startOfIsoWeek(asOf);
    windowStart.setUTCDate(windowStart.getUTCDate() - (weeksIncluded - 1) * 7);

    // Read standard hours from platform settings
    const settings = await this.platformSettingsService.getAll();
    const standardHoursPerWeek = settings.timesheets.standardHoursPerWeek;

    // ── Fetch assignments ──
    const assignmentWhere: Record<string, unknown> = {
      status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
      validFrom: { lte: windowEnd },
      OR: [{ validTo: null }, { validTo: { gte: windowStart } }],
    };
    if (query.projectId) assignmentWhere.projectId = query.projectId;
    if (query.personId) assignmentWhere.personId = query.personId;

    const dbAssignments = await this.prisma.projectAssignment.findMany({
      where: assignmentWhere,
      select: {
        id: true,
        personId: true,
        projectId: true,
        staffingRole: true,
        status: true,
        allocationPercent: true,
        validFrom: true,
        validTo: true,
        person: { select: { id: true, displayName: true } },
        project: { select: { id: true, name: true, projectCode: true } },
      },
    });

    // ── Fetch ALL timesheet entries (not just APPROVED) ──
    const entryWhere: Record<string, unknown> = {
      date: { gte: windowStart, lte: windowEnd },
    };
    if (query.projectId) entryWhere.projectId = query.projectId;
    if (query.personId) {
      entryWhere.timesheetWeek = { personId: query.personId };
    }

    const dbEntries = await this.prisma.timesheetEntry.findMany({
      where: entryWhere,
      select: {
        id: true,
        assignmentId: true,
        projectId: true,
        date: true,
        hours: true,
        timesheetWeek: {
          select: {
            personId: true,
            status: true,
            weekStart: true,
          },
        },
      },
    });

    // ── Lookup maps ──
    const personIds = [...new Set([
      ...dbAssignments.map((a) => a.personId),
      ...dbEntries.map((e) => e.timesheetWeek.personId),
    ])];
    const projectIds = [...new Set([
      ...dbAssignments.map((a) => a.projectId),
      ...dbEntries.map((e) => e.projectId),
    ])];

    const [people, projects, orgMemberships, poolMemberships] = await Promise.all([
      personIds.length > 0
        ? this.prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, displayName: true } })
        : Promise.resolve([]),
      projectIds.length > 0
        ? this.prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, projectCode: true } })
        : Promise.resolve([]),
      personIds.length > 0
        ? this.prisma.personOrgMembership.findMany({
            where: { personId: { in: personIds }, archivedAt: null },
            select: { personId: true, orgUnit: { select: { id: true, name: true } } },
            orderBy: { validFrom: 'desc' },
          })
        : Promise.resolve([]),
      personIds.length > 0
        ? this.prisma.personResourcePoolMembership.findMany({
            where: { personId: { in: personIds }, archivedAt: null },
            select: { personId: true, resourcePool: { select: { id: true, name: true } } },
            orderBy: { validFrom: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const personMap = new Map(people.map((p) => [p.id, p]));
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Person → org unit (take most recent non-archived)
    const personOrgMap = new Map<string, { id: string; name: string }>();
    for (const m of orgMemberships) {
      if (!personOrgMap.has(m.personId)) personOrgMap.set(m.personId, m.orgUnit);
    }

    // Person → resource pool (take most recent non-archived)
    const personPoolMap = new Map<string, { id: string; name: string }>();
    for (const m of poolMemberships) {
      if (!personPoolMap.has(m.personId)) personPoolMap.set(m.personId, m.resourcePool);
    }

    // ── Cross-reference assignments × entries ──
    const assignmentByKey = new Map(
      dbAssignments.map((a) => [`${a.personId}:${a.projectId}`, a]),
    );

    // Group entries by person:project, but also track status breakdown
    interface ActualGroup {
      assignmentId: string | null;
      entryIds: string[];
      effortHours: number;
      approvedHours: number;
      submittedHours: number;
      draftHours: number;
      rejectedHours: number;
      latestDate: Date;
      personId: string;
      projectId: string;
    }

    const actualsByKey = new Map<string, ActualGroup>();

    for (const entry of dbEntries) {
      const personId = entry.timesheetWeek.personId;
      const key = `${personId}:${entry.projectId}`;
      const hours = Number(entry.hours ?? 0);
      const status = entry.timesheetWeek.status;

      const current = actualsByKey.get(key) ?? {
        assignmentId: entry.assignmentId ?? null,
        entryIds: [],
        effortHours: 0,
        approvedHours: 0,
        submittedHours: 0,
        draftHours: 0,
        rejectedHours: 0,
        latestDate: entry.date,
        personId,
        projectId: entry.projectId,
      };
      current.assignmentId = current.assignmentId ?? entry.assignmentId ?? null;
      current.entryIds.push(entry.id);
      current.effortHours += hours;
      if (status === 'APPROVED') current.approvedHours += hours;
      else if (status === 'SUBMITTED') current.submittedHours += hours;
      else if (status === 'DRAFT') current.draftHours += hours;
      else if (status === 'REJECTED') current.rejectedHours += hours;
      if (entry.date > current.latestDate) current.latestDate = entry.date;
      actualsByKey.set(key, current);
    }

    const actualKeys = new Set(actualsByKey.keys());

    // ── Matched records (approved time with matching assignment) ──
    const matchedRecords = Array.from(actualsByKey.values())
      .filter((actual) => actual.approvedHours > 0)
      .map((actual) => {
        const assignment = assignmentByKey.get(`${actual.personId}:${actual.projectId}`);
        if (!assignment) return null;
        return {
          allocationPercent: Number(assignment.allocationPercent ?? 0),
          assignmentId: assignment.id,
          effortHours: Number(actual.approvedHours.toFixed(2)),
          person: this.toPersonSummary(personMap.get(actual.personId) ?? null, actual.personId),
          project: this.toProjectSummary(projectMap.get(actual.projectId) ?? null, actual.projectId),
          staffingRole: assignment.staffingRole,
          workEvidenceId: actual.entryIds.join(','),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // ── Assigned but no evidence (any status) ──
    const assignedButNoEvidence = dbAssignments
      .filter((a) => !actualKeys.has(`${a.personId}:${a.projectId}`))
      .map((a) => ({
        allocationPercent: Number(a.allocationPercent ?? 0),
        assignmentId: a.id,
        person: this.toPersonSummary(a.person, a.personId),
        project: this.toProjectSummary(a.project, a.projectId),
        staffingRole: a.staffingRole,
      }));

    // ── Evidence without approved assignment ──
    const evidenceButNoApprovedAssignment = Array.from(actualsByKey.values())
      .filter((actual) => !assignmentByKey.has(`${actual.personId}:${actual.projectId}`))
      .map((actual) => ({
        activityDate: actual.latestDate.toISOString(),
        effortHours: Number(actual.effortHours.toFixed(2)),
        person: this.toPersonSummary(personMap.get(actual.personId) ?? null, actual.personId),
        project: this.toProjectSummary(projectMap.get(actual.projectId) ?? null, actual.projectId),
        sourceType: 'TIMESHEET',
        workEvidenceId: actual.entryIds.join(','),
      }));

    // ── Anomalies ──
    const anomalies = [
      ...Array.from(actualsByKey.values())
        .filter((actual) => {
          const assignment = assignmentByKey.get(`${actual.personId}:${actual.projectId}`);
          return Boolean(assignment && assignment.validTo && actual.latestDate > assignment.validTo);
        })
        .map((actual) => ({
          message: 'Approved time exists after the assignment end date.',
          person: this.toPersonSummary(personMap.get(actual.personId) ?? null, actual.personId),
          project: this.toProjectSummary(projectMap.get(actual.projectId) ?? null, actual.projectId),
          type: 'EVIDENCE_AFTER_ASSIGNMENT_END',
        })),
      ...evidenceButNoApprovedAssignment.map((item) => ({
        message: 'Approved time exists without an approved assignment match.',
        person: item.person,
        project: item.project,
        type: 'EVIDENCE_WITHOUT_APPROVED_ASSIGNMENT',
      })),
    ];

    // ── Timesheet status summary ──
    const entryPersonIds = new Set(dbEntries.map((e) => e.timesheetWeek.personId));
    const assignedPersonIds = new Set(dbAssignments.map((a) => a.personId));

    // Missing: assigned people with NO timesheet entries at all for the window
    // (Draft people have entries, so they won't be in this set)
    const missingPersonIds = [...assignedPersonIds].filter((pid) => !entryPersonIds.has(pid));

    let totalApproved = 0;
    let totalSubmitted = 0;
    let totalDraft = 0;
    let totalRejected = 0;
    for (const actual of actualsByKey.values()) {
      totalApproved += actual.approvedHours;
      totalSubmitted += actual.submittedHours;
      totalDraft += actual.draftHours;
      totalRejected += actual.rejectedHours;
    }

    const timesheetStatusSummary = {
      totalHours: round2(totalApproved + totalSubmitted + totalDraft + totalRejected),
      approvedHours: round2(totalApproved),
      submittedHours: round2(totalSubmitted),
      draftHours: round2(totalDraft),
      rejectedHours: round2(totalRejected),
      personCount: entryPersonIds.size,
      missingPersonCount: missingPersonIds.length,
      missingPersonIds,
    };

    // ── Per-project summary ──
    interface ProjectAcc {
      projectId: string; projectCode: string; projectName: string;
      plannedHours: number; approvedHours: number; submittedHours: number; draftHours: number;
      assignmentCount: number;
    }
    const projectAccMap = new Map<string, ProjectAcc>();

    for (const a of dbAssignments) {
      const proj = projectMap.get(a.projectId);
      const acc = projectAccMap.get(a.projectId) ?? {
        projectId: a.projectId,
        projectCode: proj?.projectCode ?? 'UNKNOWN',
        projectName: proj?.name ?? a.projectId,
        plannedHours: 0, approvedHours: 0, submittedHours: 0, draftHours: 0,
        assignmentCount: 0,
      };
      // Planned hours = allocation% × standard hours × weeks the assignment overlaps the window
      const overlapWeeks = this.countOverlapWeeks(a.validFrom, a.validTo, windowStart, windowEnd);
      acc.plannedHours += (Number(a.allocationPercent ?? 0) / 100) * standardHoursPerWeek * overlapWeeks;
      acc.assignmentCount++;
      projectAccMap.set(a.projectId, acc);
    }

    for (const actual of actualsByKey.values()) {
      const proj = projectMap.get(actual.projectId);
      const acc = projectAccMap.get(actual.projectId) ?? {
        projectId: actual.projectId,
        projectCode: proj?.projectCode ?? 'UNKNOWN',
        projectName: proj?.name ?? actual.projectId,
        plannedHours: 0, approvedHours: 0, submittedHours: 0, draftHours: 0,
        assignmentCount: 0,
      };
      acc.approvedHours += actual.approvedHours;
      acc.submittedHours += actual.submittedHours;
      acc.draftHours += actual.draftHours;
      projectAccMap.set(actual.projectId, acc);
    }

    // ── Staffing requests ──
    const staffingRequests = await this.prisma.staffingRequest.findMany({
      where: {
        status: { in: ['OPEN', 'IN_REVIEW'] },
        startDate: { lte: windowEnd },
        endDate: { gte: windowStart },
        ...(query.projectId ? { projectId: query.projectId } : {}),
      },
      select: {
        projectId: true,
        role: true,
        headcountRequired: true,
        headcountFulfilled: true,
      },
    });

    // Per-project staffing aggregation
    const staffingByProject = new Map<string, { openRequests: number; unfilledHeadcount: number; roles: string[] }>();
    for (const sr of staffingRequests) {
      const acc = staffingByProject.get(sr.projectId) ?? { openRequests: 0, unfilledHeadcount: 0, roles: [] };
      acc.openRequests++;
      acc.unfilledHeadcount += Math.max(0, sr.headcountRequired - sr.headcountFulfilled);
      if (!acc.roles.includes(sr.role)) acc.roles.push(sr.role);
      staffingByProject.set(sr.projectId, acc);
    }

    // Build project summaries
    const projectSummaries = Array.from(projectAccMap.values()).map((acc) => {
      const staffing = staffingByProject.get(acc.projectId);
      const totalActualHours = round2(acc.approvedHours + acc.submittedHours + acc.draftHours);
      const planned = round2(acc.plannedHours);
      const variance = round2(totalActualHours - planned);
      const variancePercent = planned > 0 ? round2((variance / planned) * 100) : 0;
      return {
        projectId: acc.projectId,
        projectCode: acc.projectCode,
        projectName: acc.projectName,
        plannedHours: planned,
        approvedHours: round2(acc.approvedHours),
        submittedHours: round2(acc.submittedHours),
        draftHours: round2(acc.draftHours),
        totalActualHours,
        assignmentCount: acc.assignmentCount,
        openStaffingRequests: staffing?.openRequests ?? 0,
        unfilledHeadcount: staffing?.unfilledHeadcount ?? 0,
        variance,
        variancePercent,
        overSubmitted: totalActualHours > planned && planned > 0,
      };
    });

    // ── Staffing coverage summary ──
    // Also include projects that have open staffing requests but no assignments in the window
    const allProjectIdsWithRequests = [...staffingByProject.keys()];
    for (const pid of allProjectIdsWithRequests) {
      if (!projectAccMap.has(pid)) {
        const proj = await this.prisma.project.findUnique({ where: { id: pid }, select: { id: true, name: true, projectCode: true } });
        if (proj) {
          const staffing = staffingByProject.get(pid)!;
          projectSummaries.push({
            projectId: pid,
            projectCode: proj.projectCode,
            projectName: proj.name,
            plannedHours: 0, approvedHours: 0, submittedHours: 0, draftHours: 0,
            totalActualHours: 0, assignmentCount: 0,
            openStaffingRequests: staffing.openRequests,
            unfilledHeadcount: staffing.unfilledHeadcount,
            variance: 0, variancePercent: 0, overSubmitted: false,
          });
        }
      }
    }

    const unstaffedProjects = projectSummaries
      .filter((p) => p.unfilledHeadcount > 0 || p.openStaffingRequests > 0)
      .map((p) => ({
        projectId: p.projectId,
        projectCode: p.projectCode,
        projectName: p.projectName,
        openRequests: p.openStaffingRequests,
        unfilledHeadcount: p.unfilledHeadcount,
        roles: staffingByProject.get(p.projectId)?.roles ?? [],
      }));

    const projectsWithAssignments = projectSummaries.filter((p) => p.assignmentCount > 0);
    const staffingCoverage = {
      projectsFullyStaffed: projectsWithAssignments.filter((p) => p.unfilledHeadcount === 0 && p.openStaffingRequests === 0).length,
      projectsPartiallyStaffed: projectsWithAssignments.filter((p) => p.unfilledHeadcount > 0).length,
      projectsWithOpenRequests: projectSummaries.filter((p) => p.openStaffingRequests > 0).length,
      totalOpenRequests: staffingRequests.length,
      totalUnfilledHeadcount: staffingRequests.reduce((sum, sr) => sum + Math.max(0, sr.headcountRequired - sr.headcountFulfilled), 0),
      unstaffedProjects,
    };

    // ── Per-org-unit summary ──
    interface OrgAcc { orgUnitId: string; orgUnitName: string; personIds: Set<string>; plannedHours: number; approvedHours: number; submittedHours: number; draftHours: number }
    const orgAccMap = new Map<string, OrgAcc>();

    for (const a of dbAssignments) {
      const org = personOrgMap.get(a.personId);
      const orgId = org?.id ?? 'unassigned';
      const orgName = org?.name ?? 'Unassigned';
      const acc = orgAccMap.get(orgId) ?? { orgUnitId: orgId, orgUnitName: orgName, personIds: new Set(), plannedHours: 0, approvedHours: 0, submittedHours: 0, draftHours: 0 };
      acc.personIds.add(a.personId);
      const overlapWeeks = this.countOverlapWeeks(a.validFrom, a.validTo, windowStart, windowEnd);
      acc.plannedHours += (Number(a.allocationPercent ?? 0) / 100) * standardHoursPerWeek * overlapWeeks;
      orgAccMap.set(orgId, acc);
    }

    for (const actual of actualsByKey.values()) {
      const org = personOrgMap.get(actual.personId);
      const orgId = org?.id ?? 'unassigned';
      const orgName = org?.name ?? 'Unassigned';
      const acc = orgAccMap.get(orgId) ?? { orgUnitId: orgId, orgUnitName: orgName, personIds: new Set(), plannedHours: 0, approvedHours: 0, submittedHours: 0, draftHours: 0 };
      acc.personIds.add(actual.personId);
      acc.approvedHours += actual.approvedHours;
      acc.submittedHours += actual.submittedHours;
      acc.draftHours += actual.draftHours;
      orgAccMap.set(orgId, acc);
    }

    const orgUnitSummaries = Array.from(orgAccMap.values()).map((acc) => {
      const planned = round2(acc.plannedHours);
      const committed = round2(acc.submittedHours + acc.approvedHours);
      return {
        orgUnitId: acc.orgUnitId,
        orgUnitName: acc.orgUnitName,
        personCount: acc.personIds.size,
        plannedHours: planned,
        submittedHours: round2(acc.submittedHours),
        approvedHours: round2(acc.approvedHours),
        draftHours: round2(acc.draftHours),
        submissionRate: planned > 0 ? round2((committed / planned) * 100) : 0,
        variance: round2(committed - planned),
      };
    });

    // ── Per-resource-pool summary ──
    interface PoolAcc { poolId: string; poolName: string; personIds: Set<string>; plannedHours: number; approvedHours: number; submittedHours: number; draftHours: number }
    const poolAccMap = new Map<string, PoolAcc>();

    for (const a of dbAssignments) {
      const pool = personPoolMap.get(a.personId);
      const poolId = pool?.id ?? 'unassigned';
      const poolName = pool?.name ?? 'Unassigned';
      const acc = poolAccMap.get(poolId) ?? { poolId, poolName, personIds: new Set(), plannedHours: 0, approvedHours: 0, submittedHours: 0, draftHours: 0 };
      acc.personIds.add(a.personId);
      const overlapWeeks = this.countOverlapWeeks(a.validFrom, a.validTo, windowStart, windowEnd);
      acc.plannedHours += (Number(a.allocationPercent ?? 0) / 100) * standardHoursPerWeek * overlapWeeks;
      poolAccMap.set(poolId, acc);
    }

    for (const actual of actualsByKey.values()) {
      const pool = personPoolMap.get(actual.personId);
      const poolId = pool?.id ?? 'unassigned';
      const poolName = pool?.name ?? 'Unassigned';
      const acc = poolAccMap.get(poolId) ?? { poolId, poolName, personIds: new Set(), plannedHours: 0, approvedHours: 0, submittedHours: 0, draftHours: 0 };
      acc.personIds.add(actual.personId);
      acc.approvedHours += actual.approvedHours;
      acc.submittedHours += actual.submittedHours;
      acc.draftHours += actual.draftHours;
      poolAccMap.set(poolId, acc);
    }

    const resourcePoolSummaries = Array.from(poolAccMap.values()).map((acc) => {
      const planned = round2(acc.plannedHours);
      const committed = round2(acc.submittedHours + acc.approvedHours);
      return {
        poolId: acc.poolId,
        poolName: acc.poolName,
        personCount: acc.personIds.size,
        plannedHours: planned,
        submittedHours: round2(acc.submittedHours),
        approvedHours: round2(acc.approvedHours),
        draftHours: round2(acc.draftHours),
        submissionRate: planned > 0 ? round2((committed / planned) * 100) : 0,
        variance: round2(committed - planned),
      };
    });

    return {
      asOf: asOf.toISOString(),
      weekStart: windowStart.toISOString(),
      weekEnd: windowEnd.toISOString(),
      weeksIncluded,
      anomalies,
      assignedButNoEvidence,
      evidenceButNoApprovedAssignment,
      matchedRecords,
      timesheetStatusSummary,
      projectSummaries,
      orgUnitSummaries,
      resourcePoolSummaries,
      staffingCoverage,
    };
  }

  /** Count how many ISO weeks an assignment overlaps with the query window. */
  private countOverlapWeeks(validFrom: Date, validTo: Date | null, windowStart: Date, windowEnd: Date): number {
    const effectiveStart = validFrom > windowStart ? validFrom : windowStart;
    const effectiveEnd = validTo && validTo < windowEnd ? validTo : windowEnd;
    if (effectiveStart > effectiveEnd) return 0;
    const days = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, Math.ceil(days / 7));
  }

  private startOfIsoWeek(date: Date): Date {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = start.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setUTCDate(start.getUTCDate() + diff);
    start.setUTCHours(0, 0, 0, 0);
    return start;
  }

  private endOfIsoWeek(date: Date): Date {
    const end = this.startOfIsoWeek(date);
    end.setUTCDate(end.getUTCDate() + 6);
    end.setUTCHours(23, 59, 59, 999);
    return end;
  }

  private toPersonSummary(person: { id: string; displayName: string } | null, fallbackId: string | null): PersonSummary {
    if (person) return { displayName: person.displayName, id: person.id };
    return { displayName: fallbackId ?? 'Unknown', id: fallbackId ?? '' };
  }

  private toProjectSummary(project: { id: string; name: string; projectCode: string } | null, fallbackId: string | null): ProjectSummary {
    if (project) return { id: project.id, name: project.name, projectCode: project.projectCode };
    return { id: fallbackId ?? '', name: fallbackId ?? 'Unknown', projectCode: 'UNKNOWN' };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
