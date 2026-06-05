import { Module } from '@nestjs/common';
import { AssignmentsModule } from '@src/modules/assignments/assignments.module';
import { CaseManagementModule } from '@src/modules/case-management/case-management.module';
import { ApproveCaseService } from '@src/modules/case-management/application/approve-case.service';
import { FinancialGovernanceModule } from '@src/modules/financial-governance/financial-governance.module';
import { DecideBudgetChangeService } from '@src/modules/financial-governance/application/decide-budget-change.service';
import { LeaveRequestsModule } from '@src/modules/leave-requests/leave-requests.module';
import { LeaveRequestsService } from '@src/modules/leave-requests/application/leave-requests.service';
import { OrganizationModule } from '@src/modules/organization/organization.module';
import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';
import { ProjectPositionsModule } from '@src/modules/project-positions/project-positions.module';
import { TransitionProjectPositionFillService } from '@src/modules/project-positions/application/transition-project-position-fill.service';
import { ProjectRegistryModule } from '@src/modules/project-registry/project-registry.module';
import { DecideProjectActivationService } from '@src/modules/project-registry/application/decide-project-activation.service';
import { SkillsModule } from '@src/modules/skills/skills.module';
import { SkillEndorsementService } from '@src/modules/skills/application/skill-endorsement.service';
import { StaffingRequestsModule } from '@src/modules/staffing-requests/staffing-requests.module';
import { TimesheetsModule } from '@src/modules/timesheets/timesheets.module';
import { TimesheetsService } from '@src/modules/timesheets/application/timesheets.service';
import { WorkEvidenceModule } from '@src/modules/work-evidence/work-evidence.module';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';

import { DeliveryManagerDashboardQueryService } from './application/delivery-manager-dashboard-query.service';
import { DirectorDashboardQueryService } from './application/director-dashboard-query.service';
import { DirectorSlaSummaryQueryService } from './application/director-sla-summary-query.service';
import { EmployeeDashboardQueryService } from './application/employee-dashboard-query.service';
import { HrManagerDashboardQueryService } from './application/hr-manager-dashboard-query.service';
import { PendingActionsQueryService } from './application/pending-actions-query.service';
import { PlannedVsActualQueryService } from './application/planned-vs-actual-query.service';
import { ProjectManagerDashboardQueryService } from './application/project-manager-dashboard-query.service';
import { ResourceManagerDashboardQueryService } from './application/resource-manager-dashboard-query.service';
import { RoleDashboardQueryService } from './application/role-dashboard-query.service';
import { WorkloadDashboardQueryService } from './application/workload-dashboard-query.service';
import { DirectorAnomalyDetectionService } from './application/director-anomaly-detection.service';
import { OrgHealthService } from './application/org-health.service';
import { PortfolioFinanceSummaryService } from './application/portfolio-finance-summary.service';
import { BenchAgingByDimensionService } from './application/bench-aging-by-dimension.service';
import { PersonProfileService } from './application/person-profile.service';
import { PortfolioDashboardService } from './application/portfolio-dashboard.service';
import { HrActionCardsService } from './application/hr-action-cards.service';
import { SidebarCountsService } from './application/sidebar-counts.service';
import { UnifiedApprovalQueueService } from './application/unified-approval-queue.service';
import { MeHomeService } from './application/me-home.service';
import { DirectorAnomaliesController } from './presentation/director-anomalies.controller';
import { PersonProfileController } from './presentation/person-profile.controller';
import { PortfolioDashboardController } from './presentation/portfolio-dashboard.controller';
import { RoleDashboardController } from './presentation/role-dashboard.controller';
import { WorkloadDashboardController } from './presentation/workload-dashboard.controller';
import { HrActionCardsController } from './presentation/hr-action-cards.controller';
import { UnifiedApprovalQueueController } from './presentation/unified-approval-queue.controller';
import { SidebarCountsController } from './presentation/sidebar-counts.controller';
import { MeHomeController } from './presentation/me-home.controller';
import { PrismaService } from '@src/shared/persistence/prisma.service';

