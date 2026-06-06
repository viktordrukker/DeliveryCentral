/**
 * TENANCY-AUDIT-3-AGGREGATORS — PortfolioRadiatorService.
 *
 * Documented assumption: this aggregator does NOT filter by `tenantId`
 * today. The platform runs single-tenant (TENANT_ISOLATION_ENABLED=false)
 * and isolation will come from DM-7.5-5 RLS once enabled — see
 * `docs/planning/tenancy-assumptions.md` for the full audit.
 *
 * EXTRA CAVEAT: the service caches `radiator:portfolio` for 60 s as a
 * global (non-tenant-scoped) key. When RLS is enabled, this cache key
 * must be re-keyed per tenant (or evicted on tenant switch) or it WILL
 * leak across tenants regardless of the Prisma-level filter. This test
 * invalidates the cache via `simple-cache` between runs to ensure a
 * clean read each time.
 *
 * This test exercises `getPortfolio()` against a real test database
 * with rows belonging to TWO tenants and asserts the CURRENT (pre-RLS)
 * behavior: BOTH tenants' projects appear in the portfolio result.
 * When RLS is enabled, this test should be flipped to assert isolation.
 */

import { PrismaClient } from '@prisma/client';

import { PortfolioRadiatorService } from '@src/modules/project-registry/application/portfolio-radiator.service';
import type { RadiatorScoringService } from '@src/modules/project-registry/application/radiator-scoring.service';
import type {
  RadiatorBand,
  RadiatorSnapshotDto,
} from '@src/modules/project-registry/application/contracts/radiator.dto';
import { invalidateCache } from '@src/shared/cache/simple-cache';
import type { PrismaService } from '@src/shared/persistence/prisma.service';

const hasDb = !!(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

function stubSnapshot(projectId: string): RadiatorSnapshotDto {
  const band: RadiatorBand = 'GREEN';
  return {
    snapshotId: null,
    projectId,
    weekStarting: '2026-06-01',
    overallScore: 80,
    overallBand: band,
    quadrants: [
      { key: 'scope', score: 80, band, subs: [] },
      { key: 'schedule', score: 80, band, subs: [] },
      { key: 'budget', score: 80, band, subs: [] },
      { key: 'people', score: 80, band, subs: [] },
    ],
    narrative: null,
    accomplishments: null,
    nextSteps: null,
    riskSummary: null,
    recordedByPersonId: null,
    createdAt: null,
  };
}

describeIfDb('TENANCY-AUDIT — PortfolioRadiatorService', () => {
  let prisma: PrismaClient;
  let service: PortfolioRadiatorService;

  // Two tenants.
  const tenantAId = 'cccc1111-0000-0000-0000-000000000001';
  const tenantBId = 'cccc1111-0000-0000-0000-000000000002';

  const projectAId = 'cccc2222-0000-0000-0000-000000000001';
  const projectBId = 'cccc2222-0000-0000-0000-000000000002';

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!;
    prisma = new PrismaClient({ datasources: { db: { url } } });

    // Stub the scoring service — `getPortfolio()` only uses
    // `computeRadiator()` per project, not its dependencies, and the
    // tenant audit focuses on the project-level `findMany`.
    const scoringStub: Pick<RadiatorScoringService, 'computeRadiator'> = {
      computeRadiator: async (projectId: string) => stubSnapshot(projectId),
    };

    service = new PortfolioRadiatorService(
      prisma as unknown as PrismaService,
      scoringStub as RadiatorScoringService,
    );
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  async function cleanup(): Promise<void> {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Project" WHERE "id" = ANY($1::uuid[])`,
      [projectAId, projectBId],
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Tenant" WHERE "id" = ANY($1::uuid[])`,
      [tenantAId, tenantBId],
    );
  }

  beforeEach(async () => {
    // Ensure the per-invocation cache does not bleed between tests.
    invalidateCache('radiator:portfolio');
    await cleanup();

    await prisma.tenant.createMany({
      data: [
        { id: tenantAId, code: 'tenant-a-rad', name: 'Tenant A (rad)' },
        { id: tenantBId, code: 'tenant-b-rad', name: 'Tenant B (rad)' },
      ],
    });

    await prisma.project.createMany({
      data: [
        {
          id: projectAId,
          name: 'Tenant A Portfolio Project',
          projectCode: 'PRJ-RAD-A',
          status: 'ACTIVE',
          tenantId: tenantAId,
        },
        {
          id: projectBId,
          name: 'Tenant B Portfolio Project',
          projectCode: 'PRJ-RAD-B',
          status: 'ACTIVE',
          tenantId: tenantBId,
        },
      ],
    });
  });

  afterEach(async () => {
    invalidateCache('radiator:portfolio');
    await cleanup();
  });

  it('returns projects from BOTH tenants in the portfolio (documents pre-RLS single-tenant assumption)', async () => {
    // No tenantId filter on the `findMany`, so both tenants' ACTIVE
    // projects appear. Once DM-7.5-5 RLS is enabled, only the in-scope
    // tenant's project should appear here — flip the expectation then,
    // and also re-key the `PORTFOLIO_CACHE_KEY` to be tenant-scoped.
    const result = await service.getPortfolio();

    const ids = new Set(result.map((r) => r.projectId));
    expect(ids.has(projectAId)).toBe(true);
    expect(ids.has(projectBId)).toBe(true);
  });
});
