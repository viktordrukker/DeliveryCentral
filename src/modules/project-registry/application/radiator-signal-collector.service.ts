import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { ProjectChangeRequestService } from './project-change-request.service';
import { ProjectMilestoneService } from './project-milestone.service';
import { ProjectRolePlanService } from './project-role-plan.service';
import { SUB_DIMENSION_KEYS, SubDimensionKey } from './radiator-scorers';

export interface CollectedSignal {
  value: number | null;
  explanation: string;
  /**
   * Optional secondary inputs for compound scorers.
   * - changeRequestBurden expects { size }
   * - timelineDeviation   expects { duration }
   * - forecastAccuracy    expects { bac }
   */
  extra?: Record<string, number>;
}

export type CollectedSignals = Record<SubDimensionKey, CollectedSignal>;

const NO_DATA = (explanation: string): CollectedSignal => ({ value: null, explanation });

const DEFAULT_BASELINE_REQUIREMENTS = 100;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / MS_PER_DAY;
}

@Injectable()
export class RadiatorSignalCollectorService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly rolePlanService: ProjectRolePlanService,
    private readonly milestoneService: ProjectMilestoneService,
    private readonly changeRequestService: ProjectChangeRequestService,
  ) {}

  public async collectForProject(projectId: string): Promise<CollectedSignals> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      const empty: Partial<CollectedSignals> = {};
      for (const key of SUB_DIMENSION_KEYS) {
        empty[key] = NO_DATA('Project not found.');
      }
      return empty as CollectedSignals;
    }

    const baselineReqs = project.baselineRequirements ?? DEFAULT_BASELINE_REQUIREMENTS;

    const [
      requirementsStability,
      scopeCreep,
      deliverableAcceptance,
      changeRequestBurden,
      milestoneAdherence,
      timelineDeviation,
      criticalPathHealth,
      velocityTrend,
      costPerformanceIndex,
      spendRate,
      forecastAccuracy,
      capexCompliance,
      staffingFillRate,
      teamMood,
      overAllocationRate,
      keyPersonRisk,
    ] = await Promise.all([
      this.changeRequestService.stabilityLast4w(projectId, baselineReqs),
      this.changeRequestService.creepRatio(projectId, baselineReqs),
      this.collectDeliverableAcceptance(projectId),
      this.changeRequestService.burden(projectId, baselineReqs),
      this.collectMilestoneAdherence(projectId),
      this.collectTimelineDeviation(project),
      this.collectCriticalPathHealth(project),
      this.collectVelocityTrend(projectId),
      this.collectCostPerformanceIndex(projectId),
      this.collectSpendRate(projectId),
      this.collectForecastAccuracy(projectId),
      this.collectCapexCompliance(projectId),
      this.collectStaffingFillRate(projectId),
      this.collectTeamMood(projectId),
      this.collectOverAllocationRate(projectId),
      this.collectKeyPersonRisk(projectId),
    ]);

    return {
      requirementsStability,
      scopeCreep,
      deliverableAcceptance,
      changeRequestBurden,
      milestoneAdherence,
      timelineDeviation,
      criticalPathHealth,
      velocityTrend,
      costPerformanceIndex,
      spendRate,
      forecastAccuracy,
      capexCompliance,
      staffingFillRate,
      teamMood,
      overAllocationRate,
      keyPersonRisk,
    };
  }

  // ── Scope ─────────────────────────────────────────────────────────────────

  private async collectDeliverableAcceptance(projectId: string): Promise<CollectedSignal> {
    const snapshot = await this.prisma.projectRagSnapshot.findFirst({
      where: { projectId, dimensionDetails: { not: Prisma.JsonNull } },
      orderBy: { weekStarting: 'desc' },
      select: { dimensionDetails: true },
    });

    const details = snapshot?.dimensionDetails as
      | { scope?: { deliverableAcceptance?: { rating?: number } } }
      | null
      | undefined;
    const rating = details?.scope?.deliverableAcceptance?.rating;
    if (typeof rating !== 'number' || rating <= 0) {
      return NO_DATA('No deliverable acceptance rating recorded.');
    }

    const ratio = Math.max(0, Math.min(1, rating / 5));
    return {
      value: ratio,
      explanation: `Deliverable acceptance rating ${rating}/5 (${Math.round(ratio * 100)}%)`,
    };
  }

  // ── Schedule ──────────────────────────────────────────────────────────────

  private async collectMilestoneAdherence(projectId: string): Promise<CollectedSignal> {
    const result = await this.milestoneService.hitRateLast56d(projectId);
    if (result.ratio === null) {
      return NO_DATA('No milestones planned in last 56d.');
    }
    return {
      value: result.ratio,
      explanation: `${result.hits}/${result.total} milestones hit on time in last 56d (${Math.round(result.ratio * 100)}%)`,
    };
  }

  private async collectTimelineDeviation(project: {
    startsOn: Date | null;
    baselineEndsOn: Date | null;
    forecastEndsOn: Date | null;
  }): Promise<CollectedSignal> {
    if (!project.baselineEndsOn || !project.startsOn) {
      return NO_DATA('No baseline timeline recorded.');
    }

    const duration = daysBetween(project.baselineEndsOn, project.startsOn);
    if (duration <= 0) return NO_DATA('Invalid baseline duration.');

    let driftDays: number;
    if (project.forecastEndsOn) {
      driftDays = daysBetween(project.forecastEndsOn, project.baselineEndsOn);
    } else {
      const now = new Date();
      driftDays = Math.max(0, daysBetween(now, project.baselineEndsOn));
    }

    return {
      value: driftDays,
      extra: { duration },
      explanation: `${Math.round(driftDays)}d drift vs ${Math.round(duration)}d baseline (${Math.round((Math.abs(driftDays) / duration) * 100)}%)`,
    };
  }

  private async collectCriticalPathHealth(project: {
    criticalPathFloatDays: number | null;
  }): Promise<CollectedSignal> {
    if (project.criticalPathFloatDays === null || project.criticalPathFloatDays === undefined) {
      return NO_DATA('No critical-path float recorded.');
    }
    return {
      value: project.criticalPathFloatDays,
      explanation: `Critical path float ${project.criticalPathFloatDays}d`,
    };
  }

  private async collectVelocityTrend(projectId: string): Promise<CollectedSignal> {
    const now = new Date();
    const since = new Date(now.getTime() - 28 * MS_PER_DAY);

    const actualAgg = await this.prisma.timesheetEntry.aggregate({
      _sum: { hours: true },
      where: {
        projectId,
        date: { gte: since, lte: now },
        timesheetWeek: { status: 'APPROVED' },
      },
    });
    const actualHours = Number(actualAgg._sum?.hours ?? 0);

    const activeAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { allocationPercent: true },
    });

    // Each active assignment contributes allocationPercent% × 40h/week × 4 weeks of planned effort.
    const plannedHours = activeAssignments.reduce((sum, a) => {
      const alloc = a.allocationPercent !== null ? Number(a.allocationPercent) : 100;
      return sum + (alloc / 100) * 40 * 4;
    }, 0);

    if (plannedHours <= 0) {
      return NO_DATA('No planned hours in last 28d.');
    }

    const ratio = actualHours / plannedHours;
    return {
      value: ratio,
      explanation: `${Math.round(actualHours)}h actual vs ${Math.round(plannedHours)}h planned in last 28d (${Math.round(ratio * 100)}%)`,
    };
  }

  // ── Budget ────────────────────────────────────────────────────────────────

  private async latestBudget(projectId: string) {
    return this.prisma.projectBudget.findFirst({
      where: { projectId },
      orderBy: { fiscalYear: 'desc' },
    });
  }

  private async collectCostPerformanceIndex(projectId: string): Promise<CollectedSignal> {
    const budget = await this.latestBudget(projectId);
    if (!budget || budget.earnedValue === null || budget.actualCost === null) {
      return NO_DATA('No earned-value/actual-cost recorded.');
    }
    const ev = Number(budget.earnedValue);
    const ac = Number(budget.actualCost);
    if (ac <= 0) return NO_DATA('Actual cost is zero.');
    const cpi = ev / ac;
    return {
      value: cpi,
      explanation: `CPI ${cpi.toFixed(2)} (EV ${ev.toFixed(0)} / AC ${ac.toFixed(0)})`,
    };
  }

  private async collectSpendRate(projectId: string): Promise<CollectedSignal> {
    const budget = await this.latestBudget(projectId);
    if (!budget || budget.actualCost === null || budget.plannedToDate === null) {
      return NO_DATA('No actual-cost/planned-to-date recorded.');
    }
    const ac = Number(budget.actualCost);
    const ptd = Number(budget.plannedToDate);
    if (ptd <= 0) return NO_DATA('Planned-to-date is zero.');
    const ratio = ac / ptd;
    return {
      value: ratio,
      explanation: `Spend ratio ${ratio.toFixed(2)} (AC ${ac.toFixed(0)} / PTD ${ptd.toFixed(0)})`,
    };
  }

  private async collectForecastAccuracy(projectId: string): Promise<CollectedSignal> {
    const budget = await this.latestBudget(projectId);
    if (!budget || budget.eac === null) {
      return NO_DATA('No EAC recorded.');
    }
    const eac = Number(budget.eac);
    const bac = Number(budget.capexBudget) + Number(budget.opexBudget);
    if (bac <= 0) return NO_DATA('BAC is zero.');
    const err = Math.abs(eac - bac) / bac;
    return {
      value: eac,
      extra: { bac },
      explanation: `EAC ${eac.toFixed(0)} vs BAC ${bac.toFixed(0)} (${Math.round(err * 100)}% error)`,
    };
  }

  private async collectCapexCompliance(projectId: string): Promise<CollectedSignal> {
    const budget = await this.latestBudget(projectId);
    if (!budget || budget.capexCorrectPct === null) {
      return NO_DATA('No capex-compliance percentage recorded.');
    }
    const pct = Number(budget.capexCorrectPct);
    return {
      value: pct,
      explanation: `${Math.round(pct * 100)}% of capex correctly classified`,
    };
  }

  // ── People ────────────────────────────────────────────────────────────────

  private async collectStaffingFillRate(projectId: string): Promise<CollectedSignal> {
    const summary = await this.rolePlanService.getStaffingSummary(projectId);
    if (summary.totalPlanned === 0) {
      return NO_DATA('No role plan defined.');
    }
    const ratio = summary.fillRate / 100;
    return {
      value: ratio,
      explanation: `${summary.fillRate}% of role-plan filled (${summary.totalFilled}/${summary.totalPlanned} seats)`,
    };
  }

  private async collectTeamMood(projectId: string): Promise<CollectedSignal> {
    const now = new Date();
    const since = new Date(now.getTime() - 28 * MS_PER_DAY);

    const assignments = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { personId: true },
    });

    const personIds = Array.from(new Set(assignments.map((a) => a.personId)));
    if (personIds.length === 0) {
      return NO_DATA('No active team members.');
    }

    const entries = await this.prisma.pulseEntry.findMany({
      where: { personId: { in: personIds }, weekStart: { gte: since } },
      select: { mood: true },
    });

    if (entries.length === 0) {
      return NO_DATA('No recent pulse entries.');
    }

    const avg = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
    const rounded = Math.round(avg * 10) / 10;
    return {
      value: avg,
      explanation: `Avg mood ${rounded}/5 across ${entries.length} pulse entries (last 28d)`,
    };
  }

  private async collectOverAllocationRate(projectId: string): Promise<CollectedSignal> {
    const now = new Date();
    const teamAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { personId: true },
    });

    const teamIds = Array.from(new Set(teamAssignments.map((a) => a.personId)));
    if (teamIds.length === 0) {
      return NO_DATA('No active team members.');
    }

    const allAssignments = await this.prisma.projectAssignment.findMany({
      where: {
        personId: { in: teamIds },
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { personId: true, allocationPercent: true },
    });

    const totals = new Map<string, number>();
    for (const a of allAssignments) {
      const alloc = a.allocationPercent !== null ? Number(a.allocationPercent) : 100;
      totals.set(a.personId, (totals.get(a.personId) ?? 0) + alloc);
    }

    const overCount = Array.from(totals.values()).filter((t) => t > 100).length;
    const ratio = overCount / teamIds.length;
    return {
      value: ratio,
      explanation: `${overCount}/${teamIds.length} team members over-allocated (${Math.round(ratio * 100)}%)`,
    };
  }

  private async collectKeyPersonRisk(projectId: string): Promise<CollectedSignal> {
    const rolePlans = await this.prisma.projectRolePlan.findMany({
      where: { projectId },
      select: { requiredSkillIds: true },
    });

    const requiredSkillIds = Array.from(
      new Set(rolePlans.flatMap((rp) => rp.requiredSkillIds ?? [])),
    );

    if (requiredSkillIds.length === 0) {
      return NO_DATA('No required skills on role plan.');
    }

    const now = new Date();
    const team = await this.prisma.projectAssignment.findMany({
      where: {
        projectId,
        status: { in: ['BOOKED', 'ONBOARDING', 'ASSIGNED', 'ON_HOLD'] },
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      select: { personId: true },
    });
    const teamIds = Array.from(new Set(team.map((a) => a.personId)));

    if (teamIds.length === 0) {
      return {
        value: 0,
        explanation: `0/${requiredSkillIds.length} required skills covered (no active team)`,
      };
    }

    const skills = await this.prisma.personSkill.findMany({
      where: { personId: { in: teamIds }, skillId: { in: requiredSkillIds } },
      select: { skillId: true },
    });

    const countBySkill = new Map<string, number>();
    for (const s of skills) {
      countBySkill.set(s.skillId, (countBySkill.get(s.skillId) ?? 0) + 1);
    }

    const covered = requiredSkillIds.filter((id) => (countBySkill.get(id) ?? 0) >= 2).length;
    const ratio = covered / requiredSkillIds.length;
    return {
      value: ratio,
      explanation: `${covered}/${requiredSkillIds.length} required skills have ≥2 team members (${Math.round(ratio * 100)}%)`,
    };
  }
}