@Module({
  imports: [AssignmentsModule, CaseManagementModule, FinancialGovernanceModule, LeaveRequestsModule, OrganizationModule, PlatformSettingsModule, ProjectPositionsModule, ProjectRegistryModule, SkillsModule, StaffingRequestsModule, TimesheetsModule, WorkEvidenceModule],
  controllers: [WorkloadDashboardController, RoleDashboardController, PortfolioDashboardController, HrActionCardsController, UnifiedApprovalQueueController, PersonProfileController, DirectorAnomaliesController, MeHomeController, SidebarCountsController],
  providers: [
    {
      provide: HrActionCardsService,
      useFactory: (prisma: PrismaService) => new HrActionCardsService(prisma),
      inject: [PrismaService],
    },
    {
      provide: UnifiedApprovalQueueService,
      useFactory: (
        prisma: PrismaService,
        leaveRequestsService: LeaveRequestsService,
        decideBudgetChangeService: DecideBudgetChangeService,
        decideProjectActivationService: DecideProjectActivationService,
        approveCaseService: ApproveCaseService,
        timesheetsService: TimesheetsService,
        transitionProjectPositionFillService: TransitionProjectPositionFillService,
        skillEndorsementService: SkillEndorsementService,
      ) =>
        new UnifiedApprovalQueueService(
          prisma,
          leaveRequestsService,
          decideBudgetChangeService,
          decideProjectActivationService,
          approveCaseService,
          timesheetsService,
          transitionProjectPositionFillService,
          skillEndorsementService,
        ),
      inject: [
        PrismaService,
        LeaveRequestsService,
        DecideBudgetChangeService,
        DecideProjectActivationService,
        ApproveCaseService,
        TimesheetsService,
        TransitionProjectPositionFillService,
        SkillEndorsementService,
      ],
    },
    {
      provide: PersonProfileService,
      useFactory: (prisma: PrismaService) => new PersonProfileService(prisma),
      inject: [PrismaService],
    },
    {
      provide: DirectorAnomalyDetectionService,
      useFactory: (prisma: PrismaService) => new DirectorAnomalyDetectionService(prisma),
      inject: [PrismaService],
    },
    {
      provide: PortfolioFinanceSummaryService,
      useFactory: (prisma: PrismaService) => new PortfolioFinanceSummaryService(prisma),
      inject: [PrismaService],
    },
    {
      provide: OrgHealthService,
      useFactory: (prisma: PrismaService) => new OrgHealthService(prisma),
      inject: [PrismaService],
    },
    {
      provide: BenchAgingByDimensionService,
      useFactory: (prisma: PrismaService) => new BenchAgingByDimensionService(prisma),
      inject: [PrismaService],
    },
    MeHomeService,
    {
      provide: SidebarCountsService,
      useFactory: (prisma: PrismaService) => new SidebarCountsService(prisma),
      inject: [PrismaService],
    },
    PortfolioDashboardService,
    DeliveryManagerDashboardQueryService,
    DirectorDashboardQueryService,
    EmployeeDashboardQueryService,
    HrManagerDashboardQueryService,
    ProjectManagerDashboardQueryService,
    ResourceManagerDashboardQueryService,
    {
      provide: WorkloadDashboardQueryService,
      useFactory: (
        personRepository: InMemoryPersonRepository,
        projectRepository: InMemoryProjectRepository,
        projectAssignmentRepository: InMemoryProjectAssignmentRepository,
        workEvidenceRepository: InMemoryWorkEvidenceRepository,
        platformSettingsService: PlatformSettingsService,
      ) => new WorkloadDashboardQueryService(
        personRepository,
        projectRepository,
        projectAssignmentRepository,
        workEvidenceRepository,
        platformSettingsService,
      ),
      inject: [
        InMemoryPersonRepository,
        InMemoryProjectRepository,
        InMemoryProjectAssignmentRepository,
        InMemoryWorkEvidenceRepository,
        PlatformSettingsService,
      ],
    },
    PlannedVsActualQueryService,
    RoleDashboardQueryService,
    PendingActionsQueryService,
    DirectorSlaSummaryQueryService,
  ],
  exports: [
    DeliveryManagerDashboardQueryService,
    DirectorDashboardQueryService,
    EmployeeDashboardQueryService,
    HrManagerDashboardQueryService,
    ProjectManagerDashboardQueryService,
    ResourceManagerDashboardQueryService,
    WorkloadDashboardQueryService,
    PlannedVsActualQueryService,
    RoleDashboardQueryService,
    PendingActionsQueryService,
    DirectorSlaSummaryQueryService,
    HrActionCardsService,
    UnifiedApprovalQueueService,
    PersonProfileService,
    DirectorAnomalyDetectionService,
    MeHomeService,
    SidebarCountsService,
    OrgHealthService,
  ],
})
export class DashboardModule {}
