import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { expectErrorResponseShape } from '../../helpers/api/api-response-assertions';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';
import { createAppPrismaClient } from '../../helpers/db/create-app-prisma-client';
import { resetPersistenceTestDatabase } from '../../helpers/db/reset-persistence-test-database';
import { seedDemoAssignmentRuntimeData } from '../../helpers/db/seed-demo-assignment-runtime-data';
import { seedDemoOrganizationRuntimeData } from '../../helpers/db/seed-demo-organization-runtime-data';
import { seedDemoProjectRuntimeData } from '../../helpers/db/seed-demo-project-runtime-data';

describe('API integration: read endpoints', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createAppPrismaClient();
  });

  beforeEach(async () => {
    await resetPersistenceTestDatabase(prisma);
    await seedDemoOrganizationRuntimeData(prisma);
    await seedDemoProjectRuntimeData(prisma);
    await seedDemoAssignmentRuntimeData(prisma);
    app = await createApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /org/people returns seeded directory data', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/org/people?page=1&pageSize=5').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        items: expect.any(Array),
        page: 1,
        pageSize: 5,
        total: expect.any(Number),
      }),
    );
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        displayName: expect.any(String),
        id: expect.any(String),
      }),
    );
  });

  it('GET /health returns application health status', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/health').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        diagnosticsPath: '/diagnostics',
        environment: expect.any(String),
        service: expect.any(String),
        status: 'ok',
        timestamp: expect.any(String),
      }),
    );
  });

  it('GET /projects returns internal project registry rows', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/projects').expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        assignmentCount: expect.any(Number),
        externalLinksCount: expect.any(Number),
        id: expect.any(String),
        name: expect.any(String),
        status: expect.any(String),
      }),
    );
  });

  it('GET /assignments returns assignment rows compatible with seeded data', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/assignments?status=APPROVED').expect(200);

    expect(response.body.items.length).toBeGreaterThan(0);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        allocationPercent: expect.any(Number),
        approvalState: expect.any(String),
        id: expect.any(String),
        person: expect.objectContaining({
          displayName: expect.any(String),
          id: expect.any(String),
        }),
        project: expect.objectContaining({
          displayName: expect.any(String),
          id: expect.any(String),
        }),
        staffingRole: expect.any(String),
      }),
    );
  });

  it('GET /dashboard/workload/summary returns dashboard cards and lists', async () => {
    const client = createApiTestClient(app);
    const response = await client
      .get('/dashboard/workload/summary?asOf=2025-03-15T00:00:00.000Z')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        peopleWithNoActiveAssignmentsCount: expect.any(Number),
        projectsWithEvidenceButNoApprovedAssignmentCount: expect.any(Number),
        projectsWithNoStaffCount: expect.any(Number),
        totalActiveAssignments: expect.any(Number),
        totalActiveProjects: expect.any(Number),
        unassignedActivePeopleCount: expect.any(Number),
      }),
    );
  });

  it('GET /diagnostics returns operational diagnostics', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/diagnostics').expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        auditVisibility: expect.objectContaining({
          totalBusinessAuditRecords: expect.any(Number),
        }),
        database: expect.objectContaining({
          connected: expect.any(Boolean),
          host: expect.any(String),
          latencyMs: expect.anything(),
          schemaHealthy: expect.any(Boolean),
        }),
        integrations: expect.objectContaining({
          configuredCount: expect.any(Number),
          degradedCount: expect.any(Number),
          items: expect.any(Array),
          neverSyncedCount: expect.any(Number),
          overallStatus: expect.any(String),
        }),
        migrations: expect.objectContaining({
          appliedCount: expect.any(Number),
          availableLocalCount: expect.any(Number),
          migrationTableAccessible: expect.any(Boolean),
          pendingLocalCount: expect.any(Number),
          status: expect.any(String),
        }),
        notifications: expect.objectContaining({
          enabledChannelCount: expect.any(Number),
          templateCount: expect.any(Number),
          recentOutcomeCount: expect.any(Number),
          retryingDeliveryCount: expect.any(Number),
          status: expect.any(String),
          summary: expect.any(String),
          terminalFailureCount: expect.any(Number),
        }),
      }),
    );
    expect(
      response.body.notifications.lastAttemptedAt === null ||
        typeof response.body.notifications.lastAttemptedAt === 'string',
    ).toBe(true);
    expect(response.body.integrations.items[0]).toEqual(
      expect.objectContaining({
        capabilities: expect.any(Array),
        summaryMetrics: expect.any(Array),
      }),
    );
  });

  it('returns consistent error shape for missing resources', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/org/people/not-a-real-id').expect(404);

    expectErrorResponseShape(response.body, 404);
  });
});
