import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { AssignmentWorkloadModule } from './modules/assignment-workload/assignment-workload.module';
import { AuditObservabilityModule } from './modules/audit-observability/audit-observability.module';
import { CaseManagementModule } from './modules/case-management/case-management.module';
import { CustomizationMetadataModule } from './modules/customization-metadata/customization-metadata.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FinancialGovernanceModule } from './modules/financial-governance/financial-governance.module';
import { ExceptionsModule } from './modules/exceptions/exceptions.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityAccessModule } from './modules/identity-access/identity-access.module';
import { RequestPrincipalMiddleware } from './modules/identity-access/application/request-principal.middleware';
import { IntegrationsHubModule } from './modules/integrations-hub/integrations-hub.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrganizationOrgChartModule } from './modules/organization-org-chart/organization-org-chart.module';
import { ProjectRegistryModule } from './modules/project-registry/project-registry.module';
import { ResourcePoolsModule } from './modules/resource-pools/resource-pools.module';
import { TimeWorkEvidenceModule } from './modules/time-work-evidence/time-work-evidence.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { PlatformSettingsModule } from './modules/platform-settings/platform-settings.module';
import { PulseModule } from './modules/pulse/pulse.module';
import { SkillsModule } from './modules/skills/skills.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StaffingDeskModule } from './modules/staffing-desk/staffing-desk.module';
import { StaffingRequestsModule } from './modules/staffing-requests/staffing-requests.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { WorkloadModule } from './modules/workload/workload.module';
import { AppConfigModule } from './shared/config/app-config.module';
import { CorrelationIdMiddleware } from './shared/observability/correlation-id.middleware';
import { RequestLoggingMiddleware } from './shared/observability/request-logging.middleware';
import { ObservabilityModule } from './shared/observability/observability.module';
import { PrismaModule } from './shared/persistence/prisma.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AppConfigModule,
    PrismaModule,
    ObservabilityModule,
    AdminModule,
    HealthModule,
    DashboardModule,
    ExceptionsModule,
    IdentityAccessModule,
    AuthModule,
    OrganizationOrgChartModule,
    ProjectRegistryModule,
    AssignmentWorkloadModule,
    TimeWorkEvidenceModule,
    TimesheetsModule,
    WorkloadModule,
    CaseManagementModule,
    IntegrationsHubModule,
    NotificationsModule,
    AuditObservabilityModule,
    CustomizationMetadataModule,
    ResourcePoolsModule,
    FinancialGovernanceModule,
    PulseModule,
    PlatformSettingsModule,
    SkillsModule,
    StaffingDeskModule,
    StaffingRequestsModule,
    LeaveRequestsModule,
    OvertimeModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, RequestPrincipalMiddleware, RequestLoggingMiddleware)
      .forRoutes('*');
  }
}
