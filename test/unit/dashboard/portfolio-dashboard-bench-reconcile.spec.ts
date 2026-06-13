/**
 * W4-02 — Director dashboard bench/available count reconciliation.
 *
 * Contract: the `benchSize` returned by `/dashboard/portfolio/summary` MUST
 * equal `.length` of the result returned by `/dashboard/portfolio/available-pool`
 * for the same dataset. This was the source of the V2 QA finding "bench count
 * inconsistent (5/132/134/203)" — different surfaces were computing bench
 * against different predicates (strict no-assignment vs partial-allocation +
 * ending-soon). Both endpoints in `PortfolioDashboardService` now share the
 * same `getAvailablePool()` helper; this test pins that contract.
 */
import { PortfolioDashboardService } from '@src/modules/dashboard/application/portfolio-dashboard.service';
import type { ProjectRolePlanService } from '@src/modules/project-registry/application/project-role-plan.service';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

interface FakePerson {
  id: string;
  displayName: string;
  skillsets: string[];
  location: string | null;
}

interface FakePosition {
  activePersonId: string;
  activeAllocationPercent: number;
  activeValidFrom: Date;
  activeValidTo: Date | null;
}

function buildPrismaStub(args: {
  people: FakePerson[];
  positions: FakePosition[];
}): PrismaService {
  return {
    person: {
      findMany: async (_q: unknown) => args.people,
    },
    // SoT PR 14b — portfolio heatmap AND available-pool both now read from
    // the canonical ProjectPosition aggregate, not legacy ProjectAssignment.
    projectPosition: {
      findMany: async (_q: unknown) => args.positions,
      // PR-16 (Decision E) — getPortfolioSummary counts canonical OPEN demand.
      // These fixtures carry no OPEN rows, so the count is 0.
      count: async (q: { where?: { fillStatus?: unknown } }) =>
        args.positions.filter((p) => (p as { fillStatus?: string }).fillStatus === q?.where?.fillStatus).length,
    },
    project: {
      findMany: async (_q: unknown) => [],
    },
    projectVendorEngagement: {
      aggregate: async (_q: unknown) => ({ _sum: { headcount: 0 } }),
    },
  } as unknown as PrismaService;
}

function stubRolePlanService(): ProjectRolePlanService {
  return {
    getRolePlan: async () => [],
    getRolePlanVsActual: async () => ({
      entries: [],
      totalPlanned: 0,
      totalFilled: 0,
      totalGap: 0,
      overallFillRate: 100,
    }),
  } as unknown as ProjectRolePlanService;
}

describe('PortfolioDashboardService — bench / available-pool reconciliation (W4-02)', () => {
  const now = new Date();
  const farFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  it('benchSize on summary equals available-pool length for the same dataset', async () => {
    // 5 active people; 2 are fully booked far-future, 1 is partially allocated
    // (50%), 1 is ending in <30 days, 1 is unassigned (strict bench).
    // Available-pool definition INCLUDES the partial + ending-soon cohort.
    const people: FakePerson[] = [
      { id: 'p1', displayName: 'Alice', skillsets: [], location: null },
      { id: 'p2', displayName: 'Bob', skillsets: [], location: null },
      { id: 'p3', displayName: 'Carol', skillsets: [], location: null },
      { id: 'p4', displayName: 'Dan', skillsets: [], location: null },
      { id: 'p5', displayName: 'Eve', skillsets: [], location: null },
    ];
    const endingSoon = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const positions: FakePosition[] = [
      // p1 fully booked through far future → NOT available
      { activePersonId: 'p1', activeAllocationPercent: 100, activeValidFrom: yesterday, activeValidTo: farFuture },
      // p2 fully booked through far future → NOT available
      { activePersonId: 'p2', activeAllocationPercent: 100, activeValidFrom: yesterday, activeValidTo: farFuture },
      // p3 partial 50% → available (has headroom)
      { activePersonId: 'p3', activeAllocationPercent: 50, activeValidFrom: yesterday, activeValidTo: farFuture },
      // p4 fully booked BUT ending in 15 days → available
      { activePersonId: 'p4', activeAllocationPercent: 100, activeValidFrom: yesterday, activeValidTo: endingSoon },
      // p5 has no row → strict bench → available
    ];

    const prisma = buildPrismaStub({ people, positions });
    const svc = new PortfolioDashboardService(prisma, stubRolePlanService());

    const pool = await svc.getAvailablePool();
    const summary = await svc.getPortfolioSummary();

    // The contract: same number on both surfaces.
    expect(summary.benchSize).toBe(pool.length);
    // And it must be 3 (p3, p4, p5).
    expect(pool.length).toBe(3);
    expect(pool.map((p) => p.id).sort()).toEqual(['p3', 'p4', 'p5']);
  });

  it('benchSize equals available-pool length when every person is fully booked', async () => {
    const people: FakePerson[] = [
      { id: 'p1', displayName: 'Alice', skillsets: [], location: null },
      { id: 'p2', displayName: 'Bob', skillsets: [], location: null },
    ];
    const positions: FakePosition[] = [
      { activePersonId: 'p1', activeAllocationPercent: 100, activeValidFrom: yesterday, activeValidTo: farFuture },
      { activePersonId: 'p2', activeAllocationPercent: 100, activeValidFrom: yesterday, activeValidTo: farFuture },
    ];
    const prisma = buildPrismaStub({ people, positions });
    const svc = new PortfolioDashboardService(prisma, stubRolePlanService());

    const pool = await svc.getAvailablePool();
    const summary = await svc.getPortfolioSummary();

    expect(summary.benchSize).toBe(pool.length);
    expect(pool.length).toBe(0);
  });

  it('benchSize equals available-pool length when every person is on strict bench', async () => {
    const people: FakePerson[] = [
      { id: 'p1', displayName: 'Alice', skillsets: [], location: null },
      { id: 'p2', displayName: 'Bob', skillsets: [], location: null },
      { id: 'p3', displayName: 'Carol', skillsets: [], location: null },
    ];
    const prisma = buildPrismaStub({ people, positions: [] });
    const svc = new PortfolioDashboardService(prisma, stubRolePlanService());

    const pool = await svc.getAvailablePool();
    const summary = await svc.getPortfolioSummary();

    expect(summary.benchSize).toBe(pool.length);
    expect(pool.length).toBe(3);
  });
});
