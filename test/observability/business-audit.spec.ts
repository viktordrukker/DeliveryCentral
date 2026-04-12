import { INestApplication } from '@nestjs/common';

import { InMemoryAuditLogStore } from '@src/modules/audit-observability/application/in-memory-audit-log.store';

import { createApiTestClient } from '../helpers/api-test-client.helper';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createApiTestApp } from '../helpers/api/create-api-test-app';

describe('Business audit coverage', () => {
  let app: INestApplication;
  let auditLogStore: InMemoryAuditLogStore;

  beforeAll(async () => {
    app = await createApiTestApp();
    auditLogStore = app.get(InMemoryAuditLogStore);
  });

  beforeEach(() => {
    auditLogStore.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('records business audit entries with actor and target metadata for critical actions', async () => {
    const client = createApiTestClient(app);
    const uniqueSuffix = Date.now().toString();
    const employeeEmail = `audit.employee.${Date.now()}@example.com`;

    await client
      .post('/org/people')
      .set(roleHeaders('hr_manager'))
      .send({
        email: employeeEmail,
        name: 'Audit Employee',
        orgUnitId: '22222222-2222-2222-2222-222222222005',
      })
      .expect(201);

    const project = await client
      .post('/projects')
      .send({
        name: `Audit Workflow Project ${uniqueSuffix}`,
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await client.post(`/projects/${project.body.id}/activate`).expect(200);

    const assignment = await client
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 25,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: project.body.id,
        staffingRole: 'Audit Analyst',
        startDate: '2025-07-01T00:00:00.000Z',
      })
      .expect(201);

    await client
      .post(`/assignments/${assignment.body.id}/approve`)
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
      })
      .expect(200);

    await client
      .post('/metadata/dictionaries/skillset/entries')
      .send({
        displayName: 'Platform Audit',
        entryKey: 'platform-audit',
        entryValue: 'PLATFORM_AUDIT',
      })
      .expect(201);

    await client
      .post('/notifications/test-send')
      .set(roleHeaders('admin'))
      .send({
        channelKey: 'ms_teams_webhook',
        payload: {
          errorMessage: 'Audit path smoke check',
          provider: 'jira',
          resourceType: 'projects',
        },
        recipient: 'audit-ops',
        templateKey: 'integration-sync-failed-teams',
      })
      .expect(201);

    const records = auditLogStore.list();

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: 'employee.created',
          targetEntityType: 'EMPLOYEE',
        }),
        expect.objectContaining({
          actionType: 'assignment.created',
          actorId: '11111111-1111-1111-1111-111111111006',
          targetEntityType: 'ASSIGNMENT',
        }),
        expect.objectContaining({
          actionType: 'assignment.approved',
          actorId: '11111111-1111-1111-1111-111111111006',
          targetEntityType: 'ASSIGNMENT',
        }),
        expect.objectContaining({
          actionType: 'metadata.dictionary.changed',
          targetEntityType: 'METADATA_DICTIONARY',
        }),
        expect.objectContaining({
          actionType: 'notification.send_result',
          targetEntityType: 'NOTIFICATION_REQUEST',
        }),
      ]),
    );
  });

  it('queries business audit records through GET /audit/business', async () => {
    const client = createApiTestClient(app);
    const uniqueSuffix = Date.now().toString();

    await client
      .post('/org/people')
      .set(roleHeaders('hr_manager'))
      .send({
        email: `audit.review.${uniqueSuffix}@example.com`,
        name: 'Audit Review Employee',
        orgUnitId: '22222222-2222-2222-2222-222222222005',
      })
      .expect(201);

    const project = await client
      .post('/projects')
      .send({
        name: `Audit Query Project ${uniqueSuffix}`,
        projectManagerId: '11111111-1111-1111-1111-111111111005',
        startDate: '2025-06-01T00:00:00.000Z',
      })
      .expect(201);

    await client.post(`/projects/${project.body.id}/activate`).expect(200);

    const created = await client
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 30,
        personId: '11111111-1111-1111-1111-111111111011',
        projectId: project.body.id,
        staffingRole: 'Audit Reviewer',
        startDate: '2025-08-01T00:00:00.000Z',
      })
      .expect(201);

    const response = await client
      .get(`/audit/business?actionType=assignment.created&targetEntityId=${created.body.id}&limit=5`)
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body.items).toEqual([
      expect.objectContaining({
        actionType: 'assignment.created',
        actorId: '11111111-1111-1111-1111-111111111006',
        targetEntityId: created.body.id,
        targetEntityType: 'ASSIGNMENT',
      }),
    ]);
  });

  it('records integration sync summary audits', async () => {
    const client = createApiTestClient(app);

    await client
      .post('/integrations/jira/projects/sync')
      .set(roleHeaders('admin'))
      .expect(201);

    const records = auditLogStore.list({ actionType: 'integration.sync_run' });
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: 'integration.sync_run',
          category: 'integration',
          metadata: expect.objectContaining({
            provider: 'jira',
            resourceType: 'projects',
            status: 'SUCCEEDED',
          }),
          targetEntityType: 'INTEGRATION_SYNC',
        }),
      ]),
    );
  });

  it('queries recent integration sync history through GET /integrations/history', async () => {
    const client = createApiTestClient(app);

    await client
      .post('/integrations/jira/projects/sync')
      .set(roleHeaders('admin'))
      .expect(201);

    const response = await client
      .get('/integrations/history?provider=jira&limit=5')
      .set(roleHeaders('admin'))
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          finishedAt: expect.any(String),
          integrationType: 'jira',
          itemsProcessedSummary: expect.stringMatching(/^Created \d+, updated \d+\.$/),
          resourceType: 'projects',
          startedAt: expect.any(String),
          status: 'SUCCEEDED',
          summary: 'Jira project sync completed successfully.',
        }),
      ]),
    );
  });
});
