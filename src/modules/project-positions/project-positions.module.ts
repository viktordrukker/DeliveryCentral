import { Module } from '@nestjs/common';

import { AuditObservabilityModule } from '@src/modules/audit-observability/audit-observability.module';
import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { PrismaModule } from '@src/shared/persistence/prisma.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { BulkReassignPositionsService } from './application/bulk-reassign-positions.service';
import { CreateAndBookProjectPositionService } from './application/create-and-book-project-position.service';
import { CreateProjectPositionService } from './application/create-project-position.service';
import { GetProjectPositionByIdService } from './application/get-project-position-by-id.service';
import { ListBenchPeopleService } from './application/list-bench-people.service';
import { ListEnrichedBenchService } from './application/list-enriched-bench.service';
import { ListPositionHistoryService } from './application/list-position-history.service';
import { ListProjectPositionsService } from './application/list-project-positions.service';
import { PositionForensicsService } from './application/position-forensics.service';
import { SuggestFillsService } from './application/suggest-fills.service';
import { TransitionProjectPositionFillService } from './application/transition-project-position-fill.service';
import {
  PROJECT_POSITION_REFERENCE_REPOSITORY,
  PROJECT_POSITION_REPOSITORY,
} from './application/tokens';
import { PrismaProjectPositionReferenceRepository } from './infrastructure/repositories/prisma/prisma-project-position-reference.repository';
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
  imports: [PrismaModule, AuditObservabilityModule, NotificationsModule],
  controllers: [ProjectPositionsController, PeopleBenchController],
  providers: [
    {
      provide: PROJECT_POSITION_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaProjectPositionRepository(prisma.projectPosition),
    },
    {
      // PR-8 — create-side reference checks (unknown → 404, closed project /
      // non-active person → 409). Shared by the plain create and the atomic
      // create-and-book paths.
      provide: PROJECT_POSITION_REFERENCE_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new PrismaProjectPositionReferenceRepository(prisma),
    },
    {
      provide: CreateProjectPositionService,
      inject: [PROJECT_POSITION_REPOSITORY, PROJECT_POSITION_REFERENCE_REPOSITORY],
      useFactory: (
        repo: PrismaProjectPositionRepository,
        referenceRepo: PrismaProjectPositionReferenceRepository,
      ) => new CreateProjectPositionService(repo, referenceRepo),
    },
    {
      // Atomic create-and-book — same fill-changed event bridge as the
      // transition service so notification consumers see the booking.
      provide: CreateAndBookProjectPositionService,
      inject: [
        PROJECT_POSITION_REPOSITORY,
        PrismaService,
        CreateProjectPositionService,
        PROJECT_POSITION_REFERENCE_REPOSITORY,
        NotificationEventTranslatorService,
      ],
      useFactory: (
        repo: PrismaProjectPositionRepository,
        prisma: PrismaService,
        createService: CreateProjectPositionService,
        referenceRepo: PrismaProjectPositionReferenceRepository,
        translator: NotificationEventTranslatorService,
      ) =>
        new CreateAndBookProjectPositionService(repo, prisma, createService, referenceRepo, {
          emit: (event) =>
            translator.positionFillChanged({
              positionId: event.positionId,
              projectId: event.projectId,
              fromStatus: event.fromStatus,
              toStatus: event.toStatus,
              actorPersonId: event.actorPersonId,
              activePersonId: event.activePersonId,
              reason: event.reason,
              occurredAt: event.occurredAt,
            }),
        }),
    },
    {
      // LEAN-P1-5 — bridge the `ProjectPositionFillChangedEvent` from the
      // transition service to the notification translator. The translator's
      // `positionFillChanged()` does dual-dispatch (outbox vs sync) so the
      // emitter contract here is "fire-and-forget"; failures inside the
      // translator are swallowed by `dispatchQuietly`.
      provide: TransitionProjectPositionFillService,
      inject: [PROJECT_POSITION_REPOSITORY, PrismaService, NotificationEventTranslatorService],
      useFactory: (
        repo: PrismaProjectPositionRepository,
        prisma: PrismaService,
        translator: NotificationEventTranslatorService,
      ) =>
        new TransitionProjectPositionFillService(repo, prisma, {
          emit: (event) =>
            translator.positionFillChanged({
              positionId: event.positionId,
              projectId: event.projectId,
              fromStatus: event.fromStatus,
              toStatus: event.toStatus,
              actorPersonId: event.actorPersonId,
              activePersonId: event.activePersonId,
              reason: event.reason,
              occurredAt: event.occurredAt,
            }),
        }),
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
      provide: SuggestFillsService,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new SuggestFillsService(prisma),
    },
    {
      provide: ListEnrichedBenchService,
      inject: [PrismaService, SuggestFillsService],
      useFactory: (prisma: PrismaService, suggestFills: SuggestFillsService) =>
        new ListEnrichedBenchService(prisma, suggestFills),
    },
    PositionForensicsService,
    ListPositionHistoryService,
    {
      provide: BulkReassignPositionsService,
      inject: [PrismaService, PROJECT_POSITION_REFERENCE_REPOSITORY],
      useFactory: (
        prisma: PrismaService,
        referenceRepo: PrismaProjectPositionReferenceRepository,
      ) => new BulkReassignPositionsService(prisma, referenceRepo),
    },
  ],
  exports: [
    BulkReassignPositionsService,
    CreateAndBookProjectPositionService,
    CreateProjectPositionService,
    TransitionProjectPositionFillService,
    ListProjectPositionsService,
    GetProjectPositionByIdService,
    ListBenchPeopleService,
    ListEnrichedBenchService,
    SuggestFillsService,
    PositionForensicsService,
    ListPositionHistoryService,
    PROJECT_POSITION_REPOSITORY,
  ],
})
export class ProjectPositionsModule {}
