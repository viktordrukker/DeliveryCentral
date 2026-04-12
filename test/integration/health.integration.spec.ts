import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@src/app.module';
import { createApiTestClient } from '../helpers/api-test-client.helper';

describe('health integration', () => {
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

  it('returns health status through the API client helper', async () => {
    const client = createApiTestClient(app);
    const response = await client.get('/health').expect(200);

    expect(response.body.status).toBe('ok');
  });
});
