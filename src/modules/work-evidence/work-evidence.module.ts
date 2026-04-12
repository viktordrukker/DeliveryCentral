import { Module } from '@nestjs/common';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { CreateWorkEvidenceService } from './application/create-work-evidence.service';
import { ListWorkEvidenceService } from './application/list-work-evidence.service';
import { UpdateWorkEvidenceService } from './application/update-work-evidence.service';
import { InMemoryWorkEvidenceRepository } from './infrastructure/repositories/in-memory/in-memory-work-evidence.repository';
import { PrismaWorkEvidenceRepository } from './infrastructure/repositories/prisma/prisma-work-evidence.repository';
import { WorkEvidenceController } from './presentation/work-evidence.controller';

@Module({
  controllers: [WorkEvidenceController],
  providers: [
    {
      provide: InMemoryWorkEvidenceRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaWorkEvidenceRepository(prisma.workEvidence, prisma.workEvidenceSource),
      inject: [PrismaService],
    },
    {
      provide: CreateWorkEvidenceService,
      useFactory: (repository: InMemoryWorkEvidenceRepository) =>
        new CreateWorkEvidenceService(repository),
      inject: [InMemoryWorkEvidenceRepository],
    },
    {
      provide: ListWorkEvidenceService,
      useFactory: (repository: InMemoryWorkEvidenceRepository) =>
        new ListWorkEvidenceService(repository),
      inject: [InMemoryWorkEvidenceRepository],
    },
    {
      provide: UpdateWorkEvidenceService,
      useFactory: (repository: InMemoryWorkEvidenceRepository) =>
        new UpdateWorkEvidenceService(repository),
      inject: [InMemoryWorkEvidenceRepository],
    },
  ],
  exports: [CreateWorkEvidenceService, ListWorkEvidenceService, UpdateWorkEvidenceService, InMemoryWorkEvidenceRepository],
})
export class WorkEvidenceModule {}
