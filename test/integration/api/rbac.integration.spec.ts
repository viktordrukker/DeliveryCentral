import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { roleHeaders } from '../../helpers/api/auth-headers';
import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';

describe('API integration: RBAC enforcement', () => {
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

  it('blocks assignment creation without an authenticated principal', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/assignments').send({
      actorId: '11111111-1111-1111-1111-111111111004',
      allocationPercent: 25,
      personId: '11111111-1111-1111-1111-111111111012',
      projectId: '33333333-3333-3333-3333-333333333001',
      staffingRole: 'Consultant',
      startDate: '2025-04-01T00:00:00.000Z',
    }).expect(401);

    expect(response.body.message).toBe('Authentication principal is required.');
  });

  it('blocks assignment creation for unauthorized roles', async () => {
    const client = createApiTestClient(app);

    const response = await client
      .post('/assignments')
      .set(roleHeaders('employee'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111004',
        allocationPercent: 25,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333001',
        staffingRole: 'Consultant',
        startDate: '2025-04-01T00:00:00.000Z',
      })
      .expect(403);

    expect(response.body.message).toBe('Insufficient role for this operation.');
  });

  it('allows assignment creation for a project manager', async () => {
    const client = createApiTestClient(app);

    await client
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111004',
        allocationPercent: 25,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333001',
        staffingRole: 'Consultant',
        startDate: '2025-04-01T00:00:00.000Z',
      })
      .expect(201);
  });

  it('blocks org modification for an employee role', async () => {
    const client = createApiTestClient(app);

    const response = await client
      .post('/org/people')
      .set(roleHeaders('employee'))
      .send({
        email: 'blocked.employee@example.com',
        name: 'Blocked Employee',
        orgUnitId: '22222222-2222-2222-2222-222222222006',
      })
      .expect(403);

    expect(response.body.message).toBe('Insufficient role for this operation.');
  });

  it('allows org modification for hr manager', async () => {
    const client = createApiTestClient(app);

    await client
      .post('/org/people')
      .set(roleHeaders('hr_manager'))
      .send({
        email: 'allowed.hr@example.com',
        name: 'Allowed Hr',
        orgUnitId: '22222222-2222-2222-2222-222222222006',
      })
      .expect(201);
  });

  it('blocks project closure for resource manager', async () => {
    const client = createApiTestClient(app);

    const created = await client
      .post('/projects')
      .send({
        name: 'RBAC Closure Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await client.post(`/projects/${created.body.id}/activate`).expect(200);

    const response = await client
      .post(`/projects/${created.body.id}/close`)
      .set(roleHeaders('resource_manager'))
      .expect(403);

    expect(response.body.message).toBe('Insufficient role for this operation.');
  });

  it('allows project closure for director', async () => {
    const client = createApiTestClient(app);

    const created = await client
      .post('/projects')
      .send({
        name: 'Director Closure Project',
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await client.post(`/projects/${created.body.id}/activate`).expect(200);

    await client
      .post('/work-evidence')
      .send({
        effortHours: 8,
        personId: '11111111-1111-1111-1111-111111111008',
        projectId: created.body.id,
        recordedAt: '2025-06-10T00:00:00.000Z',
        sourceRecordKey: 'RBAC-CLOSE-1',
        sourceType: 'MANUAL',
      })
      .expect(201);

    await client
      .post(`/projects/${created.body.id}/close`)
      .set(roleHeaders('director'))
      .expect(200);
  });
});
