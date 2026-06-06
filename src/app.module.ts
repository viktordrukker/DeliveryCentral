import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuditReadInterceptor } from './shared/http/audit-read.interceptor';
import { DeprecatedEndpointInterceptor } from './shared/http/deprecated-endpoint.interceptor';
import { IdempotencyInterceptor } from './shared/http/idempotency.interceptor';

import { AdminModule } from './modules/admin/admin.module';
import { AdminFeatureFlagsModule } from './modules/admin-feature-flags/admin-feature-flags.module';
import { AuthModule } from './modules/auth/auth.module';
import { AssignmentWorkloadModule } from './modules/assignment-workload/assignment-workload.module';
import { AuditObservabilityModule } from './modules/audit-observability/audit-observability.module';
import { CaseManagementModule } from './modules/case-management/case-management.module';
import { CustomizationMetadataModule } from './modules/customization-metadata/customization-metadata.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DmTeamDetailModule } from './modules/dm-team-detail/dm-team-detail.module';
import { FinancialGovernanceModule } from './modules/financial-governance/financial-governance.module';
import { ExceptionsModule } from './modules/exceptions/exceptions.module';
import { HealthModule } from './modules/health/health.module';
import { HelpCenterModule } from './modules/help-center/help-center.module';
import { UndoModule } from './modules/undo/undo.module';
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
import { SearchModule } from './modules/search/search.module';
import { SetupModule } from './modules/setup/setup.module';
import { RequireSetupCompleteGuard } from './modules/setup/application/require-setup-complete.guard';
import { ApplyPlannerScenarioModule } from './modules/planner-scenarios/apply-planner-scenario.module';
import { PlannerScenariosModule } from './modules/planner-scenarios/planner-scenarios.module';
import { ProjectPositionsModule } from './modules/project-positions/project-positions.module';
import { StaffingDeskModule } from './modules/staffing-desk/staffing-desk.module';
import { StaffingRequestsModule } from './modules/staffing-requests/staffing-requests.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { WorkloadModule } from './modules/workload/workload.module';
import { AppConfigModule } from './shared/config/app-config.module';
import { CorrelationIdMiddleware } from './shared/observability/correlation-id.middleware';
import { RequestLoggingMiddleware } from './shared/observability/request-logging.middleware';
import { JsmModule } from './shared/jsm/jsm.module';
import { LdapModule } from './shared/ldap/ldap.module';
import { LlmModule } from './shared/llm/llm.module';
import { ObservabilityModule } from './shared/observability/observability.module';
import { PrismaModule } from './shared/persistence/prisma.module';
import { PublicIdModule } from './infrastructure/public-id';

@Module({
  imports: [
    // F-2.2 — env-configurable throttler. Default 1000 req/60s/IP is a
    // 10x bump from the previous hard-coded 100; the previous default
    // tripped under 10 concurrent users behind a single corporate proxy
    // (bank-IT scale-up scenario). Override per env via THROTTLER_LIMIT
    // and THROTTLER_TTL_MS.
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLER_TTL_MS ?? '60000', 10),
        limit: parseInt(process.env.THROTTLER_LIMIT ?? '1000', 10),
      },
    ]),
    AppConfigModule,
    PrismaModule,
    PublicIdModule,
    LlmModule,
    JsmModule,
    LdapModule,
    ObservabilityModule,
    AdminModule,
    AdminFeatureFlagsModule,
    HealthModule,
    HelpCenterModule,
    UndoModule,
    DashboardModule,
    DmTeamDetailModule,
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
    ApplyPlannerScenarioModule,
    PlannerScenariosModule,
    ProjectPositionsModule,
    StaffingDeskModule,
    StaffingRequestsModule,
    LeaveRequestsModule,
    OvertimeModule,
    ReportsModule,
    SearchModule,
    SetupModule,
  ],
  providers: [
    // Order matters: setup-complete check first so a fresh install funnels
    // straight to /setup before any auth or rate-limit logic kicks in.
    { provide: APP_GUARD, useClass: RequireSetupCompleteGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Surfaces `Deprecation` / `Sunset` / `Link` headers + a structured warn
    // log on every call to a `@DeprecatedEndpoint(...)`-marked handler so
    // adoption progress is visible during the HD-1 staffing cutover.
    { provide: APP_INTERCEPTOR, useClass: DeprecatedEndpointInterceptor },
    // Writes an AuditLog row after a successful GET marked with `@AuditRead`.
    // See `docs/architecture/audit-vs-activity.md` — read-side reveals are
    // the one non-mutating action that still warrants forensic audit. (HD-0.7)
    { provide: APP_INTERCEPTOR, useClass: AuditReadInterceptor },
    // Replays cached responses for `@Idempotent`-marked endpoints when
    // the caller supplies a matching `Idempotency-Key` header. Concurrent
    // duplicates get 409; same key + different body also 409. (HD-0.4)
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CorrelationIdMiddleware, RequestPrincipalMiddleware, RequestLoggingMiddleware)
      .forRoutes('*');
  }
}
