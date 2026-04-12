import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';

describe('Person directory API', () => {
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

  it('GET /org/people returns paginated people', async () => {
    const response = await request(app.getHttpServer())
      .get('/org/people?page=1&pageSize=5')
      .expect(200);

    expect(response.body.items).toHaveLength(5);
    expect(response.body.total).toBeGreaterThanOrEqual(12);
  });

  it('GET /org/people/{id} returns a person directory record', async () => {
    const response = await request(app.getHttpServer())
      .get('/org/people/11111111-1111-1111-1111-111111111008')
      .expect(200);

    expect(response.body.id).toBe('11111111-1111-1111-1111-111111111008');
    expect(response.body.currentLineManager).toBeDefined();
    expect(response.body.dottedLineManagers).toHaveLength(1);
  });
});
