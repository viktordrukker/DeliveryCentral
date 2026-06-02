import { Module, forwardRef } from '@nestjs/common';

import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
import { EffectiveBillRateResolverService } from '../financial-governance/application/effective-bill-rate-resolver.service';
import { FinancialGovernanceModule } from '../financial-governance/financial-governance.module';
import { NotificationEventTranslatorService } from '../notifications/application/notification-event-translator.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { MetricsService } from '@src/shared/observability/metrics.service';
import { AmendProjectAssignmentService } from './application/amend-project-assignment.service';
import { ActivateApprovedAssignmentsService } from './application/activate-approved-assignments.service';
import { ApproveProjectAssignmentService } from './application/approve-project-assignment.service';
import { BulkCreateProjectAssignmentsService } from './application/bulk-create-project-assignments.service';
import { AssignmentSlaService } from './application/assignment-sla.service';
import { AssignmentSlaSweepService } from './application/assignment-sla-sweep.service';
import { CreateProjectAssignmentService } from './application/create-project-assignment.service';
import { DirectorApprovalThresholdService } from './application/director-approval-threshold.service';
import { DirectorApproveService } from './application/director-approve.service';
import { EndProjectAssignmentService } from './application/end-project-assignment.service';
import { ScheduleOnboardingService } from './application/schedule-onboarding.service';
import { GetAssignmentByIdService } from './application/get-assignment-by-id.service';
import { ListAssignmentsService } from './application/list-assignments.service';
import { RejectProjectAssignmentService } from './application/reject-project-assignment.service';
import { RevokeProjectAssignmentService } from './application/revoke-project-assignment.service';
import { TransitionProjectAssignmentService } from './application/transition-project-assignment.service';
import { AssignmentCancelUndoExecutor } from './application/assignment-cancel-undo.executor';
import { UndoActionExecutorRegistry } from '@src/modules/undo/application/undo-action-executor.registry';
import { UndoService } from '@src/modules/undo/application/undo.service';
import { InMemoryAssignmentReferenceRepository } from './infrastructure/repositories/in-memory/in-memory-assignment-reference.repository';
import { InMemoryProjectAssignmentRepository } from './infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryPersonRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { OrganizationModule } from '../organization/organization.module';
import { PrismaProjectAssignmentRepository } from './infrastructure/repositories/prisma/prisma-project-assignment.repository';
import { PrismaAssignmentReferenceRepository } from './infrastructure/repositories/prisma/prisma-assignment-reference.repository';
import { AssignmentsController } from './presentation/assignments.controller';

