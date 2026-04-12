import { INestApplication } from '@nestjs/common';

import { JiraProjectSyncService } from '@src/modules/integrations/jira/application/jira-project-sync.service';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { expectSafeErrorResponseShape } from '../../helpers/api/api-response-assertions';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';

describe('API negative paths: integrations', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApiTestApp((builder) =>
      builder.overrideProvider(JiraProjectSyncService).useValue({
        syncProjects: async () => {
          throw new Error('Simulated Jira sync failure.');
        },
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /integrations/jira/projects/sync fails safely when sync orchestration errors', async () => {
    const client = createApiTestClient(app);

    const response = await client.post('/integrations/jira/projects/sync').send({}).expect(500);

    expectSafeErrorResponseShape(response.body, 500, 'Internal server error');
  });
});
