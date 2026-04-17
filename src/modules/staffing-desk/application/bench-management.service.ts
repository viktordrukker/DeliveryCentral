import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

/* ── Response types ── */

export interface BenchKpis {
  benchCount: number;
  benchRate: number;
  avgDaysOnBench: number;
  atRiskCount: number;
  totalPeople: number;
  longestBenchDays: number;
}

export interface BenchAgingBucket {
  label: string;
  count: number;
  people: Array<{ personId: string; displayName: string; daysOnBench: number }>;
}

export interface BenchRollOff {
  personId: string;
  displayName: string;
  grade: string | null;
  skills: string[];
  assignmentEndDate: string;
  projectName: string;
  allocationPercent: number;
  daysUntilRollOff: number;
  hasFollowOn: boolean;
}

export interface BenchPersonDto {
  personId: string;
  displayName: string;
  grade: string | null;
  role: string | null;
  skills: Array<{ name: string; proficiency: number }>;
  poolName: string | null;
  orgUnitName: string | null;
  managerName: string | null;
  availablePercent: number;
  benchStartDate: string;
  daysOnBench: number;
  lastProjectName: string | null;
  lastProjectEndDate: string | null;
  bestMatchRequestId: string | null;
  bestMatchScore: number | null;
  bestMatchRole: string | null;
}

export interface BenchDistribution {
  byGrade: Array<{ label: string; count: number }>;
  bySkill: Array<{ label: string; count: number }>;
  byPool: Array<{ label: string; count: number }>;
  byOrgUnit: Array<{ label: string; count: number }>;
}

export interface BenchTrendWeek {
  week: string;
  benchCount: number;
  benchRate: number;
}

export interface BenchDashboardResponseDto {
  kpis: BenchKpis;
  agingBuckets: BenchAgingBucket[];
  rollOffs: BenchRollOff[];
  benchPeople: BenchPersonDto[];
  distribution: BenchDistribution;
  trend: BenchTrendWeek[];
}

/* ── Service ── */

@Injectable()
export class BenchManagementService {
  public constructor(private readonly prisma: PrismaService) {}

  public async getDashboard(params: {
    poolId?: string;
    orgUnitId?: string;
    weeks?: number;
  }): Promise<BenchDashboardResponseDto> {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 10);
    const weeksAhead = params.weeks ?? 12;