@Module({
  imports: [
    forwardRef(() => OrganizationModule),
    NotificationsModule,
    FinancialGovernanceModule,
  ],
  controllers: [AssignmentsController],
  providers: [
    {
      provide: InMemoryProjectAssignmentRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaProjectAssignmentRepository(
          prisma.projectAssignment,
          prisma.assignmentApproval,
          prisma.assignmentHistory,
        ),
      inject: [PrismaService],
    },
    {
      provide: InMemoryAssignmentReferenceRepository,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        prisma: PrismaService,
      ) => new PrismaAssignmentReferenceRepository(personRepository, prisma.project),
      inject: [InMemoryPersonRepository, PrismaService],
    },
    {
      provide: ListAssignmentsService,
      useFactory: (repository: InMemoryProjectAssignmentRepository, prisma: PrismaService) =>
        new ListAssignmentsService(repository, prisma),
      inject: [InMemoryProjectAssignmentRepository, PrismaService],
    },
    {
      provide: GetAssignmentByIdService,
      useFactory: (repository: InMemoryProjectAssignmentRepository, prisma: PrismaService) =>
        new GetAssignmentByIdService(repository, prisma),
      inject: [InMemoryProjectAssignmentRepository, PrismaService],
    },
    DirectorApprovalThresholdService,
    {
      provide: AssignmentSlaService,
      useFactory: (prisma: PrismaService) => new AssignmentSlaService(prisma),
      inject: [PrismaService],
    },
    {
      provide: AssignmentSlaSweepService,
      useFactory: (
        prisma: PrismaService,
        notificationEventTranslator: NotificationEventTranslatorService,
        auditLogger: AuditLoggerService,
        metrics: MetricsService,
      ) =>
        new AssignmentSlaSweepService(prisma, notificationEventTranslator, auditLogger, metrics),
      inject: [PrismaService, NotificationEventTranslatorService, AuditLoggerService, MetricsService],
    },
    {
      provide: CreateProjectAssignmentService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        prisma: PrismaService,
        referenceRepository: InMemoryAssignmentReferenceRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        directorApprovalThresholdService: DirectorApprovalThresholdService,
      ) =>
        new CreateProjectAssignmentService(
          repository,
          prisma,
          referenceRepository,
          auditLogger,
          notificationEventTranslator,
          undefined,
          directorApprovalThresholdService,
        ),
      inject: [
        InMemoryProjectAssignmentRepository,
        PrismaService,
        InMemoryAssignmentReferenceRepository,
        AuditLoggerService,
        NotificationEventTranslatorService,
        DirectorApprovalThresholdService,
      ],
    },
    {
      provide: DirectorApproveService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        auditLogger: AuditLoggerService,
      ) => new DirectorApproveService(repository, auditLogger),
      inject: [InMemoryProjectAssignmentRepository, AuditLoggerService],
    },
    {
      provide: ScheduleOnboardingService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        slaService: AssignmentSlaService,
      ) =>
        new ScheduleOnboardingService(
          repository,
          auditLogger,
          notificationEventTranslator,
          slaService,
        ),
      inject: [
        InMemoryProjectAssignmentRepository,
        AuditLoggerService,
        NotificationEventTranslatorService,
        AssignmentSlaService,
      ],
    },
    {
      provide: ApproveProjectAssignmentService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) =>
        new ApproveProjectAssignmentService(
          repository,
          auditLogger,
          notificationEventTranslator,
        ),
      inject: [
        InMemoryProjectAssignmentRepository,
        AuditLoggerService,
        NotificationEventTranslatorService,
      ],
    },
    {
      provide: BulkCreateProjectAssignmentsService,
      useFactory: (createProjectAssignmentService: CreateProjectAssignmentService) =>
        new BulkCreateProjectAssignmentsService(createProjectAssignmentService),
      inject: [CreateProjectAssignmentService],
    },
    {
      provide: RejectProjectAssignmentService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) =>
        new RejectProjectAssignmentService(
          repository,
          auditLogger,
          notificationEventTranslator,
        ),
      inject: [
        InMemoryProjectAssignmentRepository,
        AuditLoggerService,
        NotificationEventTranslatorService,
      ],
    },
    {
      provide: EndProjectAssignmentService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) => new EndProjectAssignmentService(repository, auditLogger, notificationEventTranslator),
      inject: [InMemoryProjectAssignmentRepository, AuditLoggerService, NotificationEventTranslatorService],
    },
    {
      provide: AmendProjectAssignmentService,
      useFactory: (repository: InMemoryProjectAssignmentRepository) =>
        new AmendProjectAssignmentService(repository),
      inject: [InMemoryProjectAssignmentRepository],
    },
    {
      provide: RevokeProjectAssignmentService,
      useFactory: (repository: InMemoryProjectAssignmentRepository) =>
        new RevokeProjectAssignmentService(repository),
      inject: [InMemoryProjectAssignmentRepository],
    },
    {
      provide: ActivateApprovedAssignmentsService,
      useFactory: (repository: InMemoryProjectAssignmentRepository) =>
        new ActivateApprovedAssignmentsService(repository),
      inject: [InMemoryProjectAssignmentRepository],
    },
    {
      provide: TransitionProjectAssignmentService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        slaService: AssignmentSlaService,
        undoService: UndoService,
        billRateResolver: EffectiveBillRateResolverService,
        prisma: PrismaService,
      ) =>
        new TransitionProjectAssignmentService(
          repository,
          auditLogger,
          notificationEventTranslator,
          slaService,
          undoService,
          billRateResolver,
          prisma,
        ),
      inject: [
        InMemoryProjectAssignmentRepository,
        AuditLoggerService,
        NotificationEventTranslatorService,
        AssignmentSlaService,
        UndoService,
        EffectiveBillRateResolverService,
        PrismaService,
      ],
    },
    {
      provide: AssignmentCancelUndoExecutor,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        auditLogger: AuditLoggerService,
      ) => new AssignmentCancelUndoExecutor(repository, auditLogger),
      inject: [InMemoryProjectAssignmentRepository, AuditLoggerService],
    },
  ],
  exports: [
    ActivateApprovedAssignmentsService,
    CreateProjectAssignmentService,
    BulkCreateProjectAssignmentsService,
    ListAssignmentsService,
    GetAssignmentByIdService,
    ApproveProjectAssignmentService,
    RejectProjectAssignmentService,
    EndProjectAssignmentService,
    AmendProjectAssignmentService,
    RevokeProjectAssignmentService,
    TransitionProjectAssignmentService,
    InMemoryProjectAssignmentRepository,
    DirectorApprovalThresholdService,
    DirectorApproveService,
    ScheduleOnboardingService,
    AssignmentSlaService,
    AssignmentSlaSweepService,
  ],
})
export class AssignmentsModule {
  // HD-8 / Chunk 8.2 — register the cancel-undo executor with the
  // global UndoActionExecutorRegistry at boot, mirroring how the
  // notification translator's outbox handlers register in HD-0.3.
  public constructor(
    registry: UndoActionExecutorRegistry,
    cancelExecutor: AssignmentCancelUndoExecutor,
  ) {
    registry.register(cancelExecutor);
  }
}
