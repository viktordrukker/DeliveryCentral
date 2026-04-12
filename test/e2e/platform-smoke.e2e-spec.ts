import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@src/app.module';
import { createApiTestClient } from '../helpers/api-test-client.helper';

describe('platform smoke e2e', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves readiness for platform smoke coverage', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/readiness').expect(200);

    expect(['ready', 'degraded']).toContain(response.body.status);
  });

  it('serves diagnostics for platform smoke coverage', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/diagnostics').expect(200);

    expect(response.body.service).toBeDefined();
  });
});
