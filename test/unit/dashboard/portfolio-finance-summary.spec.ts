import { Prisma } from '@prisma/client';

import { PortfolioFinanceSummaryService } from '@src/modules/dashboard/application/portfolio-finance-summary.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakeBudget {
  projectId: string;
  fiscalYear?: number;
  capexBudget: Prisma.Decimal | number;
  opexBudget: Prisma.Decimal | number;
  vendorBudget?: Prisma.Decimal | number | null;
  actualCost?: Prisma.Decimal | number | null;
  earnedValue?: Prisma.Decimal | number | null;
}

interface StubOptions {
  rows: FakeBudget[];
  latestYear?: number | null;
  activeProjectIds?: string[];
}

function buildStub({ rows, latestYear, activeProjectIds }: StubOptions): PrismaService {
  const projectBudget = {
    findMany: async (q: { where?: { fiscalYear?: number; projectId?: { in: string[] } } }) => {
      // The explicit-year path filters by fiscalYear; the default path filters
      // by projectId in active set. The stub honors both.
      if (q.where?.fiscalYear !== undefined) {
        return rows.filter((r) => r.fiscalYear === q.where!.fiscalYear);
      }
      if (q.where?.projectId?.in) {
        const set = new Set(q.where.projectId.in);
        return rows.filter((r) => set.has(r.projectId));
      }
      return rows;
    },
    findFirst: async (_q: unknown) =>
      latestYear === undefined
        ? null
        : latestYear === null
          ? null
          : { fiscalYear: latestYear },
  };
  const project = {
    findMany: async (_q: unknown) =>
      (activeProjectIds ?? []).map((id) => ({ id })),
  };
  return { projectBudget, project } as unknown as PrismaService;
}

const D = (n: number): Prisma.Decimal => new Prisma.Decimal(n);

describe('PortfolioFinanceSummaryService', () => {
  it('returns zeros for an empty fiscal year', async () => {
    const svc = new PortfolioFinanceSummaryService(buildStub({ rows: [] }));
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
      buildStub({
        rows: [
          // Project A — BAC 1000, actual 600 (under), earned 800 → CPI 800/600
          { projectId: 'a', fiscalYear: 2026, capexBudget: D(500), opexBudget: D(400), vendorBudget: D(100), actualCost: D(600), earnedValue: D(800) },
          // Project B — BAC 2000, actual 2400 (over), earned 1800
          { projectId: 'b', fiscalYear: 2026, capexBudget: D(1500), opexBudget: D(500), vendorBudget: null, actualCost: D(2400), earnedValue: D(1800) },
          // Project A again (different workstream) — counts as same project for distinct count
          { projectId: 'a', fiscalYear: 2026, capexBudget: D(200), opexBudget: D(0), vendorBudget: D(0), actualCost: D(100), earnedValue: D(150) },
        ],
      }),
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
      buildStub({
        rows: [
          { projectId: 'a', fiscalYear: 2026, capexBudget: D(500), opexBudget: D(500), actualCost: D(0), earnedValue: D(0) },
        ],
      }),
    );
    const r = await svc.summarize(2026);
    expect(r.cpi).toBe(0);
    expect(r.totalActualCost).toBe(0);
  });

  it('falls back to current year when no active projects + budget table empty', async () => {
    const svc = new PortfolioFinanceSummaryService(buildStub({ rows: [], latestYear: null }));
    const r = await svc.summarize();
    expect(r.fiscalYear).toBe(new Date().getUTCFullYear());
    expect(r.projectCount).toBe(0);
  });

  it('default aggregates active-portfolio budgets across all fiscal years', async () => {
    // Two active projects ('a','b') with budget rows spanning FY 2024-2026.
    // One CLOSED project ('z') contributes a 2026 row that must be EXCLUDED
    // because the default path scopes to active projects only.
    const svc = new PortfolioFinanceSummaryService(
      buildStub({
        rows: [
          { projectId: 'a', fiscalYear: 2024, capexBudget: D(500), opexBudget: D(500), actualCost: D(400), earnedValue: D(800) },
          { projectId: 'a', fiscalYear: 2025, capexBudget: D(700), opexBudget: D(300), actualCost: D(600), earnedValue: D(900) },
          { projectId: 'b', fiscalYear: 2026, capexBudget: D(800), opexBudget: D(200), actualCost: D(500), earnedValue: D(700) },
          { projectId: 'z', fiscalYear: 2026, capexBudget: D(9999), opexBudget: D(0), actualCost: D(0), earnedValue: D(0) },
        ],
        activeProjectIds: ['a', 'b'],
      }),
    );
    const r = await svc.summarize();
    expect(r.projectCount).toBe(2); // a + b
    // Total budget = (500+500) + (700+300) + (800+200) = 3000 (closed 'z' excluded)
    expect(r.totalBudget).toBe(3000);
    // Total actual = 400 + 600 + 500 = 1500
    expect(r.totalActualCost).toBe(1500);
    // Total earned = 800 + 900 + 700 = 2400
    expect(r.totalEarnedValue).toBe(2400);
    // Latest year among active rows = 2026
    expect(r.fiscalYear).toBe(2026);
  });

  it('default returns latest-year fallback when active projects exist but have no budgets', async () => {
    const svc = new PortfolioFinanceSummaryService(
      buildStub({ rows: [], latestYear: 2025, activeProjectIds: ['a'] }),
    );
    const r = await svc.summarize();
    expect(r.fiscalYear).toBe(2025);
    expect(r.projectCount).toBe(0);
    expect(r.totalBudget).toBe(0);
  });

  it('default falls back to current year when no active projects exist', async () => {
    const svc = new PortfolioFinanceSummaryService(
      buildStub({ rows: [], latestYear: null, activeProjectIds: [] }),
    );
    const r = await svc.summarize();
    expect(r.fiscalYear).toBe(new Date().getUTCFullYear());
    expect(r.projectCount).toBe(0);
  });
});
