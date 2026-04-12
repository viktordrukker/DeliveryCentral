import { Module } from '@nestjs/common';
import { AssignmentsModule } from '@src/modules/assignments/assignments.module';
import { CaseManagementModule } from '@src/modules/case-management/case-management.module';
import { OrganizationModule } from '@src/modules/organization/organization.module';
import { PlatformSettingsModule } from '@src/modules/platform-settings/platform-settings.module';
import { ProjectRegistryModule } from '@src/modules/project-registry/project-registry.module';
import { StaffingRequestsModule } from '@src/modules/staffing-requests/staffing-requests.module';
import { TimesheetsModule } from '@src/modules/timesheets/timesheets.module';
import { WorkEvidenceModule } from '@src/modules/work-evidence/work-evidence.module';
import { InMemoryProjectAssignmentRepository } from '@src/modules/assignments/infrastructure/repositories/in-memory/in-memory-project-assignment.repository';
import { InMemoryPersonRepository } from '@src/modules/organization/infrastructure/repositories/in-memory/in-memory-person.repository';
import { PlatformSettingsService } from '@src/modules/platform-settings/application/platform-settings.service';
import { InMemoryProjectRepository } from '@src/modules/project-registry/infrastructure/repositories/in-memory/in-memory-project.repository';
import { InMemoryWorkEvidenceRepository } from '@src/modules/work-evidence/infrastructure/repositories/in-memory/in-memory-work-evidence.repository';

import { DeliveryManagerDashboardQueryService } from './application/delivery-manager-dashboard-query.service';
import { DirectorDashboardQueryService } from './application/director-dashboard-query.service';
import { EmployeeDashboardQueryService } from './application/employee-dashboard-query.service';
import { HrManagerDashboardQueryService } from './application/hr-manager-dashboard-query.service';
import { PlannedVsActualQueryService } from './application/planned-vs-actual-query.service';
import { ProjectManagerDashboardQueryService } from './application/project-manager-dashboard-query.service';
import { ResourceManagerDashboardQueryService } from './application/resource-manager-dashboard-query.service';
import { RoleDashboardQueryService } from './application/role-dashboard-query.service';
import { WorkloadDashboardQueryService } from './application/workload-dashboard-query.service';
import { RoleDashboardController } from './presentation/role-dashboard.controller';
import { WorkloadDashboardController } from './presentation/workload-dashboard.controller';

@Module({
  imports: [AssignmentsModule, CaseManagementModule, OrganizationModule, PlatformSettingsModule, ProjectRegistryModule, StaffingRequestsModule, TimesheetsModule, WorkEvidenceModule],
  controllers: [WorkloadDashboardController, RoleDashboardController],
  providers: [
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
  ],
})
export class DashboardModule {}
