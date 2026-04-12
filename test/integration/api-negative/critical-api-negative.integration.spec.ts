import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { roleHeaders } from '../../helpers/api/auth-headers';
import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { expectSafeErrorResponseShape } from '../../helpers/api/api-response-assertions';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';

describe('API negative paths: assignments, work evidence, and metadata', () => {
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

  it('POST /assignments rejects nonexistent person references', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 25,
      personId: '00000000-0000-0000-0000-000000000001',
      projectId: '33333333-3333-3333-3333-333333333001',
      staffingRole: 'Consultant',
      startDate: '2025-04-01T00:00:00.000Z',
    }).expect(404);

    expectSafeErrorResponseShape(response.body, 404, 'Person does not exist.');
  });

  it('POST /assignments rejects nonexistent project references', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 25,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '00000000-0000-0000-0000-000000000001',
      staffingRole: 'Consultant',
      startDate: '2025-04-01T00:00:00.000Z',
    }).expect(404);

    expectSafeErrorResponseShape(response.body, 404, 'Project does not exist.');
  });

  it('POST /assignments rejects invalid allocation values', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 150,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      staffingRole: 'Consultant',
      startDate: '2025-04-01T00:00:00.000Z',
    }).expect(400);

    expectSafeErrorResponseShape(response.body, 400, /allocation/i);
  });

  it('POST /assignments rejects invalid date ranges', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 25,
      endDate: '2025-03-01T00:00:00.000Z',
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      staffingRole: 'Consultant',
      startDate: '2025-04-01T00:00:00.000Z',
    }).expect(400);

    expectSafeErrorResponseShape(response.body, 400, 'end date must be on or after the start date');
  });

  it('POST /assignments/{id}/approve blocks invalid repeat approval transitions', async () => {
    const client = createApiTestClient(app);

    const created = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 25,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333002',
      staffingRole: 'Reviewer',
      startDate: '2025-08-01T00:00:00.000Z',
    }).expect(201);

    await client.post(`/assignments/${created.body.id}/approve`).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      comment: 'First approval.',
    }).expect(200);

    const response = await client.post(`/assignments/${created.body.id}/approve`).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      comment: 'Second approval should fail.',
    }).expect(400);

    expectSafeErrorResponseShape(response.body, 400, /cannot transition/i);
  });

  it('POST /assignments/{id}/reject blocks rejection after approval', async () => {
    const client = createApiTestClient(app);

    const created = await client.post('/assignments').set(roleHeaders('project_manager')).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 30,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333006',
      staffingRole: 'Planner',
      startDate: '2025-09-01T00:00:00.000Z',
    }).expect(201);

    await client.post(`/assignments/${created.body.id}/approve`).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      comment: 'Approve before invalid rejection.',
    }).expect(200);

    const response = await client.post(`/assignments/${created.body.id}/reject`).send({
      actorId: '11111111-1111-1111-1111-111111111004',
      reason: 'Should be blocked.',
    }).expect(400);

    expectSafeErrorResponseShape(response.body, 400, /cannot transition/i);
  });

  it('POST /work-evidence rejects malformed timestamps', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/work-evidence').send({
      effortHours: 2,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      recordedAt: 'not-a-date',
      sourceRecordKey: 'NEGATIVE-1',
      sourceType: 'MANUAL',
    }).expect(400);

    expectSafeErrorResponseShape(response.body, 400, 'recordedAt is invalid');
  });

  it('POST /work-evidence rejects non-positive effort', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/work-evidence').send({
      effortHours: -1,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      recordedAt: '2025-03-20T00:00:00.000Z',
      sourceRecordKey: 'NEGATIVE-2',
      sourceType: 'MANUAL',
    }).expect(400);

    expectSafeErrorResponseShape(response.body, 400, 'effortHours must be greater than zero');
  });

  it('POST /work-evidence rejects missing source record keys', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/work-evidence').send({
      effortHours: 1.5,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      recordedAt: '2025-03-20T00:00:00.000Z',
      sourceRecordKey: '   ',
      sourceType: 'MANUAL',
    }).expect(400);

    expectSafeErrorResponseShape(response.body, 400, 'sourceRecordKey is required');
  });

  it('GET /metadata/dictionaries/{id} returns a safe 404 for missing dictionaries', async () => {
    const client = createApiTestClient(app);

    const response = await client
      .get('/metadata/dictionaries/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expectSafeErrorResponseShape(response.body, 404, 'Metadata dictionary not found.');
  });
});
