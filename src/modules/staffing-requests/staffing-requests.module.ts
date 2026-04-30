import { Module, forwardRef } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

import { AssignmentsModule } from '../assignments/assignments.module';
import { AuditObservabilityModule } from '../audit-observability/audit-observability.module';
import { CreateProjectAssignmentService } from '../assignments/application/create-project-assignment.service';
import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationEventTranslatorService } from '../notifications/application/notification-event-translator.service';

import { DeriveStaffingRequestStatusService } from './application/derive-staffing-request-status.service';
import {
  STAFFING_REQUEST_PROPOSAL_SLATE_REPOSITORY,
  StaffingProposalSlateService,
} from './application/staffing-proposal-slate.service';
import { StaffingSuggestionsService } from './application/staffing-suggestions.service';
import { InMemoryStaffingRequestService } from './infrastructure/services/in-memory-staffing-request.service';
import { PrismaStaffingRequestProposalSlateRepository } from './infrastructure/repositories/prisma/prisma-staffing-request-proposal-slate.repository';
import { StaffingRequestsController } from './presentation/staffing-requests.controller';

@Module({
  imports: [
    forwardRef(() => AssignmentsModule),
    AuditObservabilityModule,
    NotificationsModule,
  ],
  controllers: [StaffingRequestsController],
  exports: [InMemoryStaffingRequestService, DeriveStaffingRequestStatusService, StaffingProposalSlateService],
  providers: [
    InMemoryStaffingRequestService,
    DeriveStaffingRequestStatusService,
    PrismaStaffingRequestProposalSlateRepository,
    {
      provide: StaffingSuggestionsService,
      useFactory: (prisma: PrismaService) => new StaffingSuggestionsService(prisma),
      inject: [PrismaService],
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
