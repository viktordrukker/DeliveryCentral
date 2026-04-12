import { Test } from '@nestjs/testing';

import { AppModule } from '@src/app.module';

describe('App bootstrap', () => {
  it('creates the root testing module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
  });
});
