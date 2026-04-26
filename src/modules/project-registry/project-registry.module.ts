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
import { ClientService } from './application/client.service';
import { GenerateStaffingRequestsFromPlanService } from './application/generate-staffing-requests-from-plan.service';
import { PortfolioRadiatorService } from './application/portfolio-radiator.service';
import { ProjectChangeRequestService } from './application/project-change-request.service';
import { OrgConfigService } from './application/org-config.service';
import { ProjectExceptionsService } from './application/project-exceptions.service';
import { ProjectPulseService } from './application/project-pulse.service';
import { PulseReportService } from './application/pulse-report.service';
import { SpcService } from './application/spc.service';
import { ProjectClosureReadinessService } from './application/project-closure-readiness.service';
import { ProjectMilestoneService } from './application/project-milestone.service';
import { ProjectRagService } from './application/project-rag.service';
import { ProjectRolePlanService } from './application/project-role-plan.service';
import { ProjectRiskService } from './application/project-risk.service';
import { RadiatorNotificationService } from './application/radiator-notification.service';
import { RadiatorOverrideService } from './application/radiator-override.service';
import { RadiatorScoringService } from './application/radiator-scoring.service';
import { RadiatorSignalCollectorService } from './application/radiator-signal-collector.service';
import { RadiatorThresholdService } from './application/radiator-threshold.service';
import { VendorService } from './application/vendor.service';
import { ChangeRequestController } from './presentation/change-request.controller';
import { ClientController } from './presentation/client.controller';
import { MilestoneController } from './presentation/milestone.controller';
import { PortfolioRadiatorController } from './presentation/portfolio-radiator.controller';
import { OrgConfigController } from './presentation/org-config.controller';
import { ProjectExceptionsController } from './presentation/project-exceptions.controller';
import { ProjectPulseController } from './presentation/project-pulse.controller';
import { PulseReportController } from './presentation/pulse-report.controller';
import { SpcController } from './presentation/spc.controller';
import { ProjectsController } from './presentation/projects.controller';
import { ProjectRagController } from './presentation/rag.controller';
import { ProjectRolePlanController } from './presentation/role-plan.controller';
import { ProjectRiskController } from './presentation/risk.controller';
import { RadiatorController } from './presentation/radiator.controller';
import { RadiatorThresholdController } from './presentation/radiator-threshold.controller';
import { VendorController, ProjectVendorController } from './presentation/vendor.controller';
import { InAppNotificationsModule } from '../in-app-notifications/in-app-notifications.module';
import { PulseModule } from '../pulse/pulse.module';
import { WorkEvidenceModule } from '../work-evidence/work-evidence.module';
import { InMemoryWorkEvidenceRepository } from '../work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';

@Module({
  imports: [
    forwardRef(() => OrganizationModule),
    WorkEvidenceModule,
    forwardRef(() => AssignmentsModule),
    NotificationsModule,
    PulseModule,
    InAppNotificationsModule,
  ],
  controllers: [
    ProjectsController,
    ClientController,
    VendorController,
    ProjectVendorController,
    ProjectRolePlanController,
    ProjectRagController,
    ProjectRiskController,
    RadiatorController,
    PortfolioRadiatorController,
    RadiatorThresholdController,
    MilestoneController,
    ChangeRequestController,
    ProjectPulseController,
    ProjectExceptionsController,
    SpcController,
    OrgConfigController,
    PulseReportController,
  ],
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
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
      ) => new UpdateProjectService(projectRepository, prisma, auditLogger),
      inject: [InMemoryProjectRepository, PrismaService, AuditLoggerService],
    },
    {
      provide: ProjectHealthQueryService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        prisma: PrismaService,
      ) => new ProjectHealthQueryService(projectRepository, projectAssignmentRepository, prisma),
      inject: [InMemoryProjectRepository, InMemoryProjectAssignmentRepository, PrismaService],
    },
    ClientService,
    VendorService,
    ProjectRolePlanService,
    GenerateStaffingRequestsFromPlanService,
    ProjectClosureReadinessService,
    ProjectRagService,
    ProjectRiskService,
    ProjectMilestoneService,
    ProjectChangeRequestService,
    RadiatorSignalCollectorService,
    RadiatorThresholdService,
    RadiatorScoringService,
    RadiatorNotificationService,
    RadiatorOverrideService,
    PortfolioRadiatorService,
    ProjectPulseService,
    ProjectExceptionsService,
    SpcService,
    OrgConfigService,
    PulseReportService,
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
    ProjectRolePlanService,
    UpdateProjectService,
  ],
})
export class ProjectRegistryModule {}
