import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';

import { AppModule } from '@src/app.module';

export async function createApiTestApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
  });
  const moduleRef = await (configure ? configure(builder) : builder).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
