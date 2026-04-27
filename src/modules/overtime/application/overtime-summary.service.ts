import { Injectable } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { OvertimeResolverService } from './overtime-resolver.service';
import { OvertimeSummaryResponseDto } from './contracts/overtime.dto';

@Injectable()
export class OvertimeSummaryService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly platformSettings: PlatformSettingsService,
    private readonly resolver: OvertimeResolverService,
  ) {}

  public async execute(query: { asOf?: string; weeks?: number }): Promise<OvertimeSummaryResponseDto> {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const weeksIncluded = Math.min(Math.max(query.weeks ?? 4, 1), 12);
    const settings = await this.platformSettings.getAll();
    const standardHoursPerWeek = settings.timesheets.standardHoursPerWeek;

    // Compute window
    const windowEnd = this.endOfIsoWeek(asOf);
    const windowStart = this.startOfIsoWeek(asOf);
    windowStart.setUTCDate(windowStart.getUTCDate() - (weeksIncluded - 1) * 7);

    // Fetch all timesheet weeks with entries in the window
    const timesheetWeeks = await this.prisma.timesheetWeek.findMany({
      where: {
        weekStart: { gte: windowStart, lte: windowEnd },
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      select: {
        id: true,
        personId: true,
        weekStart: true,
        status: true,
        entries: {
          select: { hours: true, projectId: true },
        },
      },
    });

    // Person lookups
    const personIds = [...new Set(timesheetWeeks.map((tw) => tw.personId))];
    const [people, orgMemberships, poolMemberships] = await Promise.all([
      personIds.length > 0
        ? this.prisma.person.findMany({ where: { id: { in: personIds } }, select: { id: true, displayName: true } })
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
    const personOrgMap = new Map<string, { id: string; name: string }>();
    for (const m of orgMemberships) {
      if (!personOrgMap.has(m.personId)) personOrgMap.set(m.personId, m.orgUnit);
    }
    const personPoolMap = new Map<string, { id: string; name: string }>();
    for (const m of poolMemberships) {
      if (!personPoolMap.has(m.personId)) personPoolMap.set(m.personId, m.resourcePool);
    }

    // Aggregate per person per week
    interface WeekAcc { total: number; byProject: Map<string, number> }
    interface PersonAcc { weekMap: Map<string, WeekAcc>; totalHours: number }
    const personAccMap = new Map<string, PersonAcc>();

    for (const tw of timesheetWeeks) {
      const pid = tw.personId;
      const acc = personAccMap.get(pid) ?? { weekMap: new Map(), totalHours: 0 };
      const weekKey = tw.weekStart.toISOString().slice(0, 10);
      const wk = acc.weekMap.get(weekKey) ?? { total: 0, byProject: new Map() };

      for (const entry of tw.entries) {
        const h = Number(entry.hours);
        wk.total += h;
        acc.totalHours += h;
        wk.byProject.set(entry.projectId, (wk.byProject.get(entry.projectId) ?? 0) + h);
      }
      acc.weekMap.set(weekKey, wk);
      personAccMap.set(pid, acc);
    }

    // Resolve policies and compute overtime per person
    let totalOT = 0;
    let totalStd = 0;
    let peopleWithOT = 0;
    let peopleExceeding = 0;
    const personSummaries: OvertimeSummaryResponseDto['personSummaries'] = [];

    // Per-project OT tracking
    const projectOTMap = new Map<string, { hours: number; contributors: Set<string> }>();

    // Per-dept / per-pool OT tracking
    const deptOTMap = new Map<string, { personIds: Set<string>; otHours: number; exceedCount: number }>();
    const poolOTMap = new Map<string, { personIds: Set<string>; otHours: number; exceedCount: number }>();

    // Exceptions lookup
    const exceptions = await this.prisma.overtimeException.findMany({
      where: { effectiveFrom: { lte: windowEnd }, effectiveTo: { gte: windowStart } },
      select: { personId: true },
    });
    const exceptionPersonIds = new Set(exceptions.map((e) => e.personId));

    for (const [pid, acc] of personAccMap) {
      const policy = await this.resolver.resolve(pid, asOf);
      const person = personMap.get(pid);
      const dept = personOrgMap.get(pid);
      const pool = personPoolMap.get(pid);

      let personOT = 0;
      const weekBreakdown: Array<{ weekStart: string; total: number; standard: number; overtime: number }> = [];

      for (const [weekKey, wk] of acc.weekMap) {
        const std = Math.min(wk.total, standardHoursPerWeek);
        const ot = Math.max(0, wk.total - standardHoursPerWeek);
        personOT += ot;
        weekBreakdown.push({ weekStart: weekKey, total: r2(wk.total), standard: r2(std), overtime: r2(ot) });

        // Track project-level OT: distribute OT proportionally across projects in this week
        if (ot > 0) {
          for (const [projId, projHours] of wk.byProject) {
            const projOTShare = (projHours / wk.total) * ot;
            const projAcc = projectOTMap.get(projId) ?? { hours: 0, contributors: new Set() };
            projAcc.hours += projOTShare;
            projAcc.contributors.add(pid);
            projectOTMap.set(projId, projAcc);
          }
        }
      }

      const personStd = acc.totalHours - personOT;
      totalOT += personOT;
      totalStd += personStd;
      const exceeds = personOT > policy.maxOvertimeHoursPerWeek * weeksIncluded;
      if (personOT > 0) peopleWithOT++;
      if (exceeds) peopleExceeding++;

      // Dept tracking
      if (dept) {
        const d = deptOTMap.get(dept.id) ?? { personIds: new Set(), otHours: 0, exceedCount: 0 };
        d.personIds.add(pid);
        d.otHours += personOT;
        if (exceeds) d.exceedCount++;
        deptOTMap.set(dept.id, d);
      }

      // Pool tracking
      if (pool) {
        const p = poolOTMap.get(pool.id) ?? { personIds: new Set(), otHours: 0, exceedCount: 0 };
        p.personIds.add(pid);
        p.otHours += personOT;
        if (exceeds) p.exceedCount++;
        poolOTMap.set(pool.id, p);
      }

      personSummaries.push({
        personId: pid,
        displayName: person?.displayName ?? pid,
        departmentId: dept?.id ?? null,
        departmentName: dept?.name ?? null,
        poolId: pool?.id ?? null,
        poolName: pool?.name ?? null,
        totalHours: r2(acc.totalHours),
        standardHours: r2(personStd),
        overtimeHours: r2(personOT),
        effectiveThreshold: policy.maxOvertimeHoursPerWeek,
        exceedsThreshold: exceeds,
        hasException: exceptionPersonIds.has(pid),
        weekBreakdown,
      });
    }

    // Build project summaries
    const projectIds = [...projectOTMap.keys()];
    const projectLookups = projectIds.length > 0
      ? await this.prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true, projectCode: true } })
      : [];
    const projectLookupMap = new Map(projectLookups.map((p) => [p.id, p]));

    const projectSummaries = Array.from(projectOTMap.entries()).map(([projId, acc]) => {
      const proj = projectLookupMap.get(projId);
      return {
        projectId: projId,
        projectCode: proj?.projectCode ?? 'UNKNOWN',
        projectName: proj?.name ?? projId,
        overtimeHours: r2(acc.hours),
        contributorCount: acc.contributors.size,
      };
    }).sort((a, b) => b.overtimeHours - a.overtimeHours);

    // Build dept summaries
    const deptPolicies = await this.prisma.overtimePolicy.findMany({
      where: { orgUnitId: { not: null }, approvalStatus: 'ACTIVE', effectiveTo: null },
      select: { orgUnitId: true, maxOvertimeHoursPerWeek: true },
    });
    const deptPolicyMap = new Map(deptPolicies.map((p) => [p.orgUnitId!, p.maxOvertimeHoursPerWeek]));

    const departmentSummaries = Array.from(deptOTMap.entries()).map(([deptId, acc]) => {
      const dept = personOrgMap.get([...acc.personIds][0]);
      return {
        orgUnitId: deptId,
        orgUnitName: dept?.name ?? deptId,
        personCount: acc.personIds.size,
        totalOvertimeHours: r2(acc.otHours),
        overtimeRate: totalStd > 0 ? r2((acc.otHours / (acc.otHours + totalStd)) * 100) : 0,
        policyMaxHours: deptPolicyMap.get(deptId) ?? null,
        exceedingPolicyCount: acc.exceedCount,
      };
    }).sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours);

    // Build pool summaries
    const poolPolicies = await this.prisma.overtimePolicy.findMany({
      where: { resourcePoolId: { not: null }, approvalStatus: 'ACTIVE', effectiveTo: null },
      select: { resourcePoolId: true, maxOvertimeHoursPerWeek: true },
    });
    const poolPolicyMap = new Map(poolPolicies.map((p) => [p.resourcePoolId!, p.maxOvertimeHoursPerWeek]));

    const poolSummaries = Array.from(poolOTMap.entries()).map(([poolId, acc]) => {
      const pool = personPoolMap.get([...acc.personIds][0]);
      return {
        poolId,
        poolName: pool?.name ?? poolId,
        personCount: acc.personIds.size,
        totalOvertimeHours: r2(acc.otHours),
        overtimeRate: totalStd > 0 ? r2((acc.otHours / (acc.otHours + totalStd)) * 100) : 0,
        policyMaxHours: poolPolicyMap.get(poolId) ?? null,
        exceedingPolicyCount: acc.exceedCount,
      };
    }).sort((a, b) => b.totalOvertimeHours - a.totalOvertimeHours);

    // Pending exceptions (open cases)
    const pendingCases = await this.prisma.caseRecord.findMany({
      where: {
        caseType: { key: 'OVERTIME_EXCEPTION' },
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        subjectPersonId: true,
        subjectPerson: { select: { displayName: true } },
        payload: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingExceptions = pendingCases.map((c) => {
      const payload = c.payload as Record<string, unknown> | null;
      return {
        caseId: c.id,
        personId: c.subjectPersonId,
        personName: c.subjectPerson.displayName,
        requestedMaxHours: (payload?.maxOvertimeHoursPerWeek as number) ?? 0,
        reason: (payload?.reason as string) ?? '',
        requestedAt: c.createdAt.toISOString(),
      };
    });

    return {
      weekStart: windowStart.toISOString(),
      weekEnd: windowEnd.toISOString(),
      weeksIncluded,
      totalOvertimeHours: r2(totalOT),
      totalStandardHours: r2(totalStd),
      overtimeRate: totalStd > 0 ? r2((totalOT / totalStd) * 100) : 0,
      peopleWithOvertime: peopleWithOT,
      peopleExceedingCap: peopleExceeding,
      personSummaries: personSummaries.sort((a, b) => b.overtimeHours - a.overtimeHours),
      projectSummaries,
      departmentSummaries,
      poolSummaries,
      pendingExceptions,
    };
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
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
