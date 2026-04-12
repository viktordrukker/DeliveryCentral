import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { roleHeaders } from '../../helpers/api/auth-headers';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';

describe('API integration: assignment runtime persistence', () => {
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

  it('persists assignment lifecycle state across application restart', async () => {
    const client = createApiTestClient(app);

    const created = await client
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111004',
        allocationPercent: 40,
        endDate: '2025-06-30T00:00:00.000Z',
        note: 'Persistent assignment runtime test.',
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333001',
        staffingRole: 'Consultant',
        startDate: '2025-05-01T00:00:00.000Z',
      })
      .expect(201);

    await client
      .post(`/assignments/${created.body.id}/approve`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        comment: 'Approved for runtime persistence.',
      })
      .expect(200);

    await client
      .post(`/assignments/${created.body.id}/end`)
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        endDate: '2025-06-15T00:00:00.000Z',
        reason: 'Delivered earlier than planned.',
      })
      .expect(200);

    await app.close();
    app = await createApiTestApp();

    const restartedClient = createApiTestClient(app);
    const detail = await restartedClient.get(`/assignments/${created.body.id}`).expect(200);

    expect(detail.body).toEqual(
      expect.objectContaining({
        approvalState: 'ENDED',
        endDate: '2025-06-15T00:00:00.000Z',
        id: created.body.id,
      }),
    );

    expect(
      await prisma.assignmentApproval.count({
        where: { assignmentId: created.body.id },
      }),
    ).toBe(2);
    expect(
      await prisma.assignmentHistory.count({
        where: { assignmentId: created.body.id },
      }),
    ).toBe(3);
  });
});
