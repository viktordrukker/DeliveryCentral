import { Module, forwardRef } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AssignmentsModule } from '../assignments/assignments.module';
import { AuditObservabilityModule } from '../audit-observability/audit-observability.module';
import { CreateProjectAssignmentService } from '../assignments/application/create-project-assignment.service';
import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationEventTranslatorService } from '../notifications/application/notification-event-translator.service';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { PlatformSettingsService } from '../platform-settings/application/platform-settings.service';
import { ProjectPositionsModule } from '../project-positions/project-positions.module';
import { SuggestFillsService } from '../project-positions/application/suggest-fills.service';

import { AutoMatchCandidatesService } from './application/auto-match-candidates.service';
import { DeriveStaffingRequestStatusService } from './application/derive-staffing-request-status.service';
import { NudgeStaffingRequestService } from './application/nudge-staffing-request.service';
import {
  STAFFING_REQUEST_PROPOSAL_SLATE_REPOSITORY,
  StaffingProposalSlateService,
} from './application/staffing-proposal-slate.service';
import { StaffingSuggestionsService } from './application/staffing-suggestions.service';
import { InMemoryStaffingRequestService } from './infrastructure/services/in-memory-staffing-request.service';
import { PrismaStaffingRequestProposalSlateRepository } from './infrastructure/repositories/prisma/prisma-staffing-request-proposal-slate.repository';
import { ProposalsController } from './presentation/proposals.controller';
import { StaffingRequestsController } from './presentation/staffing-requests.controller';
import { UnifiedCandidateQueueService } from './application/unified-candidate-queue.service';

@Module({
  imports: [
    forwardRef(() => AssignmentsModule),
    AuditObservabilityModule,
    NotificationsModule,
    PlatformSettingsModule,
    ProjectPositionsModule,
  ],
  controllers: [StaffingRequestsController, ProposalsController],
  exports: [
    InMemoryStaffingRequestService,
    DeriveStaffingRequestStatusService,
    StaffingProposalSlateService,
    UnifiedCandidateQueueService,
    AutoMatchCandidatesService,
  ],
  providers: [
    InMemoryStaffingRequestService,
    DeriveStaffingRequestStatusService,
    NudgeStaffingRequestService,
    PrismaStaffingRequestProposalSlateRepository,
    {
      provide: UnifiedCandidateQueueService,
      useFactory: (prisma: PrismaService) => new UnifiedCandidateQueueService(prisma),
      inject: [PrismaService],
    },
    {
      provide: AutoMatchCandidatesService,
      useFactory: (prisma: PrismaService, suggestFills: SuggestFillsService) =>
        new AutoMatchCandidatesService(prisma, suggestFills),
      inject: [PrismaService, SuggestFillsService],
    },
    {
      provide: StaffingSuggestionsService,
      useFactory: (prisma: PrismaService, settings: PlatformSettingsService) =>
        new StaffingSuggestionsService(prisma, settings),
      inject: [PrismaService, PlatformSettingsService],
    },
    {
      provide: STAFFING_REQUEST_PROPOSAL_SLATE_REPOSITORY,
      useExisting: PrismaStaffingRequestProposalSlateRepository,
    },
    {
      provide: StaffingProposalSlateService,
      useFactory: (
        slateRepository: PrismaStaffingRequestProposalSlateRepository,
        prisma: PrismaService,
        createAssignment: CreateProjectAssignmentService,
        auditLogger: AuditLoggerService,
        notifications: NotificationEventTranslatorService,
      ) =>
        new StaffingProposalSlateService(
          slateRepository,
          prisma,
          createAssignment,
          auditLogger,
          notifications,
        ),
      inject: [
        PrismaStaffingRequestProposalSlateRepository,
        PrismaService,
        CreateProjectAssignmentService,
        AuditLoggerService,
        NotificationEventTranslatorService,
      ],
    },
  ],
})
export class StaffingRequestsModule {}
