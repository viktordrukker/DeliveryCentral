import { Module, forwardRef } from '@nestjs/common';

import { AuditLoggerService } from '../audit-observability/application/audit-logger.service';
import { NotificationEventTranslatorService } from '../notifications/application/notification-event-translator.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { AmendProjectAssignmentService } from './application/amend-project-assignment.service';
import { ActivateApprovedAssignmentsService } from './application/activate-approved-assignments.service';
import { ApproveProjectAssignmentService } from './application/approve-project-assignment.service';
import { BulkCreateProjectAssignmentsService } from './application/bulk-create-project-assignments.service';
import { CreateProjectAssignmentService } from './application/create-project-assignment.service';
import { EndProjectAssignmentService } from './application/end-project-assignment.service';
import { GetAssignmentByIdService } from './application/get-assignment-by-id.service';
import { ListAssignmentsService } from './application/list-assignments.service';
import { RejectProjectAssignmentService } from './application/reject-project-assignment.service';
import { RevokeProjectAssignmentService } from './application/revoke-project-assignment.service';
import { TransitionProjectAssignmentService } from './application/transition-project-assignment.service';
import { InMemoryAssignmentReferenceRepository } from './infrastructure/repositories/in-memory/in-memory-assignment-reference.repository';
import { InMemoryProjectAssignmentRepository } from './infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryPersonRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { OrganizationModule } from '../organization/organization.module';
import { PrismaProjectAssignmentRepository } from './infrastructure/repositories/prisma/prisma-project-assignment.repository';
import { PrismaAssignmentReferenceRepository } from './infrastructure/repositories/prisma/prisma-assignment-reference.repository';
import { AssignmentsController } from './presentation/assignments.controller';

@Module({
  imports: [forwardRef(() => OrganizationModule), NotificationsModule],
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
    {
      provide: CreateProjectAssignmentService,
      useFactory: (
        repository: InMemoryProjectAssignmentRepository,
        referenceRepository: InMemoryAssignmentReferenceRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) =>
        new CreateProjectAssignmentService(
          repository,
          referenceRepository,
          auditLogger,
          notificationEventTranslator,
        ),
      inject: [
        InMemoryProjectAssignmentRepository,
        InMemoryAssignmentReferenceRepository,
        AuditLoggerService,
        NotificationEventTranslatorService,
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
      ) =>
        new TransitionProjectAssignmentService(
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
  ],
})
export class AssignmentsModule {}
