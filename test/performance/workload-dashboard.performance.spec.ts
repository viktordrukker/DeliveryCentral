import { createSeededInMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/create-seeded-in-memory-project-assignment.repository';
import { WorkloadDashboardQueryService } from '@src/modules/dashboard/application/workload-dashboard-query.service';
import { createSeededInMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/create-seeded-in-memory-person.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { createSeededInMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/create-seeded-in-memory-project.repository';
import { createSeededInMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/create-seeded-in-memory-work-evidence.repository';

describe('workload summary performance baseline', () => {
  it('computes the dashboard summary within an acceptable baseline for demo data', async () => {
    const service = new WorkloadDashboardQueryService(
      createSeededInMemoryPersonRepository(),
      createSeededInMemoryProjectRepository(),
      createSeededInMemoryProjectAssignmentRepository(),
      createSeededInMemoryWorkEvidenceRepository(),
      {
        getAll: async () => ({
          dashboard: {
            evidenceInactiveDaysThreshold: 14,
            nearingClosureDaysThreshold: 30,
            staffingGapDaysThreshold: 28,
          },
        }),
      } as unknown as PlatformSettingsService,
    );
    const startedAt = Date.now();

    await service.execute({ asOf: '2025-03-15T00:00:00.000Z' });

    expect(Date.now() - startedAt).toBeLessThan(1000);
  }, 15_000);
});
