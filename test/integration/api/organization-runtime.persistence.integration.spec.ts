import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { roleHeaders } from '../../helpers/api/auth-headers';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';

describe('API integration: organization runtime persistence', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await app?.close();
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    app = await createApiTestApp();
  });

  afterEach(async () => {
    await app?.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('persists employee and reporting-line changes across app restart', async () => {
    const client = createApiTestClient(app);
    const uniqueKey = randomUUID().slice(0, 8);
    const employeeEmail = `org-runtime-${uniqueKey}@example.com`;

    const createdEmployee = await client
      .post('/org/people')
      .set(roleHeaders('hr_manager'))
      .send({
        email: employeeEmail,
        name: `Runtime User ${uniqueKey}`,
        orgUnitId: '22222222-2222-2222-2222-222222222005',
        skillsets: ['Delivery'],
      })
      .expect(201);

    await client
      .post('/org/reporting-lines')
      .set(roleHeaders('hr_manager'))
      .send({
        managerId: '11111111-1111-1111-1111-111111111006',
        personId: createdEmployee.body.id,
        startDate: '2025-04-01T00:00:00.000Z',
        type: 'SOLID',
      })
      .expect(201);

    await app.close();

    app = await createApiTestApp();
    const restartedClient = createApiTestClient(app);

    const personResponse = await restartedClient
      .get(`/org/people/${createdEmployee.body.id}`)
      .expect(200);
    expect(personResponse.body).toEqual(
      expect.objectContaining({
        currentLineManager: expect.objectContaining({
          id: '11111111-1111-1111-1111-111111111006',
        }),
        displayName: `Runtime User ${uniqueKey}`,
        id: createdEmployee.body.id,
        primaryEmail: employeeEmail,
      }),
    );

    const scopeResponse = await restartedClient
      .get('/org/managers/11111111-1111-1111-1111-111111111006/scope?page=1&pageSize=50&asOf=2025-04-15T00:00:00.000Z')
      .expect(200);

    expect(scopeResponse.body.directReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdEmployee.body.id,
        }),
      ]),
    );
  });

  it('persists team creation and membership changes across app restart', async () => {
    const client = createApiTestClient(app);
    const teamCode = `POOL-${randomUUID().slice(0, 8).toUpperCase()}`;

    const createdTeam = await client
      .post('/teams')
      .send({
        code: teamCode,
        description: 'Persistent runtime team',
        name: `Persistent Team ${teamCode}`,
        orgUnitId: '22222222-2222-2222-2222-222222222005',
      })
      .expect(201);

    await client
      .post(`/teams/${createdTeam.body.id}/members`)
      .send({
        action: 'add',
        personId: '11111111-1111-1111-1111-111111111009',
      })
      .expect(200);

    await app.close();

    app = await createApiTestApp();
    const restartedClient = createApiTestClient(app);

    const teamResponse = await restartedClient.get(`/teams/${createdTeam.body.id}`).expect(200);
    expect(teamResponse.body).toEqual(
      expect.objectContaining({
        code: teamCode,
        id: createdTeam.body.id,
      }),
    );

    const membersResponse = await restartedClient
      .get(`/teams/${createdTeam.body.id}/members`)
      .expect(200);
    expect(membersResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '11111111-1111-1111-1111-111111111009',
        }),
      ]),
    );
  });
});
