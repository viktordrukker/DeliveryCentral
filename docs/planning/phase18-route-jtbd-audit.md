# Phase 18 — Route-to-JTBD Audit Table

**Created:** 2026-04-14
**Last refreshed:** 2026-06-06 (W4-10 — V2 route catalogue refresh)
**Source:** `frontend/src/app/route-manifest.ts` + `docs/testing/EXHAUSTIVE_JTBD_LIST.md`

Routes flagged `(v2-hidden)` are routable by URL but excluded from the v2
sidebar (`obsoleteInV2: true` or `navVisible: false`). Routes flagged
`(v2-flagship)` are surfaced as canvas sidebar items under `dsRefresh`.

## Route Audit

| Route | Title | Primary Persona | Primary JTBD | Entry Trigger | Expected Next Action | Page File | Target Grammar |
|-------|-------|-----------------|-------------|---------------|---------------------|-----------|---------------|
| `/` | Workload Overview | admin | Scan portfolio health, act on issues | Auto-redirect by role | Drill into unstaffed/mismatch project | `DashboardPage.tsx` | Decision Dashboard |
| `/dashboard/planned-vs-actual` | Planned vs Actual | PM, DM | Reconcile evidence vs assignments | Nav from workload dashboard | Investigate mismatched project | `PlannedVsActualPage.tsx` | Decision Dashboard |
| `/dashboard/employee` | Employee Dashboard | employee | See my assignments, workload, pulse | Login redirect | View assignment detail, submit pulse | `EmployeeDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/manager` | Manager Dashboard | PM, RM, DM | "What does my team need?" | Login redirect | Drill into team gap, approve | `ManagerDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/exec` | Exec Dashboard | Director, HR | "How is the org doing?" | Login redirect | Drill into unit, project, escalate | `ExecDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/project-manager` | PM Dashboard | PM | Identify staffing gaps and anomalies | Login redirect | Create staffing request, review project | `ProjectManagerDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/resource-manager` | RM Dashboard | RM | Balance capacity across teams | Login redirect | Reassign, approve assignment, view workload | `ResourceManagerDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/hr` | HR Dashboard | HR | Monitor org health and data quality | Login redirect | Investigate risk employee, fix data gap | `HrDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/delivery-manager` | Delivery Dashboard | DM | Track delivery health and evidence coverage | Login redirect | Escalate portfolio risk, review staffing gap | `DeliveryManagerDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/director` | Director Dashboard | Director | Executive scan of org health | Login redirect | Drill into unit, project, or staffing issue | `DirectorDashboardPage.tsx` | Decision Dashboard |
| `/dashboards/portfolio-radiator` | Portfolio Radiator | DM, Director | Portfolio-wide 16-axis radiator | Sidebar nav | Drill into red axis on a project | `PortfolioRadiatorPage.tsx` | Decision Dashboard |
| `/me` | Home (v2-flagship) | all | Unified self-service workspace (Overview / Time / Leave / Projects / Inbox / Settings) | Sidebar nav (v2) | Switch tab via `?tab=...` | `MyWorkspacePage.tsx` | Decision Dashboard |
| `/me/overview` ... `/me/cases` | Workspace tab aliases | all | Deep-link into a specific tab | Direct URL | Redirects to `/me?tab=...` | router redirect | — |
| `/people` | People (v2-flagship) | HR, RM | Find and manage people records | Sidebar nav | View person detail, create employee | `PeoplePage.tsx` | List-Detail Workflow |
| `/people/:id` | Person Detail | HR, RM | Understand person operationally | Click from people list | Edit profile, manage lifecycle, view skills | `EmployeeDetailsPlaceholderPage.tsx` | Detail Surface |
| `/people/new` | Create Person | HR | Onboard new employee | Button from people list | Fill form, submit | `EmployeeLifecycleAdminPage.tsx` | Create/Edit Form |
| `/people/bench` | Bench (v2-flagship) | RM, PM, DM | Find people with no active assignment | Sidebar nav | Suggest fills, propose | `PeopleBenchPage.tsx` | List-Detail Workflow |
| `/org` | Org Chart (v2-hidden) | all | View organization structure | Direct URL | Drill into department | `OrgPage.tsx` | Structural Overview |
| `/org/managers/:id/scope` | Manager Scope | HR, Director | See reporting scope of a manager | Click from org chart | Review reports, reassign | `ManagerScopePage.tsx` | Detail Surface |
| `/teams` | Teams (v2-hidden) | all | View operational delivery teams | Direct URL | View team dashboard | `TeamsPage.tsx` | List-Detail Workflow |
| `/teams/:id/dashboard` | Team Dashboard | RM, DM | Assess team staffing and spread | Click from teams list | Reassign, review allocation | `TeamDashboardPage.tsx` | Decision Dashboard |
| `/projects` | Projects (v2-flagship) | PM, DM | Browse and manage project registry | Sidebar nav | View project detail, create project | `ProjectsPage.tsx` | List-Detail Workflow |
| `/projects/new` | Create Project | PM, DM | Register a new project | Button from projects list | Fill form, submit | `CreateProjectPage.tsx` | Create/Edit Form |
| `/projects/:id` | Project Detail | PM | Understand project state and act | Click from projects list | Activate, close, staff, review budget | `ProjectDetailsPlaceholderPage.tsx` | Detail Surface |
| `/projects/:id/dashboard` | Project Dashboard | PM, DM | Operational cockpit for one project | Link from project detail | Review evidence, allocation, anomalies | `ProjectDashboardPage.tsx` | Decision Dashboard |
| `/assignments` | Assignments (v2-hidden) | PM, RM | **Redirect → `/staffing-desk`** (LEAN-P2 exit-gate) | — | — | — | — |
| `/assignments/new` | Create Assignment (v2-hidden) | PM, RM | **Redirect → `/staffing-requests/new`** | — | — | — | — |
| `/assignments/bulk` | Bulk Assign (v2-hidden) | PM, RM | **Redirect → `/staffing-desk`** | — | — | — | — |
| `/assignments/queue` | Assignment Queue (v2-hidden) | PM, RM | **Redirect → `/staffing-desk`** | — | — | — | — |
| `/assignments/:id` | Assignment Detail | PM, RM | Review assignment state and history | Direct URL | Approve, reject, end, extend | `AssignmentDetailsPlaceholderPage.tsx` | Detail Surface |
| `/staffing-requests` | Staffing Requests (v2-hidden) | PM, RM | **Redirect → `/staffing-desk`** | — | — | — | — |
| `/staffing-requests/new` | Create Staffing Request | PM, RM, DM | Capture staffing demand | Button on staffing desk | Fill form, submit | `CreateStaffingRequestPage.tsx` | Create/Edit Form |
| `/staffing-requests/:id` | Request Detail | RM | Evaluate candidates and fulfill | Click from desk | Propose candidate, fulfill, cancel | `StaffingRequestDetailPage.tsx` | Detail Surface |
| `/staffing-board` | Staffing Board (v2-hidden) | RM, DM | **Redirect → `/staffing-desk?view=board`** | — | — | — | — |
| `/staffing-desk` | Staffing Desk (v2-flagship) | RM, PM, DM | Unified staffing console (`?view=board` board + `?view=planner` Distribution Studio) | Sidebar nav | Move position, propose fill, run planner | `StaffingDeskPage.tsx` | Operational Queue |
| `/staffing-desk/positions/new` | New Position | RM, DM | Create a project position | Button on staffing desk | Fill form, submit | `CreatePositionPage.tsx` | Create/Edit Form |
| `/approvals` | Approvals (v2-flagship) | RM, PM, DM, HR, Director, admin | Unified approval queue (positions, budgets, activations, leave, cases, skills) | Sidebar nav | Approve, reject, comment | `ApprovalsPage.tsx` | Operational Queue |
| `/approvals/queue` | Approvals (legacy URL) | — | **Redirect → `/approvals`** | — | — | — | — |
| `/resource-pools` | Resource Pools (v2-hidden) | RM | Manage pools of available people | Direct URL | View pool detail, create pool | `ResourcePoolsPage.tsx` | List-Detail Workflow |
| `/resource-pools/:id` | Pool Detail | RM | Assess pool capacity and members | Click from pools list | Add/remove member | `ResourcePoolDetailPage.tsx` | Detail Surface |
| `/work-evidence` | Work Evidence (v2-hidden) | all | Browse observed work evidence | Direct URL | Filter, export, review anomalies | `WorkEvidencePage.tsx` | List-Detail Workflow |
| `/workload` | Workload Matrix | RM, Director | See person × project allocation | Direct URL | Identify over/under allocation | `WorkloadMatrixPage.tsx` | Operational Queue |
| `/workload/planning` | Workload Planning | RM, Director | 12-week forward staffing timeline | Direct URL | Plan future assignments | `WorkloadPlanningPage.tsx` | Operational Queue |
| `/my-time` | My Time (v2-hidden) | all | **Folded into `/me?tab=time`** under `workspaceMe`; legacy URL still works | Direct URL | Enter hours, submit | `MyTimePage.tsx` | Create/Edit Form |
| `/time-management` | Time Management (v2-hidden) | PM, RM, HR, DM | Approve timesheets/leave, compliance, overtime | Direct URL | Approve, reject, review compliance | `TimeManagementPage.tsx` | Operational Queue |
| `/timesheets` | Timesheets (v2-hidden) | — | **Redirect → `/me?tab=time`** under `dsRefresh` | — | — | — | — |
| `/timesheets/approval` | Timesheet Approval (v2-hidden) | — | **Redirect → `/time-management` / `/approvals`** | — | — | — | — |
| `/leave` | Time Off | all | Submit leave requests | Direct link | Create request | `LeaveRequestPage.tsx` | Create/Edit Form |
| `/reports` | Reports (v2-flagship) | PM, RM, HR, DM, Director | Reports umbrella (exceptions, time, capitalisation, export, utilization, builder, evidence) | Sidebar nav | Open sub-report | `ReportsHubPage.tsx` | Analysis Surface |
| `/reports/time` | Time Analytics (v2-hidden) | PM, RM, HR | Time breakdown by project/person/dept | Reports hub | Filter, analyze, export | `TimeReportPage.tsx` | Analysis Surface |
| `/reports/capitalisation` | Capitalisation (v2-hidden) | DM, Director | CAPEX/OPEX breakdown | Reports hub | Filter, export | `CapitalisationPage.tsx` | Analysis Surface |
| `/reports/export` | Export Centre (v2-hidden) | HR, DM, Director | Generate XLSX reports | Reports hub | Select report, download | `ExportCentrePage.tsx` | Analysis Surface |
| `/reports/utilization` | Utilization (v2-hidden) | PM, RM, HR, DM | Drill into person utilization | Reports hub | Identify under/over utilized | `UtilizationPage.tsx` | Analysis Surface |
| `/reports/builder` | Report Builder (v2-hidden) | PM, RM, HR, DM | Build custom reports | Reports hub | Configure, save, export | `ReportBuilderPage.tsx` | Analysis Surface |
| `/exceptions` | Exceptions (v2-hidden) | PM, RM, HR, DM | Triage operational anomalies | Reports hub | Resolve, suppress, escalate | `ExceptionsPage.tsx` | Operational Queue |
| `/cases` | HR Queue (v2-flagship) | all | Onboarding/operational case workflows | Sidebar nav | View case, advance step | `CasesPage.tsx` | Operational Queue |
| `/cases/new` | Create Case | HR | Initiate a new case | Button from cases list | Fill form, submit | `CreateCasePage.tsx` | Create/Edit Form |
| `/cases/:id` | Case Detail | HR | Progress case through steps | Click from cases list | Advance step, add note, close | `CaseDetailsPage.tsx` | Detail Surface |
| `/integrations` | Integrations (v2-hidden) | Director | External provider health | Direct URL | Check sync status | `IntegrationsPage.tsx` | Admin Control |
| `/admin` | Admin (v2-flagship) | admin | Consolidated operator controls (tabbed shell W3-01) | Sidebar nav | Switch tab (governance / integrations / config) | `AdminPanelPage.tsx` | Admin Control |
| `/admin/dictionaries` | Dictionaries (legacy) | HR, Director | **Redirect → `/metadata-admin`** (D-101) | — | — | — | — |
| `/admin/audit` | Business Audit (v2-hidden) | HR, Director | Audit trail review | Admin shell | Search, filter, investigate | `BusinessAuditPage.tsx` | Admin Control |
| `/admin/notifications` | Notifications Admin (v2-hidden) | Director, admin | Channel/template management | Admin shell | Configure channels | `NotificationsPage.tsx` | Admin Control |
| `/admin/integrations` | Integrations Admin (v2-hidden) | admin | Provider config and sync | Admin shell | Configure, trigger sync | `IntegrationsAdminPage.tsx` | Admin Control |
| `/admin/integrations/registry` | Integrations Registry (v2-hidden) | admin | Uniform adapter registry (Jira, M365, RADIUS, JSM, LDAP, LLM) | Integrations admin | Inspect status, last-sync | `IntegrationsRegistryPage.tsx` | Admin Control |
| `/admin/integrations/sso` | SSO Configuration (v2-hidden) | admin | OIDC provider + auto-provisioning | Integrations admin | Edit, test discovery URL | `SsoConfigPage.tsx` | Admin Control |
| `/admin/monitoring` | Monitoring (v2-hidden) | Director, admin | Health / readiness / diagnostics | Admin shell | Check readiness, investigate | `MonitoringPage.tsx` | Admin Control |
| `/admin/settings` | Settings (v2-flagship) | admin | Configure platform behavior | Sidebar nav | Edit settings, save | `SettingsPage.tsx` | Admin Control |
| `/admin/people/import` | Bulk Import (v2-hidden) | HR, Director | CSV people import | Admin shell | Upload, review, confirm | `BulkImportPage.tsx` | Create/Edit Form |
| `/admin/people/new` | Create Person (legacy) | HR | **Redirect → `/people/new`** (D-86) | — | — | — | — |
| `/admin/webhooks` | Webhooks (v2-hidden) | admin | Webhook subscription management | Admin shell | Create, edit, delete | `WebhooksAdminPage.tsx` | Admin Control |
| `/admin/hris` | HRIS Integration (v2-hidden) | admin | HRIS provider config | Admin shell | Configure, test connection | `HrisConfigPage.tsx` | Admin Control |
| `/admin/access-policies` | Access Policies (v2-hidden) | admin | ABAC policy management | Admin shell | View, edit policies | `AccessPoliciesPage.tsx` | Admin Control |
| `/admin/access-policies/edit` | Role Permissions (v2-hidden) | admin | Override role lists behind named presets (D-159) | Admin shell | Edit preset members | `RolePermissionAdminPage.tsx` | Admin Control |
| `/admin/governance/roles` | Custom Roles (v2-hidden) | admin | Tenant-defined custom roles (NEW-LGL-3) | Admin governance tab | Create / edit role | `CustomRoleAdminPage.tsx` | Admin Control |
| `/admin/v2-soak-checklist` | V2 Soak Checklist (v2-hidden) | admin | 30 V2 journeys × 8 roles manual click-through | Admin governance tab | Mark PASS / FAIL cells | `V2SoakChecklistPage.tsx` | Admin Control |
| `/admin/responsibility-matrix` | Responsibility Matrix (v2-hidden) | admin | Configure approver chains per action | Admin shell | Edit chain | `ResponsibilityMatrixPage.tsx` | Admin Control |
| `/admin/period-locks` | Period Locks (v2-hidden) | admin | Lock historical periods (D-93) | Admin shell | Lock / unlock period | `PeriodLocksPage.tsx` | Admin Control |
| `/admin/leave-policies` | Leave Policies (v2-hidden) | admin | Per-leave-type accrual + approval chains | Admin shell | Edit policy | `LeavePoliciesPage.tsx` | Admin Control |
| `/admin/rate-cards` | Rate Cards (v2-hidden) | admin | Bill-rate cards per (role × grade × skill) | Admin shell | Edit card | `RateCardsPage.tsx` | Admin Control |
| `/admin/vendors` | Vendors (v2-hidden) | admin | External vendors / subcontractors | Admin shell | Create, edit | `VendorsAdminPage.tsx` | Admin Control |
| `/admin/feature-flags` | Feature Flags (v2-hidden) | admin | Toggle features per tenant | Admin shell | Flip flag | `FeatureFlagsAdminPage.tsx` | Admin Control |
| `/admin/radiator-thresholds` | Radiator Thresholds (v2-hidden) | admin | Configure 16-axis scoring thresholds | Admin shell | Edit threshold | `RadiatorThresholdsPage.tsx` | Admin Control |
| `/admin/organization-config` | Organization Config (v2-hidden) | admin | Org reporting cadence + governance + risk cadence | Admin shell | Edit cadence | `OrganizationConfigPage.tsx` | Admin Control |
| `/admin/setup` | Setup Operations (v2-hidden) | admin | Re-run setup steps post-install (F-13.7 / D-117) | Admin shell | Re-run step | `SetupOperationsPage.tsx` | Admin Control |
| `/admin/help` | Help Center Admin (v2-hidden) | admin | Author / publish Help Center articles | Admin shell | Create / edit article | `HelpAdminPage.tsx` | Admin Control |
| `/metadata-admin` | Metadata Admin (v2-hidden) | HR, Director, admin | Validation and dictionary config (D-101) | Admin shell | Manage metadata | `MetadataAdminPage.tsx` | Admin Control |
| `/help` | Help (v2-hidden) | all | Browse Help Center articles | `?` button | Open article | `HelpArticleListPage.tsx` | List-Detail Workflow |
| `/help/:slug` | Help Article | all | Read a single Help Center article | Click from `/help` | Back to list, related links | `HelpArticleDetailPage.tsx` | Detail Surface |
| `/settings/account` | Account Settings | all | Password / preferences | User menu | Change password, update prefs | `AccountSettingsPage.tsx` | Create/Edit Form |
| `/notifications` | Inbox | all | View notifications | Bell icon | Read, act on notification | `InboxPage.tsx` | List-Detail Workflow |
| `/login` | Login | unauthenticated | Authenticate | Direct URL | Enter credentials, submit | `LoginPage.tsx` | Auth Form |
| `/forgot-password` | Forgot Password | unauthenticated | Reset password | Login page link | Enter email, submit | `ForgotPasswordPage.tsx` | Auth Form |
| `/reset-password` | Reset Password | unauthenticated | Set new password | Email link | Enter new password, submit | `ResetPasswordPage.tsx` | Auth Form |
| `/auth/2fa-setup` | 2FA Setup | all | Set up two-factor auth | Post-login redirect | Scan QR, verify code | `TwoFactorSetupPage.tsx` | Auth Form |

## Group taxonomy

`route-manifest.ts` defines 9 legacy groups (`dashboard`, `people-org`,
`projects`, `staffing`, `time`, `reports`, `admin-config`,
`admin-integrations`, `admin-governance`) collapsed into 3 v2 buckets by
`groupV2For()`:

| Legacy group | V2 bucket |
|---|---|
| `dashboard`, `time`, `projects`, `staffing`, `reports` | `workspace` |
| `people-org` | `workforce` |
| `admin-config`, `admin-integrations`, `admin-governance` | `operations` |

The v2 sidebar (canvas-exact, enforced by
`route-manifest-groupv2.test.ts`) renders exactly **10 items** after
`obsoleteInV2` filtering:

| V2 bucket | Items |
|---|---|
| Workspace | Home (`/me`), Projects, Approvals, Reports, Staffing Desk |
| Workforce | People, Bench, HR Queue (`/cases`) |
| Operations | Admin, Settings |
