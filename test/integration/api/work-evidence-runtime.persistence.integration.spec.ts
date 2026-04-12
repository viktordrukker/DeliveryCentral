import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';

describe('API integration: work evidence runtime persistence', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    app = await createApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists work evidence across application restart without mutating assignments', async () => {
    const client = createApiTestClient(app);

    const created = await client
      .post('/work-evidence')
      .send({
        details: { activity: 'analysis' },
        effortHours: 3.5,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333002',
        recordedAt: '2025-03-20T12:00:00.000Z',
        sourceRecordKey: 'RUNTIME-WE-001',
        sourceType: 'MANUAL',
        summary: 'Runtime persistence evidence',
      })
      .expect(201);

    const assignmentCountBeforeRestart = await prisma.projectAssignment.count();

    await app.close();
    app = await createApiTestApp();

    const restartedClient = createApiTestClient(app);
    const listed = await restartedClient
      .get('/work-evidence?personId=11111111-1111-1111-1111-111111111012&sourceType=MANUAL')
      .expect(200);

    expect(listed.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          personId: '11111111-1111-1111-1111-111111111012',
          projectId: '33333333-3333-3333-3333-333333333002',
          sourceType: 'MANUAL',
        }),
      ]),
    );

    expect(await prisma.projectAssignment.count()).toBe(assignmentCountBeforeRestart);
  });
});
