// Sprint F-0.1 — frontend mirror of the backend PLATFORM_FLAGS registry.
//
// Source of truth: `src/shared/config/platform-flags.service.ts` `PLATFORM_FLAGS`.
// This file mirrors only the shape needed for FE gating: id → key + default.
// `scripts/check-flags.cjs` asserts the two stay in sync.
//
// In v1 the FE consults static defaults declared here. Per-tenant overrides
// (admin-set via `/admin/feature-flags` UI) light up in Sprint F-1.1 with a
// new `GET /api/feature-flags/me` endpoint that returns the resolved
// per-user flag map. Until then, callers see registry defaults.

export type FeatureFlagId =
  | 'outboxEnabled'
  | 'tenancyMultiTenantEnabled'
  | 'publicIdStrict'
  | 'idempotencyKeyEnforced'
  | 'staffingMakeAssignment'
  | 'staffingBulkAssignment'
  | 'staffingProposalSlate'
  | 'staffingDistributionStudio'
  | 'staffingDirectorApproval'
  | 'staffingWorkflowFullState'
  | 'staffingSlaSweep'
  | 'staffingProposalNudge'
  | 'staffingMatchingEngineV2'
  | 'projectDirectorApprovalGate'
  | 'projectRadiator'
  | 'projectRadiatorThresholds'
  | 'projectRisks'
  | 'projectChangeRequests'
  | 'projectVendors'
  | 'projectWorkstreams'
  | 'projectRetrospective'
  | 'projectMilestones'
  | 'projectBudgetApproval'
  | 'featureCases'
  | 'featureWorkEvidence'
  | 'featureExceptions'
  | 'featureTeams'
  | 'featureResourcePools'
  | 'timesheetBasic'
  | 'timesheetPeriodLock'
  | 'timesheetApproval'
  | 'featureLeaveRequests'
  | 'featureOvertime'
  | 'featurePublicHolidays'
  | 'pulseBasic'
  | 'pulseDeclineDetect'
  | 'pulseManagerTrend'
  | 'dashEmployee'
  | 'dashMergedManager'
  | 'dashMergedExec'
  | 'dashWorkloadOverview'
  | 'dashProjectManager'
  | 'dashResourceManager'
  | 'dashHr'
  | 'dashDeliveryManager'
  | 'dashDirector'
  | 'dashPortfolioRadiator'
  | 'dashPlannedVsActual'
  | 'reportsTimeAnalytics'
  | 'reportsUtilization'
  | 'reportsCapitalisation'
  | 'reportsBuilder'
  | 'reportsExportCentre'
  | 'adminWebhooks'
  | 'adminAccessPolicies'
  | 'adminBulkImport'
  | 'adminHris'
  | 'adminTenantSettingsCatalog'
  | 'adminPlatformSettings'
  | 'adminRolePermissionUI'
  | 'integrationsM365'
  | 'integrationsJira'
  | 'integrationsRadius'
  | 'integrationsOidc'
  | 'integrationsLdap'
  | 'integrationsJsm'
  | 'integrationsWebhookRegistry'
  | 'notificationsBell'
  | 'notificationsSse'
  | 'notificationsPreferences'
  | 'helpCenter'
  | 'onboardingTour'
  | 'cmdkPeopleSearch'
  | 'workflowDefinitions'
  | 'customFields'
  | 'entityLayouts'
  | 'metadataDictionaries'
  | 'rbacResponsibilityRuleReads'
  | 'authTwoFactor'
  | 'featureViewAs'
  | 'financialMultiCurrency'
  | 'financialFiscalCalendarEntity'
  | 'perfMaterialisedRollups'
  | 'kpiDrilldown'
  | 'actionItems'
  | 'pulseEnabled'
  | 'helpCenterMaster'
  | 'undoToast'
  | 'workspaceMe'
  | 'dsRefresh';

export interface FeatureFlagMirror {
  key: string;
  default: boolean;
}

