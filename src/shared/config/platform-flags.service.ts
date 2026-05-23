import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@src/shared/persistence/prisma.service';

const FLAG_CACHE_TTL_MS = 30_000;

interface CacheEntry {
  value: boolean;
  cachedAt: number;
}

export type FlagMaturity = 'scaffolded' | 'developing' | 'beta' | 'ga' | 'deprecated';

export interface PlatformFlagDefinition {
  /** PlatformSetting row key. Format: `flag.<id>` (legacy) or `flag.feature.<dotted.path>.enabled` (ULTIMATE pattern). */
  key: string;
  /** One-line description of what the flag controls. */
  description: string;
  /** Default value when the row is absent or DB lookup fails. */
  default: boolean;
  /** Lifecycle stage. Drives promotion gates and shadow-CI freeze rules. */
  maturityLevel: FlagMaturity;
  /** Loose ETA for GA promotion (e.g., 'v1.1', 'v1.2'). Optional but expected for non-GA. */
  expectedGaSprint?: string;
  /** Engineer or team responsible. Notified on shadow-CI failure. */
  owner: string;
  /** Other flags this flag requires to be ON. */
  dependsOn?: string[];
  /** High-level grouping for /admin/feature-flags UI. */
  category: string;
}

// HD-12 + Sprint F-0.1 — single source of truth for every feature flag.
// New flags go here. The codebase has one grep target for "what feature
// flags exist". The registry is data-only (no behavior); the runtime checks
// happen via `PlatformFlagsService.isEnabled(...)`.
//
// `default` is what `isEnabled` returns when the row is absent OR the lookup
// throws (DB unavailable in early boot, missing table, etc.) — every call
// site MUST be safe for the fallback value.
//
// v1 launch defaults (per /home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md
// Decisions 9/10/11):
//   - 20-100 person IT block, 4-week launch
//   - Slate-only canonical staffing flow (proposalSlate ON, makeAssignment OFF)
//   - Dashboard merge 7 → 3 (mergedManager + mergedExec ON, per-role OFF)
export const PLATFORM_FLAGS = {
  // -----------------------------------------------------------------------
  // FOUNDATION
  // -----------------------------------------------------------------------
  outboxEnabled: {
    key: 'flag.outboxEnabled',
    description:
      'Master switch for the OutboxEvent dual-write seam. When true, NotificationEventTranslatorService writes outbox rows + the publisher dispatches; when false, the translator runs synchronously. F-6.5 / D-142 flipped to ON after verifying ≥3 mutation flows (assignmentCreated, projectActivated, caseCreated) call the translator with proper aggregate scope.',
    default: true,
    maturityLevel: 'ga',
    expectedGaSprint: 'v1.1',
    owner: 'platform-eng',
    category: 'foundation',
  },
  tenancyMultiTenantEnabled: {
    key: 'flag.tenancy.multiTenant.enabled',
    description:
      'Master switch for multi-tenant SaaS posture. OFF for single-tenant per-bank install (J1 hold). ON activates HARDEN F6 RLS + tenantId filtering.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v2.0',
    owner: 'platform-eng',
    category: 'foundation',
  },
  publicIdStrict: {
    key: 'flag.publicIdStrict',
    description:
      'When ON, controllers reject UUID inputs and require publicId. DM-2.5 rollout gate.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.4',
    owner: 'data-model-eng',
    category: 'foundation',
  },
  idempotencyKeyEnforced: {
    key: 'flag.idempotencyKey.enforced',
    description: 'When ON, mutating endpoints require an Idempotency-Key header.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'platform-eng',
    category: 'foundation',
  },

  // -----------------------------------------------------------------------
  // STAFFING (Decision-10: slate-only canonical flow)
  // -----------------------------------------------------------------------
  staffingMakeAssignment: {
    key: 'flag.feature.staffing.makeAssignment.enabled',
    description:
      'Direct PM→RM→Person assignment path bypassing StaffingRequest. OFF in v1 per Decision-10 (single canonical flow). Kept in code for emergency direct-assign cases.',
    default: false,
    maturityLevel: 'ga',
    owner: 'staffing-eng',
    category: 'staffing',
  },
  staffingBulkAssignment: {
    key: 'flag.feature.staffing.bulkAssignment.enabled',
    description:
      'Bulk-assign creation page. OFF in main sidebar; route remains accessible to RM/Admin via direct URL.',
    default: false,
    maturityLevel: 'ga',
    owner: 'staffing-eng',
    category: 'staffing',
  },
  staffingProposalSlate: {
    key: 'flag.feature.staffing.proposalSlate.enabled',
    description:
      'Multi-candidate proposal slate flow (Request → Slate → Pick → Assignment). v1 canonical per Decision-10.',
    default: true,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'staffing-eng',
    category: 'staffing',
  },
  staffingDistributionStudio: {
    key: 'flag.feature.staffing.distributionStudio.enabled',
    description:
      'Workforce Planner Distribution Studio (heatmap + scenarios + apply-plan).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'staffing-eng',
    category: 'staffing',
  },
  staffingDirectorApproval: {
    key: 'flag.feature.staffing.directorApproval.enabled',
    description: 'Director-level approval gate on high-allocation assignments.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'staffing-eng',
    category: 'staffing',
  },
  staffingWorkflowFullState: {
    key: 'flag.feature.staffing.workflowFullState.enabled',
    description:
      'Full 9-state assignment workflow (DRAFT/PROPOSED/IN_REVIEW/REJECTED/BOOKED/ONBOARDING/ASSIGNED/ON_HOLD/COMPLETED/CANCELLED). ON in v1 per Decision-10 (slate ON requires it).',
    default: true,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'staffing-eng',
    category: 'staffing',
    dependsOn: ['flag.feature.staffing.proposalSlate.enabled'],
  },
  staffingSlaSweep: {
    key: 'flag.feature.staffing.slaSweep.enabled',
    description:
      'AssignmentSlaSweepService background sweep + pre-breach 50%/75% warnings (HD-10).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'staffing-eng',
    category: 'staffing',
  },
  staffingProposalNudge: {
    key: 'flag.feature.staffing.proposalNudge.enabled',
    description: 'Auto-nudge stale staffing proposals.',
    default: true,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'staffing-eng',
    category: 'staffing',
  },
  staffingMatchingEngineV2: {
    key: 'flag.feature.staffing.matchingEngineV2.enabled',
    description:
      'Weighted skill-match engine with proficiency-band scoring (HARDEN-WIRING S-10).',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.4',
    owner: 'staffing-eng',
    category: 'staffing',
  },

  // -----------------------------------------------------------------------
  // PROJECT
  // -----------------------------------------------------------------------
  projectDirectorApprovalGate: {
    key: 'flag.feature.project.directorApprovalGate.enabled',
    description: 'Director approval required to activate a project.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'projects-eng',
    category: 'project',
  },
  projectRadiator: {
    key: 'flag.feature.project.radiator.enabled',
    description:
      '16-axis PMBOK Project Radiator + portfolio rollup. OFF in v1 (cold-start fix needed; D-55).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.3',
    owner: 'projects-eng',
    category: 'project',
  },
  projectRadiatorThresholds: {
    key: 'flag.feature.project.radiatorThresholds.enabled',
    description: 'Admin-tunable per-axis radiator thresholds.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.3',
    owner: 'projects-eng',
    category: 'project',
    dependsOn: ['flag.feature.project.radiator.enabled'],
  },
  projectRisks: {
    key: 'flag.feature.project.risks.enabled',
    description: 'Project Risk register tab.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'projects-eng',
    category: 'project',
  },
  projectChangeRequests: {
    key: 'flag.feature.project.changeRequests.enabled',
    description: 'Project Change Request tab.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'projects-eng',
    category: 'project',
  },
  projectVendors: {
    key: 'flag.feature.project.vendors.enabled',
    description: 'Project Vendor engagement tab.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'projects-eng',
    category: 'project',
  },
  projectWorkstreams: {
    key: 'flag.feature.project.workstreams.enabled',
    description: 'Project Workstream sub-structure.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'projects-eng',
    category: 'project',
  },
  projectRetrospective: {
    key: 'flag.feature.project.retrospective.enabled',
    description: 'Project Retrospective capture.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'projects-eng',
    category: 'project',
  },
  projectMilestones: {
    key: 'flag.feature.project.milestones.enabled',
    description:
      'Project Milestones tab. OFF in v1, ON in v1.1 (low-risk addition once dashboard merge stabilises).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.1',
    owner: 'projects-eng',
    category: 'project',
  },
  projectBudgetApproval: {
    key: 'flag.feature.project.budgetApproval.enabled',
    description: 'Project Budget change-request approval workflow.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'projects-eng',
    category: 'project',
  },

  // -----------------------------------------------------------------------
  // CASES / WORK EVIDENCE / EXCEPTIONS
  // -----------------------------------------------------------------------
  featureCases: {
    key: 'flag.feature.cases.enabled',
    description: 'Case management module.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'governance-eng',
    category: 'governance',
  },
  featureWorkEvidence: {
    key: 'flag.feature.workEvidence.enabled',
    description: 'Work Evidence module.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'governance-eng',
    category: 'governance',
  },
  featureExceptions: {
    key: 'flag.feature.exceptions.enabled',
    description: 'Exceptions queue.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'governance-eng',
    category: 'governance',
  },

  // -----------------------------------------------------------------------
  // TEAMS / POOLS
  // -----------------------------------------------------------------------
  featureTeams: {
    key: 'flag.feature.teams.enabled',
    description: 'Team module (vs ResourcePool grouping). OFF in v1.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'workforce-eng',
    category: 'workforce',
  },
  featureResourcePools: {
    key: 'flag.feature.resourcePools.enabled',
    description: 'Resource Pool grouping (canonical workforce grouping).',
    default: true,
    maturityLevel: 'ga',
    owner: 'workforce-eng',
    category: 'workforce',
  },

  // -----------------------------------------------------------------------
  // TIME
  // -----------------------------------------------------------------------
  timesheetBasic: {
    key: 'flag.feature.timesheet.basic.enabled',
    description: 'Timesheet weekly submission + entry.',
    default: true,
    maturityLevel: 'ga',
    owner: 'time-eng',
    category: 'time',
  },
  timesheetPeriodLock: {
    key: 'flag.feature.timesheet.periodLock.enabled',
    description: 'Admin-set period locks blocking edits to closed weeks.',
    default: true,
    maturityLevel: 'ga',
    owner: 'time-eng',
    category: 'time',
  },
  timesheetApproval: {
    key: 'flag.feature.timesheet.approval.enabled',
    description: 'Manager timesheet approval workflow.',
    default: true,
    maturityLevel: 'ga',
    owner: 'time-eng',
    category: 'time',
  },
  featureLeaveRequests: {
    key: 'flag.feature.leaveRequests.enabled',
    description: 'Leave request submission + approval.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'time-eng',
    category: 'time',
  },
  featureOvertime: {
    key: 'flag.feature.overtime.enabled',
    description: 'Overtime policy + exception tracking.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'time-eng',
    category: 'time',
  },
  featurePublicHolidays: {
    key: 'flag.feature.publicHolidays.enabled',
    description: 'Per-region public-holiday calendar.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'time-eng',
    category: 'time',
  },

  // -----------------------------------------------------------------------
  // PULSE
  // -----------------------------------------------------------------------
  pulseBasic: {
    key: 'flag.feature.pulse.basic.enabled',
    description: 'Anonymous mood capture (employee Pulse submission).',
    default: true,
    maturityLevel: 'ga',
    owner: 'pulse-eng',
    category: 'pulse',
  },
  pulseDeclineDetect: {
    key: 'flag.feature.pulse.declineDetect.enabled',
    description: 'Mood decline detection + manager alerts.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'pulse-eng',
    category: 'pulse',
  },
  pulseManagerTrend: {
    key: 'flag.feature.pulse.managerTrend.enabled',
    description: 'Per-team Pulse trend visualisation for managers.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.3',
    owner: 'pulse-eng',
    category: 'pulse',
  },

  // -----------------------------------------------------------------------
  // DASHBOARDS (Decision-11: 7 role dashboards merged into 3)
  // -----------------------------------------------------------------------
  dashEmployee: {
    key: 'flag.feature.dashboard.employee.enabled',
    description: 'Per-employee self-dashboard (kept as-is in v1).',
    default: true,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashMergedManager: {
    key: 'flag.feature.dashboard.merged.manager.enabled',
    description:
      'NEW merged Manager Dashboard. Replaces per-role PM/RM/DM dashboards via ?scope= URL param. Per Decision-11.',
    default: true,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashMergedExec: {
    key: 'flag.feature.dashboard.merged.exec.enabled',
    description:
      'NEW merged Exec Dashboard. Replaces Workload Overview + Director + HR dashboards. Per Decision-11.',
    default: true,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashWorkloadOverview: {
    key: 'flag.feature.dashboard.workloadOverview.enabled',
    description:
      'Standalone Workload Overview. OFF per Decision-11 (merged into /dashboard/exec).',
    default: false,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashProjectManager: {
    key: 'flag.feature.dashboard.projectManager.enabled',
    description:
      'Standalone PM Dashboard. OFF per Decision-11 (merged into /dashboard/manager?scope=portfolio).',
    default: false,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashResourceManager: {
    key: 'flag.feature.dashboard.resourceManager.enabled',
    description:
      'Standalone RM Dashboard. OFF per Decision-11 (merged into /dashboard/manager?scope=pool).',
    default: false,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashHr: {
    key: 'flag.feature.dashboard.hr.enabled',
    description:
      'Standalone HR Dashboard. OFF per Decision-11 (merged into /dashboard/exec).',
    default: false,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashDeliveryManager: {
    key: 'flag.feature.dashboard.deliveryManager.enabled',
    description:
      'Standalone DM Dashboard. OFF per Decision-11 (merged into /dashboard/manager?scope=squad).',
    default: false,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashDirector: {
    key: 'flag.feature.dashboard.director.enabled',
    description:
      'Standalone Director Dashboard. OFF per Decision-11 (merged into /dashboard/exec).',
    default: false,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashPortfolioRadiator: {
    key: 'flag.feature.dashboard.portfolioRadiator.enabled',
    description: 'Portfolio radiator page. OFF in v1 (depends on radiator flag).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.3',
    owner: 'dashboards-eng',
    category: 'dashboard',
    dependsOn: ['flag.feature.project.radiator.enabled'],
  },
  dashPlannedVsActual: {
    key: 'flag.feature.dashboard.plannedVsActual.enabled',
    description: 'Planned-vs-Actual variance dashboard.',
    default: true,
    maturityLevel: 'ga',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashApprovalQueue: {
    key: 'flag.feature.dashboard.approvalQueue.enabled',
    description:
      'Pending-Approvals KPI tile + embedded approval queue strip on Manager Dashboard (PM/RM/DM scopes). Shipped Sprint F-3.',
    default: true,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },
  dashTimeToFill: {
    key: 'flag.feature.dashboard.timeToFill.enabled',
    description:
      'Time-to-fill sparkline + SLA breach count tile on Exec/Director Dashboard. Shipped Sprint F-3.',
    default: true,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'dashboards-eng',
    category: 'dashboard',
  },

  // -----------------------------------------------------------------------
  // REPORTS
  // -----------------------------------------------------------------------
  reportsTimeAnalytics: {
    key: 'flag.feature.reports.timeAnalytics.enabled',
    description: 'Time analytics report.',
    default: true,
    maturityLevel: 'ga',
    owner: 'reports-eng',
    category: 'reports',
  },
  reportsUtilization: {
    key: 'flag.feature.reports.utilization.enabled',
    description: 'Utilization report.',
    default: true,
    maturityLevel: 'ga',
    owner: 'reports-eng',
    category: 'reports',
  },
  reportsCapitalisation: {
    key: 'flag.feature.reports.capitalisation.enabled',
    description: 'Capitalisation / capex/opex split report. OFF until fiscal calendar lands.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'reports-eng',
    category: 'reports',
  },
  reportsBuilder: {
    key: 'flag.feature.reports.builder.enabled',
    description: 'Custom report builder.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.4',
    owner: 'reports-eng',
    category: 'reports',
  },
  reportsExportCentre: {
    key: 'flag.feature.reports.exportCentre.enabled',
    description: 'Export Centre (CSV/XLSX/JSON) for BI integrations.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.4',
    owner: 'reports-eng',
    category: 'reports',
  },

  // -----------------------------------------------------------------------
  // ADMIN
  // -----------------------------------------------------------------------
  adminWebhooks: {
    key: 'flag.feature.admin.webhooks.enabled',
    description: 'Webhook config admin (currently in-memory; not production-grade).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.3',
    owner: 'admin-eng',
    category: 'admin',
  },
  adminAccessPolicies: {
    key: 'flag.feature.admin.accessPolicies.enabled',
    description: 'ABAC access policy admin (not enabled).',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.4',
    owner: 'admin-eng',
    category: 'admin',
  },
  adminBulkImport: {
    key: 'flag.feature.admin.bulkImport.enabled',
    description: 'Bulk-import people via CSV/XLSX.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'admin-eng',
    category: 'admin',
  },
  adminHris: {
    key: 'flag.feature.admin.hris.enabled',
    description: 'HRIS adapter (M365 covers v1; full HRIS deferred).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.3',
    owner: 'admin-eng',
    category: 'admin',
  },
  adminTenantSettingsCatalog: {
    key: 'flag.feature.admin.tenantSettingsCatalog.enabled',
    description:
      'Tenant Settings Catalog admin page (renders 60-flag registry). Lights up in F-1.1.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.0',
    owner: 'admin-eng',
    category: 'admin',
  },
  adminPlatformSettings: {
    key: 'flag.feature.admin.platformSettings.tenantOverride.enabled',
    description: 'Per-tenant override editing for PlatformSetting values.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.1',
    owner: 'admin-eng',
    category: 'admin',
  },
  adminRolePermissionUI: {
    key: 'flag.feature.admin.rolePermissionUI.enabled',
    description:
      'Tenant role redefinition UI (D-159). Ships behind flag for soak; promote post 30-day staging.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.1',
    owner: 'rbac-eng',
    category: 'admin',
  },

  // -----------------------------------------------------------------------
  // INTEGRATIONS
  // -----------------------------------------------------------------------
  integrationsM365: {
    key: 'flag.feature.integrations.m365.enabled',
    description: 'M365 directory sync.',
    default: true,
    maturityLevel: 'ga',
    owner: 'integrations-eng',
    category: 'integrations',
  },
  integrationsJira: {
    key: 'flag.feature.integrations.jira.enabled',
    description: 'Jira project sync (PPM source).',
    default: true,
    maturityLevel: 'ga',
    owner: 'integrations-eng',
    category: 'integrations',
  },
  integrationsRadius: {
    key: 'flag.feature.integrations.radius.enabled',
    description: 'RADIUS directory adapter.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.4',
    owner: 'integrations-eng',
    category: 'integrations',
  },
  integrationsOidc: {
    key: 'flag.feature.integrations.oidc.enabled',
    description: 'OIDC SSO handler (D-155). Bank-IT scale-up flag.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.2',
    owner: 'integrations-eng',
    category: 'integrations',
  },
  integrationsLdap: {
    key: 'flag.feature.integrations.ldap.enabled',
    description: 'LDAP/AD adapter. Bank-IT scale-up flag.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.2',
    owner: 'integrations-eng',
    category: 'integrations',
  },
  integrationsJsm: {
    key: 'flag.feature.integrations.jsm.enabled',
    description: 'Jira Service Management connector (Cloud + DC).',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.2',
    owner: 'integrations-eng',
    category: 'integrations',
  },
  integrationsWebhookRegistry: {
    key: 'flag.feature.integrations.webhookRegistry.enabled',
    description: 'Webhook event-type registry + schema docs.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.4',
    owner: 'integrations-eng',
    category: 'integrations',
  },

  // -----------------------------------------------------------------------
  // NOTIFICATIONS
  // -----------------------------------------------------------------------
  notificationsBell: {
    key: 'flag.feature.notifications.bell.enabled',
    description: 'In-app notification bell (polling-based in v1).',
    default: true,
    maturityLevel: 'ga',
    owner: 'notifications-eng',
    category: 'notifications',
  },
  notificationsSse: {
    key: 'flag.feature.notifications.sse.enabled',
    description:
      'Server-Sent Events stream for real-time bell updates. OFF in v1 (D-87 503 — currently broken).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'notifications-eng',
    category: 'notifications',
  },
  notificationsPreferences: {
    key: 'flag.feature.notifications.preferences.enabled',
    description: 'Per-user notification preferences (PersonNotificationPreference UI).',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.1',
    owner: 'notifications-eng',
    category: 'notifications',
  },

  // -----------------------------------------------------------------------
  // HELP / DOC OPS
  // -----------------------------------------------------------------------
  helpCenter: {
    key: 'flag.feature.helpCenter.enabled',
    description: 'Help Center MVP (HD-9 closed; flag-gated for bank-branded content review).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.1',
    owner: 'docops-eng',
    category: 'help',
  },
  onboardingTour: {
    key: 'flag.feature.onboardingTour.enabled',
    description: 'First-login onboarding tour.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.1',
    owner: 'docops-eng',
    category: 'help',
  },
  cmdkPeopleSearch: {
    key: 'flag.feature.cmdk.peopleSearch.enabled',
    description: 'Cmd+K command palette people search.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.1',
    owner: 'frontend-eng',
    category: 'help',
  },

  // -----------------------------------------------------------------------
  // CUSTOMIZATION SCAFFOLDS (built but never consumed)
  // -----------------------------------------------------------------------
  workflowDefinitions: {
    key: 'flag.feature.workflowDefinitions.enabled',
    description: 'Tenant-defined workflow definitions (scaffolded but unused).',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.4',
    owner: 'customization-eng',
    category: 'customization',
  },
  customFields: {
    key: 'flag.feature.customFields.enabled',
    description: 'Tenant-defined custom fields.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.4',
    owner: 'customization-eng',
    category: 'customization',
  },
  entityLayouts: {
    key: 'flag.feature.entityLayouts.enabled',
    description: 'Tenant-defined entity-page layouts.',
    default: false,
    maturityLevel: 'scaffolded',
    expectedGaSprint: 'v1.4',
    owner: 'customization-eng',
    category: 'customization',
  },
  metadataDictionaries: {
    key: 'flag.feature.metadata.tenantDictionaries.enabled',
    description: 'Tenant-customizable MetadataDictionary lookups (T-09 D-107 in Cat-2).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'customization-eng',
    category: 'customization',
  },
  rbacResponsibilityRuleReads: {
    key: 'flag.feature.rbac.responsibilityRule.reads.enabled',
    description:
      'Extends ResponsibilityRule to read endpoints (D-158). High-risk ACL surface — 30-day soak before promotion.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.1',
    owner: 'rbac-eng',
    category: 'customization',
  },

  // -----------------------------------------------------------------------
  // AUTH
  // -----------------------------------------------------------------------
  authTwoFactor: {
    key: 'flag.feature.auth.twoFactor.enabled',
    description: '2FA enrollment + challenge.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'auth-eng',
    category: 'auth',
  },
  featureViewAs: {
    key: 'flag.feature.viewAs.enabled',
    description: 'Admin "View as" impersonation (CLAUDE.md §8.13).',
    default: true,
    maturityLevel: 'ga',
    owner: 'auth-eng',
    category: 'auth',
  },

  // -----------------------------------------------------------------------
  // FINANCIAL
  // -----------------------------------------------------------------------
  financialMultiCurrency: {
    key: 'flag.feature.financial.multiCurrency.enabled',
    description:
      'FxRate model + multi-currency consolidation. Code ships in v1; consolidation execution gated.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.1',
    owner: 'financial-eng',
    category: 'financial',
  },
  financialFiscalCalendarEntity: {
    key: 'flag.feature.financial.fiscalCalendar.entity.enabled',
    description:
      'Full FiscalCalendar + FiscalPeriod entities (D-160b). v1 uses D-160a quick-fix; entity rewrite gated.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'financial-eng',
    category: 'financial',
  },

  // -----------------------------------------------------------------------
  // PERF
  // -----------------------------------------------------------------------
  perfMaterialisedRollups: {
    key: 'flag.feature.perf.materialisedRollups.enabled',
    description: 'Materialized rollup tables for dashboards (T-13 D-147). OFF until P95 SLO breach.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.3',
    owner: 'platform-eng',
    category: 'perf',
  },

  // -----------------------------------------------------------------------
  // MISC UI
  // -----------------------------------------------------------------------
  kpiDrilldown: {
    key: 'flag.feature.kpiDrilldown.enabled',
    description: 'KPI tile click-to-drilldown navigation (UX Law 9).',
    default: true,
    maturityLevel: 'ga',
    owner: 'frontend-eng',
    category: 'ui',
  },
  actionItems: {
    key: 'flag.feature.actionItems.enabled',
    description: 'Action Items widget on dashboards.',
    default: true,
    maturityLevel: 'ga',
    owner: 'frontend-eng',
    category: 'ui',
  },
  pulseEnabled: {
    key: 'flag.pulse.enabled',
    description: 'Master Pulse module switch (mood capture). Off-by-default per Decision-7.',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.2',
    owner: 'pulse-eng',
    category: 'pulse',
  },
  helpCenterMaster: {
    key: 'flag.helpCenter.enabled',
    description: 'Master Help Center switch (alternate to flag.feature.helpCenter.enabled).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.1',
    owner: 'docops-eng',
    category: 'help',
  },
  undoToast: {
    key: 'flag.undo.toast.enabled',
    description: 'FE Undo toast on destructive actions (HD-8 chunk 8.4b).',
    default: false,
    maturityLevel: 'beta',
    expectedGaSprint: 'v1.1',
    owner: 'frontend-eng',
    category: 'ui',
  },
  workspaceMe: {
    key: 'flag.workspaceMe.enabled',
    description:
      'Master switch for the /me Employee Workspace shell (Overview/Time/Leave/Projects/Inbox/Settings tabs). OFF keeps the existing /my-time, /leave, /notifications, /settings/account, /timesheets routes as the canonical surfaces; ON activates the unified /me shell that hosts them. Lean-simplification employee-workspace amendment.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.2',
    owner: 'frontend-eng',
    category: 'ui',
  },
  dsRefresh: {
    key: 'flag.dsRefresh.enabled',
    description:
      'DS visual refresh (lifecycle Timeline colors, Calendar/BalanceMeter primitives, page chrome refresh per lean-simplification amendments). Additive primitives stay shipped; this flag gates the consumer-visible adoption sites until staging review signs off.',
    default: false,
    maturityLevel: 'developing',
    expectedGaSprint: 'v1.2',
    owner: 'frontend-eng',
    category: 'ui',
  },
} as const satisfies Record<string, PlatformFlagDefinition>;

export type PlatformFlagId = keyof typeof PLATFORM_FLAGS;

@Injectable()
export class PlatformFlagsService {
  private readonly logger = new Logger(PlatformFlagsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  public constructor(private readonly prisma?: PrismaService) {}

  public async isEnabled(flagId: PlatformFlagId): Promise<boolean> {
    const flag = PLATFORM_FLAGS[flagId];
    return this.isEnabledByKey(flag.key, flag.default);
  }

  public async isEnabledByKey(key: string, fallback: boolean): Promise<boolean> {
    // F-4 / Shadow CI seam — force every flag ON when the nightly verify
    // suite runs, so flag-gated code paths still get exercised. Default OFF
    // in normal CI / dev / prod so behavior is unchanged.
    if (process.env.FORCE_ALL_FLAGS_ON === '1' || process.env.FORCE_ALL_FLAGS_ON === 'true') {
      return true;
    }
    if (!this.prisma) return fallback;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && now - hit.cachedAt < FLAG_CACHE_TTL_MS) return hit.value;

    let value = fallback;
    try {
      const row = await this.prisma.platformSetting.findUnique({ where: { key } });
      const raw = row?.value;
      if (typeof raw === 'boolean') value = raw;
      else if (typeof raw === 'string') value = raw === 'true';
      else value = fallback;
    } catch (error) {
      this.logger.debug(
        `PlatformFlag lookup for ${key} failed; using fallback ${fallback}. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      value = fallback;
    }

    this.cache.set(key, { value, cachedAt: now });
    return value;
  }

  /** Test/admin escape hatch: clear the cache so the next read hits the DB. */
  public invalidate(): void {
    this.cache.clear();
  }

  /**
   * Returns the full flag registry for /admin/feature-flags UI rendering.
   * Each entry is the registry definition + the resolved current value.
   */
  public async listAll(): Promise<
    Array<PlatformFlagDefinition & { id: PlatformFlagId; currentValue: boolean }>
  > {
    const ids = Object.keys(PLATFORM_FLAGS) as PlatformFlagId[];
    const rows = await Promise.all(
      ids.map(async (id) => {
        const def = PLATFORM_FLAGS[id];
        const currentValue = await this.isEnabledByKey(def.key, def.default);
        return { ...def, id, currentValue };
      }),
    );
    return rows;
  }
}
