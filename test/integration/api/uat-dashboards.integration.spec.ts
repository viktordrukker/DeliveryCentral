import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TestingModuleBuilder } from '@nestjs/testing';

import { NodemailerSmtpEmailTransport } from '@src/modules/notifications/infrastructure/adapters/nodemailer-smtp-email.transport';
import { InMemoryEmailTransport } from '@src/modules/notifications/infrastructure/adapters/in-memory-email.transport';
import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';
import { seedDemoWorkEvidenceRuntimeData } from '../../helpers/db/seed-demo-work-evidence-runtime-data';
import { runUatDashboardsScenario } from '../../helpers/scenarios/run-uat-dashboards';

describe('UAT dashboards: role-based operational validation', () => {
  let app: INestApplication;
  let emailTransport: InMemoryEmailTransport;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);
    await seedDemoWorkEvidenceRuntimeData(prisma);
    emailTransport = new InMemoryEmailTransport();
    app = await createApiTestApp((builder: TestingModuleBuilder) =>
      builder.overrideProvider(NodemailerSmtpEmailTransport).useValue(emailTransport),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('validates PM, RM, HR, Team Delivery, and Admin dashboard usefulness from deterministic scenarios', async () => {
    const client = createApiTestClient(app);
    const result = await runUatDashboardsScenario(client);

    expect(result.hrHeadcountDelta).toBe(3);
    expect(result.managedProjectIds.length).toBeGreaterThan(0);
    expect(result.notificationEvents).toEqual(
      expect.arrayContaining(['assignment.created', 'assignment.approved', 'project.activated']),
    );
    expect(result.exceptionCategories).toEqual(
      expect.arrayContaining([
        'PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS',
        'WORK_EVIDENCE_WITHOUT_ASSIGNMENT',
        'ASSIGNMENT_WITHOUT_EVIDENCE',
      ]),
    );
    expect(result.integrationStatuses).toEqual(
      expect.arrayContaining([expect.stringMatching(/^(FAILED|SUCCEEDED)$/)]),
    );
    expect(result.teamId).toBe('26666666-0000-0000-0000-000000000001');
  });
});
