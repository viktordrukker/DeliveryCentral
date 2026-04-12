import { Module } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { WorkloadService } from './application/workload.service';
import { WorkloadRepository } from './infrastructure/workload.repository';
import { WorkloadController } from './presentation/workload.controller';

@Module({
  controllers: [WorkloadController],
  providers: [
    {
      provide: WorkloadRepository,
      useFactory: (prisma: PrismaService) => new WorkloadRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: WorkloadService,
      useFactory: (repo: WorkloadRepository) => new WorkloadService(repo),
      inject: [WorkloadRepository],
    },
  ],
  exports: [WorkloadService],
})
export class WorkloadModule {}
