import { Module, forwardRef } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';

import { AssignmentsModule } from '../assignments/assignments.module';
import { NotificationEventTranslatorService } from '../notifications/application/notification-event-translator.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { CreateProjectAssignmentService } from '../assignments/application/create-project-assignment.service';
import { InMemoryProjectAssignmentRepository } from '../assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryPersonRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { InMemoryOrgUnitRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-org-unit.repository';
import { InMemoryPersonOrgMembershipRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-person-org-membership.repository';
import { OrganizationModule } from '../organization/organization.module';
import { ActivateProjectService } from './application/activate-project.service';
import { AssignProjectTeamService } from './application/assign-project-team.service';
import { CloseProjectService } from './application/close-project.service';
import { CreateProjectService } from './application/create-project.service';
import { GetProjectByIdService } from './application/get-project-by-id.service';
import { ProjectDashboardQueryService } from './application/project-dashboard-query.service';
import { ProjectDirectoryQueryService } from './application/project-directory-query.service';
import { ProjectHealthQueryService } from './application/project-health-query.service';
import { UpdateProjectService } from './application/update-project.service';
import { InMemoryExternalSyncStateRepository } from './infrastructure/repositories/in-memory/in-memory-external-sync-state.repository';
import { InMemoryProjectExternalLinkRepository } from './infrastructure/repositories/in-memory/in-memory-project-external-link.repository';
import { InMemoryProjectRepository } from './infrastructure/repositories/in-memory/in-memory-project.repository';
import { PrismaExternalSyncStateRepository } from './infrastructure/repositories/prisma/prisma-external-sync-state.repository';
import { PrismaProjectExternalLinkRepository } from './infrastructure/repositories/prisma/prisma-project-external-link.repository';
import { PrismaProjectRepository } from './infrastructure/repositories/prisma/prisma-project.repository';
import { ProjectsController } from './presentation/projects.controller';
import { WorkEvidenceModule } from '../work-evidence/work-evidence.module';
import { InMemoryWorkEvidenceRepository } from '../work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';

@Module({
  imports: [
    forwardRef(() => OrganizationModule),
    WorkEvidenceModule,
    forwardRef(() => AssignmentsModule),
    NotificationsModule,
  ],
  controllers: [ProjectsController],
  providers: [
    {
      provide: InMemoryProjectRepository,
      useFactory: (prisma: PrismaService) => new PrismaProjectRepository(prisma.project),
      inject: [PrismaService],
    },
    {
      provide: InMemoryProjectExternalLinkRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaProjectExternalLinkRepository(prisma.projectExternalLink),
      inject: [PrismaService],
    },
    {
      provide: InMemoryExternalSyncStateRepository,
      useFactory: (prisma: PrismaService) =>
        new PrismaExternalSyncStateRepository(prisma.externalSyncState),
      inject: [PrismaService],
    },
    {
      provide: AssignProjectTeamService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        orgUnitRepository: InMemoryOrgUnitRepository,
        personRepository: InMemoryPersonRepository,
        personOrgMembershipRepository: InMemoryPersonOrgMembershipRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        createProjectAssignmentService: CreateProjectAssignmentService,
        auditLogger: AuditLoggerService,
      ) =>
        new AssignProjectTeamService(
          projectRepository,
          orgUnitRepository,
          personRepository,
          personOrgMembershipRepository,
          projectAssignmentRepository,
          createProjectAssignmentService,
          auditLogger,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryOrgUnitRepository,
        InMemoryPersonRepository,
        InMemoryPersonOrgMembershipRepository,
        InMemoryProjectAssignmentRepository,
        CreateProjectAssignmentService,
        AuditLoggerService,
      ],
    },
    {
      provide: ActivateProjectService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) => new ActivateProjectService(projectRepository, auditLogger, notificationEventTranslator),
      inject: [InMemoryProjectRepository, AuditLoggerService, NotificationEventTranslatorService],
    },
    {
      provide: CloseProjectService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        workEvidenceRepository: InMemoryWorkEvidenceRepository,
        personRepository: InMemoryPersonRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        appConfig: AppConfig,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
      ) =>
        new CloseProjectService(
          projectRepository,
          workEvidenceRepository,
          personRepository,
          projectAssignmentRepository,
          appConfig,
          auditLogger,
          notificationEventTranslator,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryWorkEvidenceRepository,
        InMemoryPersonRepository,
        InMemoryProjectAssignmentRepository,
        AppConfig,
        AuditLoggerService,
        NotificationEventTranslatorService,
      ],
    },
    {
      provide: ProjectDirectoryQueryService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        projectExternalLinkRepository: InMemoryProjectExternalLinkRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
      ) =>
        new ProjectDirectoryQueryService(
          projectRepository,
          projectExternalLinkRepository,
          projectAssignmentRepository,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryProjectExternalLinkRepository,
        InMemoryProjectAssignmentRepository,
      ],
    },
    {
      provide: GetProjectByIdService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        projectExternalLinkRepository: InMemoryProjectExternalLinkRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        prisma: PrismaService,
      ) =>
        new GetProjectByIdService(
          projectRepository,
          projectExternalLinkRepository,
          projectAssignmentRepository,
          prisma,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryProjectExternalLinkRepository,
        InMemoryProjectAssignmentRepository,
        PrismaService,
      ],
    },
    {
      provide: CreateProjectService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        personRepository: InMemoryPersonRepository,
        auditLogger: AuditLoggerService,
      ) => new CreateProjectService(projectRepository, personRepository, auditLogger),
      inject: [InMemoryProjectRepository, InMemoryPersonRepository, AuditLoggerService],
    },
    {
      provide: ProjectDashboardQueryService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        workEvidenceRepository: InMemoryWorkEvidenceRepository,
        prisma: PrismaService,
      ) => new ProjectDashboardQueryService(projectRepository, projectAssignmentRepository, workEvidenceRepository, prisma),
      inject: [InMemoryProjectRepository, InMemoryProjectAssignmentRepository, InMemoryWorkEvidenceRepository, PrismaService],
    },
    {
      provide: UpdateProjectService,
      useFactory: (projectRepository: InMemoryProjectRepository) =>
        new UpdateProjectService(projectRepository),
      inject: [InMemoryProjectRepository],
    },
    {
      provide: ProjectHealthQueryService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        workEvidenceRepository: InMemoryWorkEvidenceRepository,
      ) => new ProjectHealthQueryService(projectRepository, projectAssignmentRepository, workEvidenceRepository),
      inject: [InMemoryProjectRepository, InMemoryProjectAssignmentRepository, InMemoryWorkEvidenceRepository],
    },
  ],
  exports: [
    ActivateProjectService,
    AssignProjectTeamService,
    CloseProjectService,
    CreateProjectService,
    ProjectDirectoryQueryService,
    GetProjectByIdService,
    InMemoryProjectRepository,
    InMemoryProjectExternalLinkRepository,
    InMemoryExternalSyncStateRepository,
    ProjectDashboardQueryService,
    ProjectHealthQueryService,
    UpdateProjectService,
  ],
})
export class ProjectRegistryModule {}
