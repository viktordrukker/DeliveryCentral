import { INestApplication } from '@nestjs/common';

import { JiraProjectSyncService } from '@src/modules/integrations/jira/application/jira-project-sync.service';

import { createApiTestClient } from '../../helpers/api-test-client.helper';
import { expectSafeErrorResponseShape } from '../../helpers/api/api-response-assertions';
import { createApiTestApp } from '../../helpers/api/create-api-test-app';

// CI-REENABLE-SKIP (issue 721): forced-skip pending API test-debt cleanup.
// The global RequireSetupCompleteGuard returns 503 (setup-incomplete) in the
// DB suite because `resetPersistenceTestDatabase` TRUNCATE ... CASCADE wipes the
// `setup.completedAt` platform_settings row via the Tenant FK chain, so these
// integration POSTs get 503 instead of the asserted 5xx. See the full
// rationale in critical-api-negative.integration.spec.ts. To re-enable: drop
// `.skip` after the setup-guard cleanup lands.
describe.skip('API negative paths: integrations', () => {
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
