import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { FinancialRepository } from '../infrastructure/financial.repository';
import {
  BurnDownPoint,
  CapitalisationReport,
  CostByRole,
  CreatePersonCostRateDto,
  CreatePeriodLockDto,
  ForecastData,
  PeriodLockDto,
  PersonCostRateDto,
  ProjectBudgetDashboard,
  ProjectBudgetDto,
  UpsertProjectBudgetDto,
} from './contracts/financial.dto';

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function countWorkingDays(from: Date, to: Date): number {
  let count = 0;
  const current = new Date(from);

  while (current <= to) {
    const day = current.getUTCDay();

    if (day !== 0 && day !== 6) {
      count++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}

function isoWeek(date: Date): string {
  // Return YYYY-Www
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

@Injectable()
export class FinancialService {
  public constructor(private readonly repo: FinancialRepository) {}

  // ─── Capitalisation ───────────────────────────────────────────────────────

  public async getCapitalisationReport(query: {
    from: string;
    to: string;
    projectId?: string;
  }): Promise<CapitalisationReport> {
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid from/to date.');
    }

    const entries = await this.repo.findApprovedEntriesForCapitalisation(
      fromDate,
      toDate,
      query.projectId,
    );

    // Aggregate by project
    const projectMap = new Map<
      string,
      { capexHours: number; opexHours: number }
    >();

    // For trend: aggregate by month
    const monthMap = new Map<string, { capexHours: number; totalHours: number }>();

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      const existing = projectMap.get(entry.projectId) ?? { capexHours: 0, opexHours: 0 };

      if (entry.capex) {
        existing.capexHours += hrs;
      } else {
        existing.opexHours += hrs;
      }

      projectMap.set(entry.projectId, existing);

      // Month key: YYYY-MM
      const monthKey = toDateStr(entry.date).slice(0, 7);
      const monthExisting = monthMap.get(monthKey) ?? { capexHours: 0, totalHours: 0 };

      monthExisting.totalHours += hrs;

      if (entry.capex) {
        monthExisting.capexHours += hrs;
      }

      monthMap.set(monthKey, monthExisting);
    }

    // Fetch project names
    const projectIds = Array.from(projectMap.keys());
    const projectNames = await this.repo.findProjectNamesByIds(projectIds);
    const nameMap = new Map(projectNames.map((p) => [p.id, p.name]));

    // Fetch active assignments for reconciliation (8-1-05)
    const activeAssignments = await this.repo.findActiveAssignmentsForProjects(projectIds);
    const assignmentMap = new Map<string, number>(); // projectId -> total allocation sum

    for (const a of activeAssignments) {
      const prev = assignmentMap.get(a.projectId) ?? 0;
      assignmentMap.set(a.projectId, prev + Number(a.allocationPercent ?? 0));
    }

    const workingDays = countWorkingDays(fromDate, toDate);

    const byProject = projectIds.map((pid) => {
      const data = projectMap.get(pid)!;
      const totalHours = data.capexHours + data.opexHours;
      const capexPercent = totalHours > 0 ? (data.capexHours / totalHours) * 100 : 0;

      // Reconciliation: expected hours = sum(allocationPercent/100 * workingDays * 8)
      const totalAlloc = assignmentMap.get(pid) ?? 0;
      const expectedHours = (totalAlloc / 100) * workingDays * 8;
      let alert = false;
      let deviation: number | undefined;

      if (expectedHours > 0) {
        deviation = Math.abs(totalHours - expectedHours) / expectedHours;

        if (deviation > 0.10) {
          alert = true;
        }
      }

      const row = {
        projectId: pid,
        projectName: nameMap.get(pid) ?? pid,
        capexHours: data.capexHours,
        opexHours: data.opexHours,
        totalHours,
        capexPercent: Math.round(capexPercent * 10) / 10,
        alert: alert || undefined,
        deviation: alert ? Math.round((deviation ?? 0) * 1000) / 1000 : undefined,
      };

      return row;
    });

    const totals = byProject.reduce(
      (acc, r) => ({
        capexHours: acc.capexHours + r.capexHours,
        opexHours: acc.opexHours + r.opexHours,
        totalHours: acc.totalHours + r.totalHours,
        capexPercent: 0,
      }),
      { capexHours: 0, opexHours: 0, totalHours: 0, capexPercent: 0 },
    );

    if (totals.totalHours > 0) {
      totals.capexPercent = Math.round((totals.capexHours / totals.totalHours) * 1000) / 10;
    }

    const periodTrend = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        capexPercent:
          data.totalHours > 0 ? Math.round((data.capexHours / data.totalHours) * 1000) / 10 : 0,
      }));

    return {
      period: { from: query.from, to: query.to },
      byProject,
      totals,
      periodTrend,
    };
  }

  // ─── Period Locks ─────────────────────────────────────────────────────────

  public async createPeriodLock(
    dto: CreatePeriodLockDto,
    lockedBy: string,
  ): Promise<PeriodLockDto> {
    const periodFrom = new Date(dto.from);
    const periodTo = new Date(dto.to);

    if (isNaN(periodFrom.getTime()) || isNaN(periodTo.getTime())) {
      throw new BadRequestException('Invalid from/to date.');
    }

    if (periodFrom > periodTo) {
      throw new BadRequestException('periodFrom must be before periodTo.');
    }

    const lock = await this.repo.createPeriodLock({ periodFrom, periodTo, lockedBy });

    return this.mapLock(lock);
  }

  public async listPeriodLocks(): Promise<PeriodLockDto[]> {
    const locks = await this.repo.findAllPeriodLocks();

    return locks.map((l) => this.mapLock(l));
  }

  public async deletePeriodLock(id: string): Promise<void> {
    try {
      await this.repo.deletePeriodLock(id);
    } catch {
      throw new NotFoundException(`Period lock ${id} not found.`);
    }
  }

  public async assertDateNotLocked(date: Date): Promise<void> {
    const locks = await this.repo.findLocksForDate(date);

    if (locks.length > 0) {
      throw new BadRequestException('This period is locked and cannot be edited.');
    }
  }

  // ─── Project Budget ───────────────────────────────────────────────────────

  public async upsertProjectBudget(
    projectId: string,
    dto: UpsertProjectBudgetDto,
  ): Promise<ProjectBudgetDto> {
    const budget = await this.repo.upsertProjectBudget({
      projectId,
      fiscalYear: dto.fiscalYear,
      capexBudget: new Prisma.Decimal(dto.capexBudget),
      opexBudget: new Prisma.Decimal(dto.opexBudget),
    });

    return {
      id: budget.id,
      projectId: budget.projectId,
      fiscalYear: budget.fiscalYear,
      capexBudget: Number(budget.capexBudget),
      opexBudget: Number(budget.opexBudget),
    };
  }

  // ─── Person Cost Rate ─────────────────────────────────────────────────────

  public async createPersonCostRate(
    personId: string,
    dto: CreatePersonCostRateDto,
  ): Promise<PersonCostRateDto> {
    const effectiveFrom = new Date(dto.effectiveFrom);

    if (isNaN(effectiveFrom.getTime())) {
      throw new BadRequestException('Invalid effectiveFrom date.');
    }

    const rate = await this.repo.createPersonCostRate({
      personId,
      effectiveFrom,
      hourlyRate: new Prisma.Decimal(dto.hourlyRate),
      rateType: dto.rateType || 'INTERNAL',
    });

    return {
      id: rate.id,
      personId: rate.personId,
      effectiveFrom: toDateStr(rate.effectiveFrom),
      hourlyRate: Number(rate.hourlyRate),
      rateType: rate.rateType,
      createdAt: rate.createdAt.toISOString(),
    };
  }

  // ─── Budget Dashboard ─────────────────────────────────────────────────────

  public async getProjectBudgetDashboard(projectId: string): Promise<ProjectBudgetDashboard> {
    const fiscalYear = new Date().getUTCFullYear();
    const budget = await this.repo.findProjectBudget(projectId, fiscalYear);

    const entries = await this.repo.findApprovedEntriesForProject(projectId, fiscalYear);
    const assignments = await this.repo.findApprovedAssignmentRolesForProject(projectId);

    const personIds = [...new Set([...entries.map((e) => e.timesheetWeek.personId)])];
    const costRates = await this.repo.findEffectiveCostRates(personIds, new Date());
    const rateMap = new Map(costRates.map((r) => [r.personId, Number(r.hourlyRate)]));

    // Build weekly cumulative cost
    const weekMap = new Map<string, number>();
    let runningCost = 0;

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      const rate = rateMap.get(entry.timesheetWeek.personId) ?? 0;
      runningCost += hrs * rate;
      const week = isoWeek(entry.date);
      weekMap.set(week, runningCost);
    }

    const totalBudget = budget
      ? Number(budget.capexBudget) + Number(budget.opexBudget)
      : 0;

    const weeks = Array.from(weekMap.keys()).sort();
    const burnDown: BurnDownPoint[] = weeks.map((week, idx) => ({
      week,
      cumCost: weekMap.get(week) ?? 0,
      budgetLine: totalBudget > 0 ? (totalBudget / weeks.length) * (idx + 1) : 0,
    }));

    // Forecast: linear extrapolation based on elapsed fiscal year
    const now = new Date();
    const yearStart = new Date(Date.UTC(fiscalYear, 0, 1));
    const yearEnd = new Date(Date.UTC(fiscalYear, 11, 31));
    const totalDays = (yearEnd.getTime() - yearStart.getTime()) / 86400000;
    const elapsedDays = Math.max(1, (now.getTime() - yearStart.getTime()) / 86400000);
    const burnRate = runningCost / elapsedDays;
    const projectedTotalCost = burnRate * totalDays;
    const remainingBudget = Math.max(0, totalBudget - runningCost);
    const onTrack = totalBudget > 0 ? projectedTotalCost <= totalBudget * 1.05 : true;

    const forecast: ForecastData = {
      projectedTotalCost: Math.round(projectedTotalCost * 100) / 100,
      remainingBudget: Math.round(remainingBudget * 100) / 100,
      onTrack,
    };

    // Cost by role — use assignments to map personId -> role, then multiply by hours × rate
    const personRoleMap = new Map<string, string>();

    for (const a of assignments) {
      if (!personRoleMap.has(a.personId)) {
        personRoleMap.set(a.personId, a.staffingRole || 'Unknown');
      }
    }

    const roleMap = new Map<string, { hours: number; cost: number }>();

    for (const entry of entries) {
      const hrs = Number(entry.hours);
      const rate = rateMap.get(entry.timesheetWeek.personId) ?? 0;
      const role = personRoleMap.get(entry.timesheetWeek.personId) ?? 'Unknown';
      const existing = roleMap.get(role) ?? { hours: 0, cost: 0 };
      existing.hours += hrs;
      existing.cost += hrs * rate;
      roleMap.set(role, existing);
    }

    const byRole: CostByRole[] = Array.from(roleMap.entries()).map(([role, data]) => ({
      role,
      hours: Math.round(data.hours * 10) / 10,
      cost: Math.round(data.cost * 100) / 100,
    }));

    // Health colour
    let healthColor: 'green' | 'yellow' | 'red' = 'green';

    if (totalBudget > 0) {
      if (projectedTotalCost > totalBudget) {
        healthColor = 'red';
      } else if (projectedTotalCost > totalBudget * 0.85) {
        healthColor = 'yellow';
      }
    }

    return {
      budget: budget
        ? {
            capex: Number(budget.capexBudget),
            opex: Number(budget.opexBudget),
            total: Number(budget.capexBudget) + Number(budget.opexBudget),
            fiscalYear,
          }
        : null,
      burnDown,
      forecast,
      byRole,
      healthColor,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private mapLock(lock: {
    id: string;
    periodFrom: Date;
    periodTo: Date;
    lockedBy: string;
    lockedAt: Date;
  }): PeriodLockDto {
    return {
      id: lock.id,
      periodFrom: toDateStr(lock.periodFrom),
      periodTo: toDateStr(lock.periodTo),
      lockedBy: lock.lockedBy,
      lockedAt: lock.lockedAt.toISOString(),
    };
  }
}
