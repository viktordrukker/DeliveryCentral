import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { expectErrorResponseShape } from '../../helpers/api/api-response-assertions';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { roleHeaders } from '../../helpers/api/auth-headers';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';

describe('API integration: metadata, cases, integrations, and dashboard', () => {
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

  it('GET /metadata/dictionaries returns dictionary rows for admin consumers', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/metadata/dictionaries').expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        dictionaryKey: expect.any(String),
        displayName: expect.any(String),
        enabledEntryCount: expect.any(Number),
        entityType: expect.any(String),
        id: expect.any(String),
      }),
    );
  });

  it('GET /metadata/dictionaries/{id} returns dictionary details', async () => {
    const client = createApiTestClient(app);
    const response = await client
      .get('/metadata/dictionaries/42222222-0000-0000-0000-000000000001')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        dictionaryKey: 'project-types',
        entries: expect.any(Array),
        relatedCustomFields: expect.any(Array),
        relatedLayouts: expect.any(Array),
        relatedWorkflows: expect.any(Array),
      }),
    );
  });

  it('POST /cases creates and GET /cases lists onboarding cases', async () => {
    const client = createApiTestClient(app);
    const created = await client.post('/cases').send({
      caseTypeKey: 'ONBOARDING',
      ownerPersonId: '11111111-1111-1111-1111-111111111005',
      participants: [
        {
          personId: '11111111-1111-1111-1111-111111111012',
          role: 'SUBJECT',
        },
      ],
      relatedProjectId: '33333333-3333-3333-3333-333333333001',
      subjectPersonId: '11111111-1111-1111-1111-111111111012',
      summary: 'Onboarding through API integration suite.',
    }).expect(201);

    expect(created.body).toEqual(
      expect.objectContaining({
        caseNumber: expect.any(String),
        id: expect.any(String),
        status: 'OPEN',
        subjectPersonId: '11111111-1111-1111-1111-111111111012',
      }),
    );

    const listed = await client.get('/cases').expect(200);
    expect(Array.isArray(listed.body.items ?? listed.body)).toBe(true);
  });

  it('POST /integrations/jira/projects/sync executes end-to-end and returns sync summary', async () => {
    const client = createApiTestClient(app);
    const response = await client.post('/integrations/jira/projects/sync').send({}).expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        projectsCreated: expect.any(Number),
        projectsUpdated: expect.any(Number),
        syncedProjectIds: expect.any(Array),
      }),
    );
  });

  it('GET /integrations/jira/status returns admin-safe integration status', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/integrations/jira/status').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        provider: expect.any(String),
        status: expect.any(String),
        supportsProjectSync: expect.any(Boolean),
        supportsWorkEvidence: expect.any(Boolean),
      }),
    );
  });

  it('GET /admin/config returns unified admin configuration', async () => {
    const client = createApiTestClient(app);
    const response = await client
      .get('/admin/config')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        dictionaries: expect.any(Array),
        integrations: expect.any(Array),
        systemFlags: expect.any(Array),
      }),
    );
    expect(response.body.dictionaries[0]).toEqual(
      expect.objectContaining({
        dictionaryKey: expect.any(String),
        displayName: expect.any(String),
        enabledEntryCount: expect.any(Number),
        entryCount: expect.any(Number),
      }),
    );
    expect(response.body.integrations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          provider: 'jira',
          status: expect.any(String),
        }),
      ]),
    );
  });

  it('returns consistent not-found errors for unknown assignment workflow targets', async () => {
    const client = createApiTestClient(app);
    const response = await client
      .post('/assignments/00000000-0000-0000-0000-000000000000/approve')
      .send({ actorPersonId: '11111111-1111-1111-1111-111111111006' })
      .expect(404);

    expectErrorResponseShape(response.body, 404);
  });
});
