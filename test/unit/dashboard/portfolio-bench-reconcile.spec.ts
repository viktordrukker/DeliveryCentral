import { OrgHealthService } from '@src/modules/dashboard/application/org-health.service';
import { PortfolioDashboardService } from '@src/modules/dashboard/application/portfolio-dashboard.service';
import { ProjectRolePlanService } from '@src/modules/project-registry/application/project-role-plan.service';
import { PrismaService } from '@src/shared/persistence/prisma.service';

/**
 * W4-02 — Reconciliation contract.
 *
 * The bench count returned by `/dashboard/portfolio/available-pool` MUST
 * equal the totalBenchSize returned by `/dashboard/director/org-health`
 * for the same dataset at the same asOf instant. Both surfaces now read
 * from the canonical `bench-query.ts` helper; this test pins the
 * contract so a future refactor cannot regress it.
 */

interface FakePerson {
  id: string;
  displayName: string;
  skillsets: string[];
  location: string | null;
}

interface FakeMembership {
  personId: string;
  orgUnitId: string;
}

interface FakeFillRow {
  activePersonId: string;
}

function buildSharedPrisma(seed: {
  people: FakePerson[];
  memberships: FakeMembership[];
  filledPersonIds: string[];
  orgUnits: Array<{ id: string; code: string; name: string }>;
}): PrismaService {
  const orgUnit = { findMany: async (_q: unknown) => seed.orgUnits };
  const personOrgMembership = { findMany: async (_q: unknown) => seed.memberships };
  const person = {
    findMany: async (q: { where?: { id?: { in: string[] } } }) => {
      if (q.where?.id?.in) {
        const want = new Set(q.where.id.in);
        return seed.people.filter((p) => want.has(p.id));
      }
      return seed.people.map((p) => ({ id: p.id }));
    },
  };
  const projectPosition = {
    groupBy: async (): Promise<FakeFillRow[]> =>
      seed.filledPersonIds.map((id) => ({ activePersonId: id })),
    // Heatmap path is not exercised in these tests; provide a no-op.
    findMany: async () => [],
  };
  const project = { findMany: async () => [] };
  const projectAssignment = { findMany: async () => [] };
  const projectVendorEngagement = {
    aggregate: async () => ({ _sum: { headcount: 0 } }),
  };
  return {
    orgUnit,
    personOrgMembership,
    person,
    projectPosition,
    project,
    projectAssignment,
    projectVendorEngagement,
  } as unknown as PrismaService;
}

class StubRolePlan {
  public async getRolePlan(_id: string) {
    return undefined;
  }
  public async getRolePlanVsActual(_id: string) {
    return { totalPlanned: 0, totalFilled: 0, overallFillRate: 100 };
  }
}

describe('W4-02 — portfolio available-pool reconciles with org-health bench', () => {
  it('available-pool.length === org-health.totalBenchSize for the same dataset', async () => {
    const seed = {
      orgUnits: [
        { id: 'u-eng', code: 'ENG', name: 'Engineering' },
        { id: 'u-ops', code: 'OPS', name: 'Operations' },
      ],
      people: [
        { id: 'p1', displayName: 'Alice', skillsets: [], location: null },
        { id: 'p2', displayName: 'Bob', skillsets: [], location: null },
        { id: 'p3', displayName: 'Carol', skillsets: [], location: null },
        { id: 'p4', displayName: 'Dave', skillsets: [], location: null },
        { id: 'p5', displayName: 'Eve', skillsets: [], location: null },
        { id: 'p6', displayName: 'Frank', skillsets: [], location: null },
      ],
      memberships: [
        { personId: 'p1', orgUnitId: 'u-eng' },
        { personId: 'p2', orgUnitId: 'u-eng' },
        { personId: 'p3', orgUnitId: 'u-eng' },
        { personId: 'p4', orgUnitId: 'u-eng' },
        { personId: 'p5', orgUnitId: 'u-ops' },
        { personId: 'p6', orgUnitId: 'u-ops' },
      ],
      filledPersonIds: ['p1', 'p2', 'p5'], // p3, p4, p6 are on bench
    };
    const prisma = buildSharedPrisma(seed);

    const portfolio = new PortfolioDashboardService(
      prisma,
      new StubRolePlan() as unknown as ProjectRolePlanService,
    );
    const orgHealth = new OrgHealthService(prisma);

    const pool = await portfolio.getAvailablePool();
    const orgHealthOut = await orgHealth.execute();

    expect(pool).toHaveLength(3);
    expect(pool.map((p) => p.id).sort()).toEqual(['p3', 'p4', 'p6']);
    expect(orgHealthOut.totalBenchSize).toBe(3);
    expect(pool.length).toBe(orgHealthOut.totalBenchSize);
  });

  it('reconciles to zero when every active person holds an active fill', async () => {
    const seed = {
      orgUnits: [{ id: 'u-eng', code: 'ENG', name: 'Engineering' }],
      people: [
        { id: 'p1', displayName: 'Alice', skillsets: [], location: null },
        { id: 'p2', displayName: 'Bob', skillsets: [], location: null },
      ],
      memberships: [
        { personId: 'p1', orgUnitId: 'u-eng' },
        { personId: 'p2', orgUnitId: 'u-eng' },
      ],
      filledPersonIds: ['p1', 'p2'],
    };
    const prisma = buildSharedPrisma(seed);

    const portfolio = new PortfolioDashboardService(
      prisma,
      new StubRolePlan() as unknown as ProjectRolePlanService,
    );
    const orgHealth = new OrgHealthService(prisma);

    const pool = await portfolio.getAvailablePool();
    const orgHealthOut = await orgHealth.execute();

    expect(pool).toHaveLength(0);
    expect(orgHealthOut.totalBenchSize).toBe(0);
    expect(pool.length).toBe(orgHealthOut.totalBenchSize);
  });

  it('available-pool excludes people with partial allocation (canonical bench is strict)', async () => {
    // Regression: pre-W4-02 this endpoint widened the set to include
    // anyone with <100% allocation or an assignment ending within 30
    // days. Canonical bench is now "no active fill at all". A person
    // with a partial fill is staffed and MUST NOT appear in the pool.
    const seed = {
      orgUnits: [{ id: 'u-eng', code: 'ENG', name: 'Engineering' }],
      people: [
        { id: 'p1', displayName: 'Partial', skillsets: [], location: null }, // 50% allocated
        { id: 'p2', displayName: 'OnBench', skillsets: [], location: null }, // no fill
      ],
      memberships: [
        { personId: 'p1', orgUnitId: 'u-eng' },
        { personId: 'p2', orgUnitId: 'u-eng' },
      ],
      filledPersonIds: ['p1'], // p1 is on a position (any %)
    };
    const prisma = buildSharedPrisma(seed);

    const portfolio = new PortfolioDashboardService(
      prisma,
      new StubRolePlan() as unknown as ProjectRolePlanService,
    );
    const orgHealth = new OrgHealthService(prisma);

    const pool = await portfolio.getAvailablePool();
    const orgHealthOut = await orgHealth.execute();

    expect(pool.map((p) => p.id)).toEqual(['p2']);
    expect(pool.length).toBe(orgHealthOut.totalBenchSize);
    expect(orgHealthOut.totalBenchSize).toBe(1);
  });
});
