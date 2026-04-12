import { INestApplication } from '@nestjs/common';

import { InMemoryAuditLogStore } from '@src/modules/audit-observability/application/in-memory-audit-log.store';

import { createApiTestClient } from '../helpers/api-test-client.helper';
import { roleHeaders } from '../helpers/api/auth-headers';
import { createApiTestApp } from '../helpers/api/create-api-test-app';

describe('Logging and audit generation sanity', () => {
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

  it('generates business audit logs with correlation ids for assignment and org changes', async () => {
    const client = createApiTestClient(app);
    const correlationId = 'test-correlation-id-001';

    const createAssignment = await client
      .post('/assignments')
      .set(roleHeaders('project_manager'))
      .set('x-correlation-id', correlationId)
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        allocationPercent: 20,
        personId: '11111111-1111-1111-1111-111111111012',
        projectId: '33333333-3333-3333-3333-333333333001',
        staffingRole: 'Audit Sanity Role',
        startDate: '2025-07-01T00:00:00.000Z',
      })
      .expect(201);

    await client
      .post(`/assignments/${createAssignment.body.id}/approve`)
      .set('x-correlation-id', correlationId)
      .send({
        actorId: '11111111-1111-1111-1111-111111111006',
        comment: 'Approval sanity check',
      })
      .expect(200);

    await client
      .post('/org/reporting-lines')
      .set(roleHeaders('resource_manager'))
      .set('x-correlation-id', correlationId)
      .send({
        managerId: '11111111-1111-1111-1111-111111111007',
        personId: '11111111-1111-1111-1111-111111111008',
        startDate: '2025-07-01T00:00:00.000Z',
        type: 'SOLID',
      })
      .expect(201);

    const records = auditLogStore.list();

    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: 'assignment.created',
          category: 'assignment',
          correlationId,
          targetEntityType: 'ASSIGNMENT',
        }),
        expect.objectContaining({
          actionType: 'assignment.approved',
          category: 'approval',
          correlationId,
          targetEntityType: 'ASSIGNMENT',
        }),
        expect.objectContaining({
          actionType: 'reporting_line.changed',
          category: 'organization',
          correlationId,
          targetEntityType: 'REPORTING_LINE',
        }),
      ]),
    );
  });
});
