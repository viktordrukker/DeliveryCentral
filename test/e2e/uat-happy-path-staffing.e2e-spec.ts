import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { NodemailerSmtpEmailTransport } from '@src/modules/notifications/infrastructure/adapters/nodemailer-smtp-email.transport';
import { InMemoryEmailTransport } from '@src/modules/notifications/infrastructure/adapters/in-memory-email.transport';

import { createApiTestClient } from '../helpers/api-test-client.helper';
import { createApiTestApp } from '../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../helpers/db/seed-demo-organization-runtime-data';
import { runUatHappyPathStaffingScenario } from '../helpers/scenarios/run-uat-happy-path-staffing';


describe('platform e2e: UAT happy-path staffing scenario', () => {
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

  it('executes the core staffing lifecycle with durable reads and recorded operational signals', async () => {
    const client = createApiTestClient(app);
    const result = await runUatHappyPathStaffingScenario(client);

    expect(result).toEqual(
      expect.objectContaining({
        assignmentId: expect.any(String),
        createdEmployeeId: expect.any(String),
        projectId: expect.any(String),
      }),
    );
  });
});
