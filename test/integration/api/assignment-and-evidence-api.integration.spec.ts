import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { roleHeaders } from '../../helpers/api/auth-headers';
import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { expectErrorResponseShape } from '../../helpers/api/api-response-assertions';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';

describe('API integration: assignments and work evidence', () => {
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

  it('POST /assignments creates a formal assignment', async () => {
    const client = createApiTestClient(app);
    const response = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 25,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      staffingRole: 'Consultant',
      startDate: '2025-04-01T00:00:00.000Z',
    }).expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        allocationPercent: 25,
        id: expect.any(String),
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333001',
        staffingRole: 'Consultant',
        status: 'REQUESTED',
      }),
    );
  });

  it('POST /assignments/{id}/approve transitions assignment state', async () => {
    const client = createApiTestClient(app);
    const created = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 35,
      personId: '11111111-1111-1111-1111-111111111011',
      projectId: '33333333-3333-3333-3333-333333333002',
      staffingRole: 'Consultant',
      startDate: '2025-05-01T00:00:00.000Z',
    }).expect(201);

    const approved = await client.post(`/assignments/${created.body.id}/approve`).send({
      actorId: '11111111-1111-1111-1111-111111111006',
      comment: 'Approved through API integration test.',
    }).expect(200);

    expect(approved.body).toEqual(
      expect.objectContaining({
        id: created.body.id,
        status: 'APPROVED',
      }),
    );
  });

  it('POST /assignments/{id}/end transitions an approved assignment to ended', async () => {
    const client = createApiTestClient(app);
    const created = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 35,
      endDate: '2025-05-31T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111011',
      projectId: '33333333-3333-3333-3333-333333333002',
      staffingRole: 'Consultant',
      startDate: '2025-05-01T00:00:00.000Z',
    }).expect(201);

    await client.post(`/assignments/${created.body.id}/approve`).send({
      actorId: '11111111-1111-1111-1111-111111111006',
      comment: 'Approved through API integration test.',
    }).expect(200);

    const ended = await client
      .post(`/assignments/${created.body.id}/end`)
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        endDate: '2025-05-20T00:00:00.000Z',
        reason: 'Completed early.',
      })
      .expect(200);

    expect(ended.body).toEqual(
      expect.objectContaining({
        endDate: '2025-05-20T00:00:00.000Z',
        id: created.body.id,
        status: 'ENDED',
      }),
    );
  });

  it('POST /assignments returns consistent validation errors', async () => {
    const client = createApiTestClient(app);
    const response = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 140,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      staffingRole: 'Consultant',
      startDate: '2025-05-01T00:00:00.000Z',
    }).expect(400);

    expectErrorResponseShape(response.body, 400);
  });

  it('POST /work-evidence creates evidence without mutating assignments', async () => {
    const client = createApiTestClient(app);
    const created = await client.post('/work-evidence').send({
      effortHours: 3,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      recordedAt: '2025-03-20T00:00:00.000Z',
      sourceType: 'MANUAL',
      sourceRecordKey: 'MANUAL-API-1',
      summary: 'Manual evidence from API integration test.',
    }).expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        effortHours: 3,
        id: expect.any(String),
        recordedAt: '2025-03-20T00:00:00.000Z',
        sourceType: 'MANUAL',
      }),
    );

    const listedAssignments = await client.get('/assignments').expect(200);
    expect(Array.isArray(listedAssignments.body.items)).toBe(true);
  });

  it('GET /work-evidence lists evidence records with filter compatibility', async () => {
    const client = createApiTestClient(app);

    await client.post('/work-evidence').send({
      effortHours: 2,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      recordedAt: '2025-03-21T00:00:00.000Z',
      sourceType: 'MANUAL',
      sourceRecordKey: 'MANUAL-API-2',
      summary: 'Manual evidence record two.',
    }).expect(201);

    const listed = await client
      .get('/work-evidence?personId=11111111-1111-1111-1111-111111111012&sourceType=MANUAL')
      .expect(200);

    expect(Array.isArray(listed.body.items)).toBe(true);
    expect(listed.body.items[0]).toEqual(
      expect.objectContaining({
        activityDate: expect.any(String),
        effortHours: expect.any(Number),
        id: expect.any(String),
        personId: expect.any(String),
        projectId: expect.any(String),
        sourceType: expect.any(String),
      }),
    );
  });

  it('rejects assignment creation for an inactive employee', async () => {
    const client = createApiTestClient(app);

    await client
      .post('/org/people/11111111-1111-1111-1111-111111111001/deactivate')
      .set(roleHeaders('hr_manager'))
      .expect(200);

    const response = await client
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111004',
        allocationPercent: 20,
        personId: '11111111-1111-1111-1111-111111111001',
        projectId: '33333333-3333-3333-3333-333333333001',
        staffingRole: 'Consultant',
        startDate: '2025-04-01T00:00:00.000Z',
      })
      .expect(400);

    expectErrorResponseShape(response.body, 400);
  });
});
