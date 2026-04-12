import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { NodemailerSmtpEmailTransport } from '@src/modules/notifications/infrastructure/adapters/nodemailer-smtp-email.transport';
import { InMemoryEmailTransport } from '@src/modules/notifications/infrastructure/adapters/in-memory-email.transport';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { runUatHappyPathStaffingScenario } from '../../helpers/scenarios/run-uat-happy-path-staffing';


describe('API integration: UAT happy-path staffing scenario', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);

    const emailTransport = new InMemoryEmailTransport();
    app = await createApiTestApp((builder) =>
      builder.overrideProvider(NodemailerSmtpEmailTransport).useValue(emailTransport),
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

  it('runs the staffing happy path through durable APIs with audit and notification visibility', async () => {
    const client = createApiTestClient(app);
    const result = await runUatHappyPathStaffingScenario(client);

    expect(result.createdEmployeeId).toEqual(expect.any(String));
    expect(result.projectId).toEqual(expect.any(String));
    expect(result.assignmentId).toEqual(expect.any(String));
    expect(result.notificationEvents).toEqual(
      expect.arrayContaining(['project.activated', 'assignment.created', 'assignment.approved']),
    );
  });
});
