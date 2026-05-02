import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';

import { AppModule } from '@src/app.module';
import { PrismaReadReplicaService } from '@src/shared/persistence/prisma-read-replica.service';

// TEST-05: PrismaReadReplicaService extends PrismaClient and calls $connect()
// on module init. In contract tests there is no DB to connect to (the test
// stubs PrismaService via overrideProvider), so we install a no-op replica
// override here so every consumer of this helper inherits it. Individual
// tests can still override it again if they need replica behavior under test.
const noopReadReplica = {
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn().mockResolvedValue(undefined),
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
} as unknown as PrismaReadReplicaService;

export async function createApiTestApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaReadReplicaService)
    .useValue(noopReadReplica);
  if (configure) {
    builder = configure(builder);
  }
  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
