import { Module } from '@nestjs/common';

import { InMemoryResourcePoolRepository } from './infrastructure/in-memory-resource-pool.repository';
import { PrismaResourcePoolRepository } from './infrastructure/prisma-resource-pool.repository';
import { ResourcePoolsController } from './presentation/resource-pools.controller';

@Module({
  controllers: [ResourcePoolsController],
  providers: [
    {
      provide: InMemoryResourcePoolRepository,
      useClass: PrismaResourcePoolRepository,
    },
  ],
  exports: [InMemoryResourcePoolRepository],
})
export class ResourcePoolsModule {}
