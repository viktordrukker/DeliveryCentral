import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';

describe('Manager scope API', () => {
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

  it('GET /org/managers/{id}/scope returns direct and dotted-line scope', async () => {
    const response = await request(app.getHttpServer())
      .get('/org/managers/11111111-1111-1111-1111-111111111006/scope?page=1&pageSize=10')
      .expect(200);

    expect(response.body.managerId).toBe('11111111-1111-1111-1111-111111111006');
    expect(response.body.directReports.length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(response.body.dottedLinePeople)).toBe(true);
  });
});
