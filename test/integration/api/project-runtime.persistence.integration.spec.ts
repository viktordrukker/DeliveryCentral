import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { roleHeaders } from '../../helpers/api/auth-headers';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';

describe('API integration: project runtime persistence', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    app = await createApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists project lifecycle state across application restart', async () => {
    const client = createApiTestClient(app);

    const created = await client
      .post('/projects')
      .send({
        description: 'Persistent project runtime test.',
        name: 'Runtime Persistence Project',
        plannedEndDate: '2025-07-31T00:00:00.000Z',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-05-01T00:00:00.000Z',
      })
      .expect(201);

    await client.post(`/projects/${created.body.id}/activate`).expect(200);

    await client
      .post('/work-evidence')
      .send({
        effortHours: 8,
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: created.body.id,
        recordedAt: '2025-05-10T00:00:00.000Z',
        sourceRecordKey: 'RUNTIME-PROJECT-CLOSE-1',
        sourceType: 'MANUAL',
        summary: 'Runtime persistence close coverage',
      })
      .expect(201);

    await client
      .post(`/projects/${created.body.id}/close`)
      .set(roleHeaders('project_manager'))
      .expect(200);

    await app.close();
    app = await createApiTestApp();

    const restartedClient = createApiTestClient(app);
    const detail = await restartedClient.get(`/projects/${created.body.id}`).expect(200);

    expect(detail.body).toEqual(
      expect.objectContaining({
        assignmentCount: 0,
        id: created.body.id,
        name: 'Runtime Persistence Project',
        status: 'CLOSED',
      }),
    );

    const persisted = await prisma.project.findUnique({
      where: { id: created.body.id },
    });

    expect(persisted?.status).toBe('CLOSED');
  });
});