export const FEATURE_FLAGS: Record<FeatureFlagId, FeatureFlagMirror> = {
  outboxEnabled: { key: 'flag.outboxEnabled', default: false },
  tenancyMultiTenantEnabled: { key: 'flag.tenancy.multiTenant.enabled', default: false },
  publicIdStrict: { key: 'flag.publicIdStrict', default: false },
  idempotencyKeyEnforced: { key: 'flag.idempotencyKey.enforced', default: false },
  staffingMakeAssignment: { key: 'flag.feature.staffing.makeAssignment.enabled', default: false },
  staffingBulkAssignment: { key: 'flag.feature.staffing.bulkAssignment.enabled', default: false },
  staffingProposalSlate: { key: 'flag.feature.staffing.proposalSlate.enabled', default: true },
  staffingDistributionStudio: { key: 'flag.feature.staffing.distributionStudio.enabled', default: false },
  staffingDirectorApproval: { key: 'flag.feature.staffing.directorApproval.enabled', default: false },
  staffingWorkflowFullState: { key: 'flag.feature.staffing.workflowFullState.enabled', default: true },
  staffingSlaSweep: { key: 'flag.feature.staffing.slaSweep.enabled', default: false },
  staffingProposalNudge: { key: 'flag.feature.staffing.proposalNudge.enabled', default: false },
  staffingMatchingEngineV2: { key: 'flag.feature.staffing.matchingEngineV2.enabled', default: false },
  projectDirectorApprovalGate: { key: 'flag.feature.project.directorApprovalGate.enabled', default: false },
  projectRadiator: { key: 'flag.feature.project.radiator.enabled', default: false },
  projectRadiatorThresholds: { key: 'flag.feature.project.radiatorThresholds.enabled', default: false },
  projectRisks: { key: 'flag.feature.project.risks.enabled', default: false },
  projectChangeRequests: { key: 'flag.feature.project.changeRequests.enabled', default: false },
  projectVendors: { key: 'flag.feature.project.vendors.enabled', default: false },
  projectWorkstreams: { key: 'flag.feature.project.workstreams.enabled', default: false },
  projectRetrospective: { key: 'flag.feature.project.retrospective.enabled', default: false },
  projectMilestones: { key: 'flag.feature.project.milestones.enabled', default: false },
  projectBudgetApproval: { key: 'flag.feature.project.budgetApproval.enabled', default: false },
  featureCases: { key: 'flag.feature.cases.enabled', default: false },
  featureWorkEvidence: { key: 'flag.feature.workEvidence.enabled', default: false },
  featureExceptions: { key: 'flag.feature.exceptions.enabled', default: false },
  featureTeams: { key: 'flag.feature.teams.enabled', default: false },
  featureResourcePools: { key: 'flag.feature.resourcePools.enabled', default: true },
  timesheetBasic: { key: 'flag.feature.timesheet.basic.enabled', default: true },
  timesheetPeriodLock: { key: 'flag.feature.timesheet.periodLock.enabled', default: true },
  timesheetApproval: { key: 'flag.feature.timesheet.approval.enabled', default: true },
  featureLeaveRequests: { key: 'flag.feature.leaveRequests.enabled', default: false },
  featureOvertime: { key: 'flag.feature.overtime.enabled', default: false },
  featurePublicHolidays: { key: 'flag.feature.publicHolidays.enabled', default: false },
  pulseBasic: { key: 'flag.feature.pulse.basic.enabled', default: true },
  pulseDeclineDetect: { key: 'flag.feature.pulse.declineDetect.enabled', default: false },
  pulseManagerTrend: { key: 'flag.feature.pulse.managerTrend.enabled', default: false },
  dashEmployee: { key: 'flag.feature.dashboard.employee.enabled', default: true },
  dashMergedManager: { key: 'flag.feature.dashboard.merged.manager.enabled', default: true },
  dashMergedExec: { key: 'flag.feature.dashboard.merged.exec.enabled', default: true },
  dashWorkloadOverview: { key: 'flag.feature.dashboard.workloadOverview.enabled', default: false },
  dashProjectManager: { key: 'flag.feature.dashboard.projectManager.enabled', default: false },
  dashResourceManager: { key: 'flag.feature.dashboard.resourceManager.enabled', default: false },
  dashHr: { key: 'flag.feature.dashboard.hr.enabled', default: false },
  dashDeliveryManager: { key: 'flag.feature.dashboard.deliveryManager.enabled', default: false },
  dashDirector: { key: 'flag.feature.dashboard.director.enabled', default: false },
  dashPortfolioRadiator: { key: 'flag.feature.dashboard.portfolioRadiator.enabled', default: false },
  dashPlannedVsActual: { key: 'flag.feature.dashboard.plannedVsActual.enabled', default: true },
  reportsTimeAnalytics: { key: 'flag.feature.reports.timeAnalytics.enabled', default: true },
  reportsUtilization: { key: 'flag.feature.reports.utilization.enabled', default: true },
  reportsCapitalisation: { key: 'flag.feature.reports.capitalisation.enabled', default: false },
  reportsBuilder: { key: 'flag.feature.reports.builder.enabled', default: false },
  reportsExportCentre: { key: 'flag.feature.reports.exportCentre.enabled', default: false },
  adminWebhooks: { key: 'flag.feature.admin.webhooks.enabled', default: false },
  adminAccessPolicies: { key: 'flag.feature.admin.accessPolicies.enabled', default: false },
  adminBulkImport: { key: 'flag.feature.admin.bulkImport.enabled', default: false },
  adminHris: { key: 'flag.feature.admin.hris.enabled', default: false },
  adminTenantSettingsCatalog: { key: 'flag.feature.admin.tenantSettingsCatalog.enabled', default: false },
  adminPlatformSettings: { key: 'flag.feature.admin.platformSettings.tenantOverride.enabled', default: false },
  adminRolePermissionUI: { key: 'flag.feature.admin.rolePermissionUI.enabled', default: false },
  integrationsM365: { key: 'flag.feature.integrations.m365.enabled', default: true },
  integrationsJira: { key: 'flag.feature.integrations.jira.enabled', default: true },
  integrationsRadius: { key: 'flag.feature.integrations.radius.enabled', default: false },
  integrationsOidc: { key: 'flag.feature.integrations.oidc.enabled', default: false },
  integrationsLdap: { key: 'flag.feature.integrations.ldap.enabled', default: false },
  integrationsJsm: { key: 'flag.feature.integrations.jsm.enabled', default: false },
  integrationsWebhookRegistry: { key: 'flag.feature.integrations.webhookRegistry.enabled', default: false },
  notificationsBell: { key: 'flag.feature.notifications.bell.enabled', default: true },
  notificationsSse: { key: 'flag.feature.notifications.sse.enabled', default: false },
  notificationsPreferences: { key: 'flag.feature.notifications.preferences.enabled', default: false },
  helpCenter: { key: 'flag.feature.helpCenter.enabled', default: false },
  onboardingTour: { key: 'flag.feature.onboardingTour.enabled', default: false },
  cmdkPeopleSearch: { key: 'flag.feature.cmdk.peopleSearch.enabled', default: false },
  workflowDefinitions: { key: 'flag.feature.workflowDefinitions.enabled', default: false },
  customFields: { key: 'flag.feature.customFields.enabled', default: false },
  entityLayouts: { key: 'flag.feature.entityLayouts.enabled', default: false },
  metadataDictionaries: { key: 'flag.feature.metadata.tenantDictionaries.enabled', default: false },
  rbacResponsibilityRuleReads: { key: 'flag.feature.rbac.responsibilityRule.reads.enabled', default: false },
  authTwoFactor: { key: 'flag.feature.auth.twoFactor.enabled', default: false },
  featureViewAs: { key: 'flag.feature.viewAs.enabled', default: true },
  financialMultiCurrency: { key: 'flag.feature.financial.multiCurrency.enabled', default: false },
  financialFiscalCalendarEntity: { key: 'flag.feature.financial.fiscalCalendar.entity.enabled', default: false },
  perfMaterialisedRollups: { key: 'flag.feature.perf.materialisedRollups.enabled', default: false },
  kpiDrilldown: { key: 'flag.feature.kpiDrilldown.enabled', default: true },
  actionItems: { key: 'flag.feature.actionItems.enabled', default: true },
  pulseEnabled: { key: 'flag.pulse.enabled', default: false },
  helpCenterMaster: { key: 'flag.helpCenter.enabled', default: false },
  undoToast: { key: 'flag.undo.toast.enabled', default: false },
  workspaceMe: { key: 'flag.workspaceMe.enabled', default: false },
  dsRefresh: { key: 'flag.dsRefresh.enabled', default: false },
};

