import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@src/app.module';

describe('metadata dictionary API contract', () => {
  it('returns stable dictionary list fields required by the admin UI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/metadata/dictionaries')
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        dictionaryKey: expect.any(String),
        displayName: expect.any(String),
        enabledEntryCount: expect.any(Number),
        entityType: expect.any(String),
        entryCount: expect.any(Number),
        id: expect.any(String),
      }),
    );

    await app.close();
  });
});