    // Resolve person scope
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
      const orgIds = new Set(m.map((x: { personId: string }) => x.personId));
      personScope = personScope ? new Set([...personScope].filter((id) => orgIds.has(id))) : orgIds;
    }

    // All active people
    const peopleWhere: Record<string, unknown> = { employmentStatus: 'ACTIVE' };
    if (personScope) peopleWhere.id = { in: [...personScope] };
    const allPeople = await this.prisma.person.findMany({
      where: peopleWhere,
      select: { id: true, displayName: true, grade: true, role: true, hiredAt: true, createdAt: true },
    });
    const totalPeople = allPeople.length;

    // Current allocations
    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        status: { in: ['APPROVED', 'ACTIVE'] },
        ...(personScope ? { personId: { in: [...personScope] } } : {}),
      },
      select: { personId: true, projectId: true, allocationPercent: true, validFrom: true, validTo: true },
    });
    const allocByPerson = new Map<string, number>();
    for (const a of activeAssignments) {
      allocByPerson.set(a.personId, (allocByPerson.get(a.personId) ?? 0) + (a.allocationPercent?.toNumber() ?? 0));
    }

    // Bench people: allocation === 0
    const benchPersonIds = allPeople.filter((p) => (allocByPerson.get(p.id) ?? 0) === 0).map((p) => p.id);

    // Bench start date: MAX(validTo) from ended assignments
    const endedAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId: { in: benchPersonIds },
        status: { in: ['ENDED', 'ARCHIVED', 'APPROVED', 'ACTIVE'] },
        validTo: { not: null, lt: now },
      },
      select: { personId: true, validTo: true, projectId: true },
      orderBy: { validTo: 'desc' },
    });
    const lastAssignment = new Map<string, { validTo: Date; projectId: string }>();
    for (const a of endedAssignments) {
      if (!lastAssignment.has(a.personId) && a.validTo) {
        lastAssignment.set(a.personId, { validTo: a.validTo, projectId: a.projectId });
      }
    }

    // Lookups: skills, pools, org units, managers, project names
    const [personSkills, poolMemberships, orgMemberships, reportingLines, projects] = await Promise.all([
      this.prisma.personSkill.findMany({
        where: { personId: { in: benchPersonIds } },
        select: { personId: true, proficiency: true, skill: { select: { name: true } } },
      }),
      this.prisma.personResourcePoolMembership.findMany({
        where: { personId: { in: benchPersonIds } },
        select: { personId: true, resourcePool: { select: { name: true } } },
      }),
      this.prisma.personOrgMembership.findMany({
        where: { personId: { in: benchPersonIds } },
        select: { personId: true, orgUnit: { select: { name: true } } },
      }),
      this.prisma.reportingLine.findMany({
        where: { subjectPersonId: { in: benchPersonIds }, relationshipType: 'SOLID_LINE' },
        select: { subjectPersonId: true, manager: { select: { displayName: true } } },
      }),
      this.prisma.project.findMany({ select: { id: true, name: true } }),
    ]);

    const skillsByPerson = new Map<string, Array<{ name: string; proficiency: number }>>();
    for (const ps of personSkills) {
      const arr = skillsByPerson.get(ps.personId) ?? [];
      arr.push({ name: ps.skill.name, proficiency: ps.proficiency });
      skillsByPerson.set(ps.personId, arr);
    }
    const poolByPerson = new Map<string, string>();
    for (const pm of poolMemberships) { if (!poolByPerson.has(pm.personId)) poolByPerson.set(pm.personId, pm.resourcePool.name); }
    const orgByPerson = new Map<string, string>();
    for (const om of orgMemberships) { if (!orgByPerson.has(om.personId)) orgByPerson.set(om.personId, om.orgUnit.name); }
    const managerByPerson = new Map<string, string>();
    for (const rl of reportingLines) { if (!managerByPerson.has(rl.subjectPersonId)) managerByPerson.set(rl.subjectPersonId, rl.manager.displayName); }
    const projectNameMap = new Map(projects.map((p) => [p.id, p.name]));

    // Batch match: score bench people against open requests
    const openRequests = await this.prisma.staffingRequest.findMany({
      where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
      select: { id: true, role: true, skills: true, allocationPercent: true, priority: true },
    });

    // Build bench people list
    const benchPeople: BenchPersonDto[] = [];
    for (const p of allPeople) {
      if ((allocByPerson.get(p.id) ?? 0) !== 0) continue;

      const last = lastAssignment.get(p.id);
      const benchStart = last?.validTo ?? p.hiredAt ?? p.createdAt;
      const daysOnBench = Math.max(0, Math.round((now.getTime() - benchStart.getTime()) / 86400000));
      const skills = skillsByPerson.get(p.id) ?? [];

      // Simple best-match scoring
      let bestReq: { id: string; role: string; score: number } | null = null;
      for (const req of openRequests) {
        let score = 0;
        const personSkillNames = new Set(skills.map((s) => s.name));
        for (const reqSkill of req.skills) {
          if (personSkillNames.has(reqSkill)) score += 1;
        }
        if (req.skills.length > 0) score = score / req.skills.length;
        if (!bestReq || score > bestReq.score) {
          bestReq = { id: req.id, role: req.role, score: Math.round(score * 100) / 100 };
        }
      }

      benchPeople.push({
        personId: p.id,
        displayName: p.displayName,
        grade: p.grade,
        role: p.role,
        skills,
        poolName: poolByPerson.get(p.id) ?? null,
        orgUnitName: orgByPerson.get(p.id) ?? null,
        managerName: managerByPerson.get(p.id) ?? null,
        availablePercent: 100,
        benchStartDate: benchStart.toISOString(),
        daysOnBench,
        lastProjectName: last ? (projectNameMap.get(last.projectId) ?? null) : null,
        lastProjectEndDate: last?.validTo.toISOString() ?? null,
        bestMatchRequestId: bestReq?.id ?? null,
        bestMatchScore: bestReq?.score ?? null,
        bestMatchRole: bestReq?.role ?? null,
      });
    }
    benchPeople.sort((a, b) => b.daysOnBench - a.daysOnBench);

    // KPIs
    const benchCount = benchPeople.length;
    const avgDays = benchCount > 0 ? Math.round(benchPeople.reduce((s, p) => s + p.daysOnBench, 0) / benchCount) : 0;
    const longestDays = benchCount > 0 ? benchPeople[0].daysOnBench : 0;

    // Aging buckets
    const buckets = [
      { label: '0–7d', min: 0, max: 7 },
      { label: '7–30d', min: 7, max: 30 },
      { label: '30–60d', min: 30, max: 60 },
      { label: '60–90d', min: 60, max: 90 },
      { label: '90d+', min: 90, max: Infinity },
    ];
    const agingBuckets: BenchAgingBucket[] = buckets.map((b) => {
      const people = benchPeople
        .filter((p) => p.daysOnBench >= b.min && p.daysOnBench < b.max)
        .map((p) => ({ personId: p.personId, displayName: p.displayName, daysOnBench: p.daysOnBench }));
      return { label: b.label, count: people.length, people };
    });

    // Roll-offs: assignments ending in next N weeks
    const rollOffDate = new Date(now);
    rollOffDate.setUTCDate(rollOffDate.getUTCDate() + weeksAhead * 7);
    const rollingOff = await this.prisma.projectAssignment.findMany({
      where: {
        status: { in: ['APPROVED', 'ACTIVE'] },
        validTo: { gte: now, lte: rollOffDate },
        ...(personScope ? { personId: { in: [...personScope] } } : {}),
      },
      select: { personId: true, projectId: true, allocationPercent: true, validTo: true },
      orderBy: { validTo: 'asc' },
    });

    // Check if roll-off people have follow-on assignments
    const rollOffPersonIds = [...new Set(rollingOff.map((a) => a.personId))];
    const followOns = await this.prisma.projectAssignment.findMany({
      where: {
        personId: { in: rollOffPersonIds },
        status: { in: ['APPROVED', 'ACTIVE', 'REQUESTED'] },
        validFrom: { gte: now },
      },
      select: { personId: true, validFrom: true },
    });
    const hasFollowOnSet = new Set(followOns.map((a) => a.personId));

    const personById = new Map(allPeople.map((p) => [p.id, p]));
    const rollOffs: BenchRollOff[] = rollingOff.map((a) => {
      const person = personById.get(a.personId);
      const daysUntil = Math.max(0, Math.round(((a.validTo?.getTime() ?? 0) - now.getTime()) / 86400000));
      return {
        personId: a.personId,
        displayName: person?.displayName ?? a.personId,
        grade: person?.grade ?? null,
        skills: (skillsByPerson.get(a.personId) ?? []).map((s) => s.name),
        assignmentEndDate: a.validTo?.toISOString() ?? '',
        projectName: projectNameMap.get(a.projectId) ?? a.projectId,
        allocationPercent: a.allocationPercent?.toNumber() ?? 0,
        daysUntilRollOff: daysUntil,
        hasFollowOn: hasFollowOnSet.has(a.personId),
      };
    });
    const atRiskCount = rollOffs.filter((r) => r.daysUntilRollOff <= 14 && !r.hasFollowOn).length;

    // Distribution
    const dist = (items: Array<{ label: string | null }>) => {
      const map = new Map<string, number>();
      for (const i of items) { const k = i.label ?? 'Unknown'; map.set(k, (map.get(k) ?? 0) + 1); }
      return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
    };
    const allBenchSkills: Array<{ label: string }> = [];
    for (const p of benchPeople) { for (const s of p.skills) allBenchSkills.push({ label: s.name }); }

    const distribution: BenchDistribution = {
      byGrade: dist(benchPeople.map((p) => ({ label: p.grade }))),
      bySkill: dist(allBenchSkills),
      byPool: dist(benchPeople.map((p) => ({ label: p.poolName }))),
      byOrgUnit: dist(benchPeople.map((p) => ({ label: p.orgUnitName }))),
    };

    // Trend: 12-week projection (simplified: current bench count, minus expected placements)
    const trend: BenchTrendWeek[] = [];
    let projectedBench = benchCount;
    for (let w = 0; w < weeksAhead; w++) {
      const weekStart = new Date(now);
      weekStart.setUTCDate(weekStart.getUTCDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      // Roll-offs joining bench this week
      const joiningBench = rollOffs.filter((r) => {
        const end = new Date(r.assignmentEndDate);
        return end >= weekStart && end < weekEnd && !r.hasFollowOn;
      }).length;
      projectedBench += joiningBench;
      trend.push({
        week: weekStart.toISOString().slice(0, 10),
        benchCount: projectedBench,
        benchRate: totalPeople > 0 ? Math.round((projectedBench / totalPeople) * 100) : 0,
      });
    }

    return {
      kpis: {
        benchCount,
        benchRate: totalPeople > 0 ? Math.round((benchCount / totalPeople) * 100) : 0,
        avgDaysOnBench: avgDays,
        atRiskCount,
        totalPeople,
        longestBenchDays: longestDays,
      },
      agingBuckets,
      rollOffs,
      benchPeople,
      distribution,
      trend,
    };
  }
}