// Build-time overrides for non-prod previews (e.g., the v2 staging container
// that hosts the DS redesign). Vite bakes `import.meta.env.VITE_*` at build,
// so this is set once when the FE image is built and cannot be flipped at
// runtime — kept narrow and matched to the backend `FORCE_ALL_FLAGS_ON`
// emergency lever in PlatformFlagsService.
//
//   VITE_FORCE_ALL_FLAGS_ON=true        → every flag returns true
//   VITE_FORCE_FLAGS_ON=workspaceMe,dsRefresh  → those flags return true
//
// Prod + regular staging builds leave both unset, so callers see registry
// defaults exactly as before.
const FE_FORCE_ALL = (import.meta.env.VITE_FORCE_ALL_FLAGS_ON as string | undefined) === 'true';
const FE_FORCE_KEYS = new Set<string>(
  ((import.meta.env.VITE_FORCE_FLAGS_ON as string | undefined) ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
);

/**
 * Returns the static default for a flag. v1: registry defaults only.
 * F-1.1 will replace this with a context-driven lookup against
 * `useFeatureFlags()` after `/api/feature-flags/me` ships.
 */
export function isFeatureEnabled(id: FeatureFlagId): boolean {
  if (FE_FORCE_ALL) return true;
  if (FE_FORCE_KEYS.has(id)) return true;
  return FEATURE_FLAGS[id].default;
}
