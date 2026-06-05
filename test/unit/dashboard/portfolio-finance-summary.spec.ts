import { Prisma } from '@prisma/client';

import { PortfolioFinanceSummaryService } from '@src/modules/dashboard/application/portfolio-finance-summary.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeBudget {
  projectId: string;
  capexBudget: Prisma.Decimal | number;
  opexBudget: Prisma.Decimal | number;
  vendorBudget?: Prisma.Decimal | number | null;
  actualCost?: Prisma.Decimal | number | null;
  earnedValue?: Prisma.Decimal | number | null;
}

function buildStub(rows: FakeBudget[], latestYear?: number | null): PrismaService {
  const projectBudget = {
    findMany: async (_q: unknown) => rows,
    findFirst: async (_q: unknown) =>
      latestYear === undefined
        ? null
        : latestYear === null
          ? null
          : { fiscalYear: latestYear },
  };
  return { projectBudget } as unknown as PrismaService;
}

const D = (n: number): Prisma.Decimal => new Prisma.Decimal(n);

describe('PortfolioFinanceSummaryService', () => {
  it('returns zeros for an empty fiscal year', async () => {
    const svc = new PortfolioFinanceSummaryService(buildStub([]));
    const r = await svc.summarize(2026);
    expect(r).toEqual({
      fiscalYear: 2026,
      projectCount: 0,
      totalBudget: 0,
      totalActualCost: 0,
      totalEarnedValue: 0,
      cpi: 0,
      overBudgetProjectCount: 0,
    });
  });

  it('aggregates budget components, counts distinct projects, and computes CPI', async () => {
    const svc = new PortfolioFinanceSummaryService(
      buildStub([
        // Project A — BAC 1000, actual 600 (under), earned 800 → CPI 800/600
        { projectId: 'a', capexBudget: D(500), opexBudget: D(400), vendorBudget: D(100), actualCost: D(600), earnedValue: D(800) },
        // Project B — BAC 2000, actual 2400 (over), earned 1800
        { projectId: 'b', capexBudget: D(1500), opexBudget: D(500), vendorBudget: null, actualCost: D(2400), earnedValue: D(1800) },
        // Project A again (different workstream) — counts as same project for distinct count
        { projectId: 'a', capexBudget: D(200), opexBudget: D(0), vendorBudget: D(0), actualCost: D(100), earnedValue: D(150) },
      ]),
    );
    const r = await svc.summarize(2026);
    expect(r.projectCount).toBe(2); // distinct projects
    // Total budget = 1000 + 2000 + 200 = 3200
    expect(r.totalBudget).toBe(3200);
    // Total actual = 600 + 2400 + 100 = 3100
    expect(r.totalActualCost).toBe(3100);
    // Total earned = 800 + 1800 + 150 = 2750
    expect(r.totalEarnedValue).toBe(2750);
    // CPI = 2750 / 3100 ≈ 0.89
    expect(r.cpi).toBe(0.89);
    // Over-budget rows: only project B's first row (2400 > 2000). Project A
    // first row (600 < 1000) and the workstream row (100 < 200) are under.
    expect(r.overBudgetProjectCount).toBe(1);
  });

  it('CPI is 0 when total actual cost is zero (no division by zero)', async () => {
    const svc = new PortfolioFinanceSummaryService(
      buildStub([
        { projectId: 'a', capexBudget: D(500), opexBudget: D(500), actualCost: D(0), earnedValue: D(0) },
      ]),
    );
    const r = await svc.summarize(2026);
    expect(r.cpi).toBe(0);
    expect(r.totalActualCost).toBe(0);
  });

  it('defaults to the latest fiscal year with budget rows when none provided', async () => {
    const svc = new PortfolioFinanceSummaryService(buildStub([], 2025));
    const r = await svc.summarize();
    expect(r.fiscalYear).toBe(2025);
  });

  it('falls back to current year when the budget table is empty', async () => {
    const svc = new PortfolioFinanceSummaryService(buildStub([], null));
    const r = await svc.summarize();
    expect(r.fiscalYear).toBe(new Date().getUTCFullYear());
  });
});
