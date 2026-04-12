import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';

describe('Health endpoints', () => {
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

  it('/health returns success', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.diagnosticsPath).toBe('/diagnostics');
  });

  it('/readiness returns success', async () => {
    const response = await request(app.getHttpServer()).get('/readiness').expect(200);

    expect(['ready', 'degraded']).toContain(response.body.status);
    expect(response.body.checks).toEqual(expect.any(Array));
  });

  it('/diagnostics returns a diagnostics summary', async () => {
    const response = await request(app.getHttpServer()).get('/diagnostics').expect(200);

    expect(response.body.database).toEqual(
      expect.objectContaining({
        connected: expect.any(Boolean),
        latencyMs: expect.anything(),
        schemaHealthy: expect.any(Boolean),
      }),
    );
    expect(response.body.notifications).toEqual(
      expect.objectContaining({
        recentOutcomeCount: expect.any(Number),
        retryingDeliveryCount: expect.any(Number),
        status: expect.any(String),
        terminalFailureCount: expect.any(Number),
      }),
    );
  });
});
