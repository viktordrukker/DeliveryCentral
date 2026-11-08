import { createSeededInMemoryOrgUnitRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-org-unit.repository';
import { createSeededInMemoryPersonOrgMembershipRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person-org-membership.repository';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { createSeededInMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/create-seeded-in-memory-project.repository';
import { createSeededInMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/create-seeded-in-memory-work-evidence.repository';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { DirectorDashboardQueryService } from '@src/modules/dashboard/application/director-dashboard-query.service';
import { WorkloadDashboardQueryService } from '@src/modules/dashboard/application/workload-dashboard-query.service';

const BUDGET_MS = 2000;
const AS_OF = '2025-03-15T00:00:00.000Z';

const mockSettings = {
  getAll: async () => ({
    dashboard: {
      evidenceInactiveDaysThreshold: 14,
      nearingClosureDaysThreshold: 30,
      staffingGapDaysThreshold: 28,
    },
  }),
} as unknown as PlatformSettingsService;

// SoT PR 14b — the dashboard services now read fills from
// `prisma.projectPosition` instead of the legacy seeded assignment repo.
// Stub returns an empty position list — the budget test only measures the
// hot-path latency of the aggregation logic, not data shape.
function makePrismaStub(): PrismaService {
  const empty = jest.fn().mockResolvedValue([]);
  return {
    projectPosition: { findMany: empty },
    person: { findMany: empty },
    project: { findMany: empty },
    projectVendorEngagement: { aggregate: jest.fn().mockResolvedValue({ _sum: { headcount: 0 } }) },
  } as unknown as PrismaService;
}

describe('dashboard scaling budgets (demo data)', () => {
  it('workload dashboard completes within budget', async () => {
    const service = new WorkloadDashboardQueryService(
      createSeededInMemoryPersonRepository(),
      createSeededInMemoryProjectRepository(),
      makePrismaStub(),
      createSeededInMemoryWorkEvidenceRepository(),
      mockSettings,
    );
    const start = Date.now();
    const result = await service.execute({ asOf: AS_OF });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(BUDGET_MS);
    expect(result.totalActiveProjects).toBeGreaterThanOrEqual(0);
  }, 15_000);

  it('director dashboard completes within budget', async () => {
    const service = new DirectorDashboardQueryService(
      createSeededInMemoryPersonRepository(),
      createSeededInMemoryOrgUnitRepository(),
      createSeededInMemoryPersonOrgMembershipRepository(),
      createSeededInMemoryProjectRepository(),
      makePrismaStub(),
    );
    const start = Date.now();
    const result = await service.execute({ asOf: AS_OF });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(BUDGET_MS);
    expect(result.summary.activeProjectCount).toBeGreaterThanOrEqual(0);
    expect(result.weeklyTrend.length).toBe(8);
    expect(result.unitUtilisation).toBeDefined();
  }, 15_000);

  it('workload dashboard second call uses cache and is fast', async () => {
    const service = new WorkloadDashboardQueryService(
      createSeededInMemoryPersonRepository(),
      createSeededInMemoryProjectRepository(),
      makePrismaStub(),
      createSeededInMemoryWorkEvidenceRepository(),
      mockSettings,
    );
    await service.execute({ asOf: AS_OF });

    const start = Date.now();
    await service.execute({ asOf: AS_OF });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50);
  }, 15_000);
});
