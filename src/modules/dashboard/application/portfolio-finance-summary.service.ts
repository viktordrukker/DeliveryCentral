import { Injectable } from '@nestjs/common';

import { decimalToNumber } from '@src/shared/persistence/decimal';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { PortfolioFinanceSummaryDto } from './contracts/portfolio-finance-summary.dto';

/**
 * BE-track / Director finance band — portfolio-level rollup over the
 * ProjectBudget table for one fiscal year. Pure aggregation; no per-project
 * fan-out (a single Prisma query). Decimal columns flow through
 * decimalToNumber so Decimal.js objects never reach the controller.
 */
@Injectable()
export class PortfolioFinanceSummaryService {
  public constructor(private readonly prisma: PrismaService) {}

  public async summarize(fiscalYear?: number): Promise<PortfolioFinanceSummaryDto> {
    const year = fiscalYear ?? new Date().getUTCFullYear();
    const rows = await this.prisma.projectBudget.findMany({
      where: { fiscalYear: year },
      select: {
        projectId: true,
        capexBudget: true,
        opexBudget: true,
        vendorBudget: true,
        actualCost: true,
        earnedValue: true,
      },
    });

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
      fiscalYear: year,
      projectCount: projects.size,
      totalBudget: Math.round(totalBudget),
      totalActualCost: Math.round(totalActualCost),
      totalEarnedValue: Math.round(totalEarnedValue),
      cpi,
      overBudgetProjectCount,
    };
  }
}
