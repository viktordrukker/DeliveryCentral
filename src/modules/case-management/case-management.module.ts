import { Module } from '@nestjs/common';

import { NotificationEventTranslatorService } from '@src/modules/notifications/application/notification-event-translator.service';
import { NotificationsModule } from '@src/modules/notifications/notifications.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { ApproveCaseService } from './application/approve-case.service';
import { ArchiveCaseService } from './application/archive-case.service';
import { CancelCaseService } from './application/cancel-case.service';
import { CasePresenterService } from './application/case-presenter.service';
import { CloseCaseService } from './application/close-case.service';
import { CompleteCaseStepService } from './application/complete-case-step.service';
import { CreateCaseService } from './application/create-case.service';
import { GetCaseByIdService } from './application/get-case-by-id.service';
import { ListCasesService } from './application/list-cases.service';
import { ReopenCaseService } from './application/reopen-case.service';
import { InMemoryCaseReferenceRepository } from './infrastructure/repositories/in-memory/in-memory-case-reference.repository';
import { PrismaCaseReferenceRepository } from './infrastructure/repositories/prisma/prisma-case-reference.repository';
import { InMemoryCaseSlaService } from './infrastructure/services/in-memory-case-sla.service';
import { PrismaCaseRecordRepository } from './infrastructure/repositories/prisma/prisma-case-record.repository';
import { PrismaCaseCommentService } from './infrastructure/services/prisma-case-comment.service';
import { CasesController } from './presentation/cases.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [CasesController],
  exports: [
    ApproveCaseService,
    ArchiveCaseService,
    CancelCaseService,
    CloseCaseService,
    CompleteCaseStepService,
    CreateCaseService,
    GetCaseByIdService,
    ListCasesService,
    ReopenCaseService,
  ],
  providers: [
    PrismaService,
    {
      provide: PrismaCaseRecordRepository,
      useFactory: (prisma: PrismaService) => new PrismaCaseRecordRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: InMemoryCaseReferenceRepository,
      useFactory: (prisma: PrismaService) => new PrismaCaseReferenceRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: ApproveCaseService,
      useFactory: (repository: PrismaCaseRecordRepository, auditLogger: AuditLoggerService) =>
        new ApproveCaseService(repository, auditLogger),
      inject: [PrismaCaseRecordRepository, AuditLoggerService],
    },
    {
      provide: ArchiveCaseService,
      useFactory: (repository: PrismaCaseRecordRepository) =>
        new ArchiveCaseService(repository),
      inject: [PrismaCaseRecordRepository],
    },
    {
      provide: CancelCaseService,
      useFactory: (repository: PrismaCaseRecordRepository) =>
        new CancelCaseService(repository),
      inject: [PrismaCaseRecordRepository],
    },
    {
      provide: CloseCaseService,
      useFactory: (
        repository: PrismaCaseRecordRepository,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) => new CloseCaseService(repository, notificationEventTranslator),
      inject: [PrismaCaseRecordRepository, NotificationEventTranslatorService],
    },
    {
      provide: CreateCaseService,
      useFactory: (
        repository: PrismaCaseRecordRepository,
        referenceRepository: InMemoryCaseReferenceRepository,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) => new CreateCaseService(repository, referenceRepository, notificationEventTranslator),
      inject: [PrismaCaseRecordRepository, InMemoryCaseReferenceRepository, NotificationEventTranslatorService],
    },
    {
      provide: ListCasesService,
      useFactory: (repository: PrismaCaseRecordRepository) =>
        new ListCasesService(repository),
      inject: [PrismaCaseRecordRepository],
    },
    {
      provide: GetCaseByIdService,
      useFactory: (repository: PrismaCaseRecordRepository) =>
        new GetCaseByIdService(repository),
      inject: [PrismaCaseRecordRepository],
    },
    {
      provide: ReopenCaseService,
      useFactory: (repository: PrismaCaseRecordRepository) =>
        new ReopenCaseService(repository),
      inject: [PrismaCaseRecordRepository],
    },
    {
      provide: CompleteCaseStepService,
      useFactory: (prisma: PrismaService, notificationEventTranslator: NotificationEventTranslatorService) =>
        new CompleteCaseStepService(prisma, notificationEventTranslator),
      inject: [PrismaService, NotificationEventTranslatorService],
    },
    {
      provide: PrismaCaseCommentService,
      useFactory: (prisma: PrismaService) => new PrismaCaseCommentService(prisma),
      inject: [PrismaService],
    },
    {
      // F-28 / 20c-07 — extracted controller-side presentation logic.
      provide: CasePresenterService,
      useFactory: (prisma: PrismaService) => new CasePresenterService(prisma),
      inject: [PrismaService],
    },
    InMemoryCaseSlaService,
  ],
})
export class CaseManagementModule {}
