import { Injectable } from '@nestjs/common';

import { decimalToNumber } from '@src/shared/persistence/decimal';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PortfolioFinanceSummaryDto } from './contracts/portfolio-finance-summary.dto';

interface BudgetRow {
  projectId: string;
  fiscalYear: number;
  capexBudget: unknown;
  opexBudget: unknown;
  vendorBudget: unknown;
  actualCost: unknown;
  earnedValue: unknown;
}

/**
 * BE-track / Director finance band — portfolio-level rollup over the
 * ProjectBudget table. Pure aggregation; no per-project fan-out. Decimal
 * columns flow through decimalToNumber so Decimal.js objects never reach
 * the controller.
 *
 * Default semantics (no `fiscalYear` query param) aggregate every
 * ProjectBudget tied to a currently-ACTIVE Project — across every fiscal
 * year — and report the latest contributing year as the band label. This
 * removes the "11 active projects but 0 budget" surprise that surfaced on
 * v2-staging when active projects' budgets were keyed to a year that
 * happened to differ from the default resolver's pick (the seed keys
 * budgets to each project's start-year, so a recently-started active
 * portfolio spans multiple fiscal years). When an explicit `fiscalYear`
 * is supplied the service scopes strictly to that year for back-compat
 * with single-year drill-downs.
 */
@Injectable()
export class PortfolioFinanceSummaryService {
  public constructor(private readonly prisma: PrismaService) {}

  public async summarize(fiscalYear?: number): Promise<PortfolioFinanceSummaryDto> {
    if (fiscalYear !== undefined) {
      const rows = await this.prisma.projectBudget.findMany({
        where: { fiscalYear },
        select: this.budgetSelect(),
      });
      return this.aggregate(rows as BudgetRow[], fiscalYear);
    }

    // Default — aggregate the active portfolio's lifetime budgets.
    const activeProjects = await this.prisma.project.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    if (activeProjects.length === 0) {
      // No active projects at all — keep the response shape stable but
      // attribute the empty result to a sensible fiscal year so the FE
      // header reads naturally.
      return this.aggregate([], await this.resolveDefaultFiscalYear());
    }

    const activeIds = activeProjects.map((p) => p.id);
    const rows = (await this.prisma.projectBudget.findMany({
      where: { projectId: { in: activeIds } },
      select: this.budgetSelect(),
    })) as BudgetRow[];

    const latestYear =
      rows.length > 0
        ? Math.max(...rows.map((r) => r.fiscalYear))
        : await this.resolveDefaultFiscalYear();

    return this.aggregate(rows, latestYear);
  }

  private budgetSelect(): {
    projectId: true;
    fiscalYear: true;
    capexBudget: true;
    opexBudget: true;
    vendorBudget: true;
    actualCost: true;
    earnedValue: true;
  } {
    return {
      projectId: true,
      fiscalYear: true,
      capexBudget: true,
      opexBudget: true,
      vendorBudget: true,
      actualCost: true,
      earnedValue: true,
    };
  }

  private aggregate(rows: BudgetRow[], fiscalYear: number): PortfolioFinanceSummaryDto {
    let totalBudget = 0;
    let totalActualCost = 0;
    let totalEarnedValue = 0;
    let overBudgetProjectCount = 0;
    const projects = new Set<string>();
    for (const r of rows) {
      const bac =
        decimalToNumber(r.capexBudget) +
        decimalToNumber(r.opexBudget) +
        decimalToNumber(r.vendorBudget ?? 0);
      const ac = decimalToNumber(r.actualCost ?? 0);
      const ev = decimalToNumber(r.earnedValue ?? 0);
      totalBudget += bac;
      totalActualCost += ac;
      totalEarnedValue += ev;
      if (bac > 0 && ac > bac) overBudgetProjectCount += 1;
      projects.add(r.projectId);
    }

    const cpi = totalActualCost > 0 ? Math.round((totalEarnedValue / totalActualCost) * 100) / 100 : 0;
    return {
      fiscalYear,
      projectCount: projects.size,
      totalBudget: Math.round(totalBudget),
      totalActualCost: Math.round(totalActualCost),
      totalEarnedValue: Math.round(totalEarnedValue),
      cpi,
      overBudgetProjectCount,
    };
  }

  /**
   * Resolves the latest fiscal year that has at least one ProjectBudget row
   * across the whole table. Used as a stable header label when there are
   * no active projects or no rows tied to them. Falls back to the current
   * calendar year so the response shape stays stable on a fresh tenant.
   */
  private async resolveDefaultFiscalYear(): Promise<number> {
    const groups = await this.prisma.projectBudget.groupBy({
      by: ['fiscalYear'],
      _count: { _all: true },
      orderBy: [{ _count: { fiscalYear: 'desc' } }, { fiscalYear: 'desc' }],
      take: 1,
    });
    return groups[0]?.fiscalYear ?? new Date().getUTCFullYear();
  }
}
