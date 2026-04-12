import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { M365DirectorySyncService } from '@src/modules/integrations/m365/application/m365-directory-sync.service';
import { InMemoryM365DirectoryReconciliationRecordRepository } from '@src/modules/integrations/m365/infrastructure/repositories/in-memory/in-memory-m365-directory-reconciliation-record.repository';
import { InMemoryRadiusReconciliationRecordRepository } from '@src/modules/integrations/radius/infrastructure/repositories/in-memory/in-memory-radius-reconciliation-record.repository';

import { createApiTestClient } from '../helpers/api-test-client.helper';
import { createApiTestApp } from '../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { runUatStaffingAnomaliesScenario } from '../helpers/scenarios/run-uat-staffing-anomalies';


describe('platform e2e: UAT staffing anomalies and exclusions', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);

    app = await createApiTestApp((builder) =>
      builder
        .overrideProvider(M365DirectorySyncService)
        .useValue({
          syncDirectory: async () => {
            throw new Error('Simulated M365 degradation during anomaly UAT pack.');
          },
        })
        .overrideProvider(InMemoryM365DirectoryReconciliationRecordRepository)
        .useValue(new InMemoryM365DirectoryReconciliationRecordRepository())
        .overrideProvider(InMemoryRadiusReconciliationRecordRepository)
        .useValue(new InMemoryRadiusReconciliationRecordRepository()),
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('executes the core anomaly pack through the live app shell with deterministic exclusion outcomes', async () => {
    const client = createApiTestClient(app);
    const result = await runUatStaffingAnomaliesScenario(client);

    expect(result.closureConflictExceptionId).toEqual(expect.any(String));
    expect(result.plannedVsActualAnomalyTypes).toEqual(expect.arrayContaining([expect.any(String)]));
  });
});
