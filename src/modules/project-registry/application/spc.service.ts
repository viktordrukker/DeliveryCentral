import { Injectable, NotFoundException } from '@nestjs/common';

import { getCached, setCache } from '@src/shared/cache/simple-cache';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { SpcBurndownDto, SpcWeekPoint } from './contracts/spc.dto';

const CACHE_TTL_MS = 60_000;

function startOfMonday(d: Date): Date {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function monthsBetween(from: Date, to: Date): number {
  const y = to.getUTCFullYear() - from.getUTCFullYear();
  const m = to.getUTCMonth() - from.getUTCMonth();
  return Math.max(0, y * 12 + m);
}

@Injectable()
export class SpcService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute SPC burndown per ISO week for a project.
   * SPC = Σ(TimesheetEntry.hours × ProjectRolePlan.standardHourlyRate)
   * If the role plan lacks an SPC rate, we fall back to OrganizationConfig.defaultHourlyRate.
   * If both are null, the entry contributes 0 and the row is tagged 🌱 Demo.
   */
  public async getBurndown(projectId: string, weeks = 12): Promise<SpcBurndownDto> {
    const cacheKey = `spc-burndown:${projectId}:${weeks}`;
    const cached = getCached<SpcBurndownDto>(cacheKey);
    if (cached) return cached;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, hasLiveSpcRates: true },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const orgConfig = await this.prisma.organizationConfig.findUnique({ where: { id: 'default' } });
    const defaultRate = orgConfig?.defaultHourlyRate ? Number(orgConfig.defaultHourlyRate) : null;

    const weekStart0 = startOfMonday(addDays(new Date(), -weeks * 7));
    const weekEnd = new Date();

    const [rolePlans, entries, vendorEngagements, budget] = await Promise.all([
      this.prisma.projectRolePlan.findMany({
        where: { projectId },
        select: { roleName: true, seniorityLevel: true, standardHourlyRate: true },
      }),
      this.prisma.timesheetEntry.findMany({
        where: { projectId, date: { gte: weekStart0, lte: weekEnd } },
        select: { hours: true, date: true, assignmentId: true },
      }),
      this.prisma.projectVendorEngagement.findMany({
        where: { projectId },
        select: { monthlyRate: true, blendedDayRate: true, startDate: true, endDate: true },
      }),
      this.prisma.projectBudget.findFirst({
        where: { projectId },
        orderBy: { fiscalYear: 'desc' },
        select: { capexBudget: true, opexBudget: true, vendorBudget: true },
      }),
    ]);

    // Build assignment → rate map (assignment → rolePlan resolution would need join;
    // use avg rolePlan rate as a pragmatic fallback when direct link is missing).
    const avgRolePlanRate = rolePlans
      .filter((r) => r.standardHourlyRate !== null)
      .reduce(
        (acc, r) => {
          const rate = Number(r.standardHourlyRate);
          return { sum: acc.sum + rate, count: acc.count + 1 };
        },
        { sum: 0, count: 0 },
      );
    const rolePlanAvg =
      avgRolePlanRate.count > 0 ? avgRolePlanRate.sum / avgRolePlanRate.count : null;

    const rateToUse = rolePlanAvg ?? defaultRate;
    const hasLive = project.hasLiveSpcRates && rateToUse !== null;

    // Group hours by ISO week.
    const perWeek = new Map<string, number>();
    for (const e of entries) {
      const wk = startOfMonday(e.date).toISOString().slice(0, 10);
      perWeek.set(wk, (perWeek.get(wk) ?? 0) + Number(e.hours));
    }

    const points: SpcWeekPoint[] = [];
    for (let i = 0; i < weeks; i += 1) {
      const weekStarting = addDays(weekStart0, i * 7).toISOString().slice(0, 10);
      const hours = perWeek.get(weekStarting) ?? 0;
      const cost = rateToUse !== null ? hours * rateToUse : 0;
      points.push({ weekStarting, hours, cost });
    }

    const totalHours = points.reduce((s, p) => s + p.hours, 0);
    const totalCost = points.reduce((s, p) => s + p.cost, 0);

    const vendorAccrual = this.computeVendorAccrualToDate(vendorEngagements);

    const bac = budget
      ? Number(budget.capexBudget) + Number(budget.opexBudget) + Number(budget.vendorBudget ?? 0)
      : null;

    const result: SpcBurndownDto = {
      projectId,
      points,
      totalHours,
      totalSpcCost: totalCost,
      vendorAccrualToDate: vendorAccrual,
      bac,
      appliedHourlyRate: rateToUse,
      rateSource: rolePlanAvg !== null ? 'role-plan' : defaultRate !== null ? 'org-default' : null,
      dataSource: hasLive ? 'live' : 'demo',
    };

    setCache(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  private computeVendorAccrualToDate(
    engagements: Array<{
      monthlyRate: unknown;
      blendedDayRate: unknown;
      startDate: Date | null;
      endDate: Date | null;
    }>,
  ): number {
    const now = new Date();
    let total = 0;
    for (const e of engagements) {
      if (!e.startDate) continue;
      const effectiveEnd = e.endDate && e.endDate < now ? e.endDate : now;
      if (e.monthlyRate !== null && e.monthlyRate !== undefined) {
        const months = monthsBetween(e.startDate, effectiveEnd);
        total += Number(e.monthlyRate) * months;
        continue;
      }
      if (e.blendedDayRate !== null && e.blendedDayRate !== undefined) {
        const days = Math.max(
          0,
          Math.floor((effectiveEnd.getTime() - e.startDate.getTime()) / (1000 * 60 * 60 * 24)),
        );
        total += Number(e.blendedDayRate) * days;
      }
    }
    return total;
  }
}
