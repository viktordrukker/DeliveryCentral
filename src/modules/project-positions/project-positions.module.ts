import { Module } from '@nestjs/common';

import { AuditObservabilityModule } from '@src/modules/audit-observability/audit-observability.module';
import { DomainEventService } from '@src/modules/audit-observability/application/domain-event.service';
import { PrismaModule } from '@src/shared/persistence/prisma.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { CreateProjectPositionService } from './application/create-project-position.service';
import { GetProjectPositionByIdService } from './application/get-project-position-by-id.service';
import { ListBenchPeopleService } from './application/list-bench-people.service';
import { ListProjectPositionsService } from './application/list-project-positions.service';
import { ProjectPositionMirrorService } from './application/project-position-mirror.service';
import { TransitionProjectPositionFillService } from './application/transition-project-position-fill.service';
import { PROJECT_POSITION_REPOSITORY } from './application/tokens';
import { PrismaProjectPositionRepository } from './infrastructure/repositories/prisma/prisma-project-position.repository';
import {
  PeopleBenchController,
  ProjectPositionsController,
} from './presentation/project-positions.controller';

/**
 * Sprint 2 / S2-3..S2-6 — lean staffing aggregate module wiring.
 *
 * Provides services + Prisma adapter + REST controllers + S2-6 dual-write
 * mirror. The legacy `assignments`/`staffing-requests`/`staffing-desk`
 * modules continue to run alongside until the Sprint 5 contract phase.
 */
@Module({
  imports: [PrismaModule, AuditObservabilityModule],
  controllers: [ProjectPositionsController, PeopleBenchController],
  providers: [
    {
      provide: PROJECT_POSITION_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaProjectPositionRepository(prisma.projectPosition),
    },
    {
      provide: CreateProjectPositionService,
      inject: [PROJECT_POSITION_REPOSITORY],
      useFactory: (repo: PrismaProjectPositionRepository) =>
        new CreateProjectPositionService(repo),
    },
    {
      provide: TransitionProjectPositionFillService,
      inject: [PROJECT_POSITION_REPOSITORY],
      useFactory: (repo: PrismaProjectPositionRepository) =>
        new TransitionProjectPositionFillService(repo),
    },
    {
      provide: ListProjectPositionsService,
      inject: [PROJECT_POSITION_REPOSITORY],
      useFactory: (repo: PrismaProjectPositionRepository) =>
        new ListProjectPositionsService(repo),
    },
    {
      provide: GetProjectPositionByIdService,
      inject: [PROJECT_POSITION_REPOSITORY],
      useFactory: (repo: PrismaProjectPositionRepository) =>
        new GetProjectPositionByIdService(repo),
    },
    {
      provide: ListBenchPeopleService,
      inject: [PROJECT_POSITION_REPOSITORY],
      useFactory: (repo: PrismaProjectPositionRepository) =>
        new ListBenchPeopleService(repo),
    },
    {
      provide: ProjectPositionMirrorService,
      inject: [PrismaService, DomainEventService],
      useFactory: (prisma: PrismaService, domainEvents: DomainEventService) =>
        new ProjectPositionMirrorService(prisma, domainEvents),
    },
  ],
  exports: [
    CreateProjectPositionService,
    TransitionProjectPositionFillService,
    ListProjectPositionsService,
    GetProjectPositionByIdService,
    ListBenchPeopleService,
    ProjectPositionMirrorService,
    PROJECT_POSITION_REPOSITORY,
  ],
})
export class ProjectPositionsModule {}
