import { Module, forwardRef } from '@nestjs/common';

import { AppConfig } from '@src/shared/config/app-config';
import { PrismaService } from '@src/shared/persistence/prisma.service';
import { AuditLoggerService } from '@src/modules/audit-observability/application/audit-logger.service';
import { ResponsibilityResolverService } from '@src/modules/identity-access/application/responsibility-resolver.service';

import { AssignmentsModule } from '../assignments/assignments.module';
import { NotificationEventTranslatorService } from '../notifications/application/notification-event-translator.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { PROJECT_POSITION_REPOSITORY } from '../project-positions/application/tokens';
import { CreateProjectPositionService } from '../project-positions/application/create-project-position.service';
import { TransitionProjectPositionFillService } from '../project-positions/application/transition-project-position-fill.service';
import { ProjectPositionRepositoryPort } from '../project-positions/domain/repositories/project-position-repository.port';
import { ProjectPositionsModule } from '../project-positions/project-positions.module';
import { InMemoryPersonRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { InMemoryOrgUnitRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-org-unit.repository';
import { InMemoryPersonOrgMembershipRepository } from '../organization/infrastructure/repositories/in-memory/in-memory-person-org-membership.repository';
import { OrganizationModule } from '../organization/organization.module';
import { ActivateProjectService } from './application/activate-project.service';
import { DecideProjectActivationService } from './application/decide-project-activation.service';
import { SubmitProjectForApprovalService } from './application/submit-project-for-approval.service';
import { AssignProjectTeamService } from './application/assign-project-team.service';
import { CloseProjectService } from './application/close-project.service';
import { ProjectCloseUndoExecutor } from './application/project-close-undo.executor';
import { UndoActionExecutorRegistry } from '@src/modules/undo/application/undo-action-executor.registry';
import { UndoService } from '@src/modules/undo/application/undo.service';
import { CreateProjectService } from './application/create-project.service';
import { GetProjectByIdService } from './application/get-project-by-id.service';
import { ProjectDashboardQueryService } from './application/project-dashboard-query.service';
import { ProjectDirectoryQueryService } from './application/project-directory-query.service';
import { ProjectHealthQueryService } from './application/project-health-query.service';
import { TimeToFillService } from './application/time-to-fill.service';
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
import { PortfolioRadiatorSummaryService } from './application/portfolio-radiator-summary.service';
import { ProjectChangeRequestService } from './application/project-change-request.service';
import { OrgConfigService } from './application/org-config.service';
import { ProjectExceptionsService } from './application/project-exceptions.service';
import { ProjectPulseQueryService } from './application/project-pulse-query.service';
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
import { PortfolioRadiatorSummaryController } from './presentation/portfolio-radiator-summary.controller';
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
    ProjectPositionsModule,
    NotificationsModule,
    PulseModule,
    InAppNotificationsModule,
    PlatformSettingsModule,
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
    PortfolioRadiatorSummaryController,
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
        projectPositionRepository: ProjectPositionRepositoryPort,
        createProjectPositionService: CreateProjectPositionService,
        transitionProjectPositionFillService: TransitionProjectPositionFillService,
        auditLogger: AuditLoggerService,
      ) =>
        new AssignProjectTeamService(
          projectRepository,
          orgUnitRepository,
          personRepository,
          personOrgMembershipRepository,
          projectPositionRepository,
          createProjectPositionService,
          transitionProjectPositionFillService,
          auditLogger,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryOrgUnitRepository,
        InMemoryPersonRepository,
        InMemoryPersonOrgMembershipRepository,
        PROJECT_POSITION_REPOSITORY,
        CreateProjectPositionService,
        TransitionProjectPositionFillService,
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
      provide: SubmitProjectForApprovalService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        responsibilityResolver: ResponsibilityResolverService,
      ) =>
        new SubmitProjectForApprovalService(
          projectRepository,
          prisma,
          auditLogger,
          notificationEventTranslator,
          responsibilityResolver,
        ),
      inject: [
        InMemoryProjectRepository,
        PrismaService,
        AuditLoggerService,
        NotificationEventTranslatorService,
        ResponsibilityResolverService,
      ],
    },
    {
      provide: DecideProjectActivationService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        prisma: PrismaService,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        responsibilityResolver: ResponsibilityResolverService,
      ) =>
        new DecideProjectActivationService(
          projectRepository,
          prisma,
          auditLogger,
          notificationEventTranslator,
          responsibilityResolver,
        ),
      inject: [
        InMemoryProjectRepository,
        PrismaService,
        AuditLoggerService,
        NotificationEventTranslatorService,
        ResponsibilityResolverService,
      ],
    },
    {
      provide: CloseProjectService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        workEvidenceRepository: InMemoryWorkEvidenceRepository,
        personRepository: InMemoryPersonRepository,
        projectPositionRepository: ProjectPositionRepositoryPort,
        appConfig: AppConfig,
        auditLogger: AuditLoggerService,
        notificationEventTranslator: NotificationEventTranslatorService,
        undoService: UndoService,
      ) =>
        new CloseProjectService(
          projectRepository,
          workEvidenceRepository,
          personRepository,
          projectPositionRepository,
          appConfig,
          auditLogger,
          notificationEventTranslator,
          undoService,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryWorkEvidenceRepository,
        InMemoryPersonRepository,
        PROJECT_POSITION_REPOSITORY,
        AppConfig,
        AuditLoggerService,
        NotificationEventTranslatorService,
        UndoService,
      ],
    },
    {
      provide: ProjectCloseUndoExecutor,
      useFactory: (
        repository: InMemoryProjectRepository,
        auditLogger: AuditLoggerService,
      ) => new ProjectCloseUndoExecutor(repository, auditLogger),
      inject: [InMemoryProjectRepository, AuditLoggerService],
    },
    {
      provide: ProjectDirectoryQueryService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        projectExternalLinkRepository: InMemoryProjectExternalLinkRepository,
        prisma: PrismaService,
      ) =>
        new ProjectDirectoryQueryService(
          projectRepository,
          projectExternalLinkRepository,
          prisma,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryProjectExternalLinkRepository,
        PrismaService,
      ],
    },
    {
      provide: GetProjectByIdService,
      useFactory: (
        projectRepository: InMemoryProjectRepository,
        projectExternalLinkRepository: InMemoryProjectExternalLinkRepository,
        prisma: PrismaService,
      ) =>
        new GetProjectByIdService(
          projectRepository,
          projectExternalLinkRepository,
          prisma,
        ),
      inject: [
        InMemoryProjectRepository,
        InMemoryProjectExternalLinkRepository,
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
        projectPositionRepository: ProjectPositionRepositoryPort,
        workEvidenceRepository: InMemoryWorkEvidenceRepository,
        prisma: PrismaService,
      ) => new ProjectDashboardQueryService(projectRepository, projectPositionRepository, workEvidenceRepository, prisma),
      inject: [InMemoryProjectRepository, PROJECT_POSITION_REPOSITORY, InMemoryWorkEvidenceRepository, PrismaService],
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
        projectPositionRepository: ProjectPositionRepositoryPort,
        prisma: PrismaService,
      ) => new ProjectHealthQueryService(projectRepository, projectPositionRepository, prisma),
      inject: [InMemoryProjectRepository, PROJECT_POSITION_REPOSITORY, PrismaService],
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
    PortfolioRadiatorSummaryService,
    ProjectPulseService,
    ProjectPulseQueryService,
    ProjectExceptionsService,
    SpcService,
    OrgConfigService,
    PulseReportService,
    TimeToFillService,
  ],
  exports: [
    ActivateProjectService,
    SubmitProjectForApprovalService,
    DecideProjectActivationService,
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
export class ProjectRegistryModule {
  // HD-8 / Chunk 8.4a — register the project-close undo executor at boot.
  public constructor(
    registry: UndoActionExecutorRegistry,
    closeExecutor: ProjectCloseUndoExecutor,
  ) {
    registry.register(closeExecutor);
  }
}
