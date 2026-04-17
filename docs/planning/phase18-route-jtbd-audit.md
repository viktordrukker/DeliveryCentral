# Phase 18 — Route-to-JTBD Audit Table

**Created:** 2026-04-14  
**Source:** `frontend/src/app/route-manifest.ts` + `docs/testing/EXHAUSTIVE_JTBD_LIST.md`

## Route Audit

| Route | Title | Primary Persona | Primary JTBD | Entry Trigger | Expected Next Action | Page File | Target Grammar |
|-------|-------|-----------------|-------------|---------------|---------------------|-----------|---------------|
| `/` | Workload Overview | admin | Scan portfolio health, act on issues | Auto-redirect by role | Drill into unstaffed/mismatch project | `DashboardPage.tsx` | Decision Dashboard |
| `/dashboard/planned-vs-actual` | Planned vs Actual | PM, DM | Reconcile evidence vs assignments | Nav from workload dashboard | Investigate mismatched project | `PlannedVsActualPage.tsx` | Decision Dashboard |
| `/dashboard/employee` | Employee Dashboard | employee | See my assignments, workload, pulse | Login redirect | View assignment detail, submit pulse | `EmployeeDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/project-manager` | PM Dashboard | PM | Identify staffing gaps and anomalies | Login redirect | Create staffing request, review project | `ProjectManagerDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/resource-manager` | RM Dashboard | RM | Balance capacity across teams | Login redirect | Reassign, approve assignment, view workload | `ResourceManagerDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/hr` | HR Dashboard | HR | Monitor org health and data quality | Login redirect | Investigate risk employee, fix data gap | `HrDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/delivery-manager` | Delivery Dashboard | DM | Track delivery health and evidence coverage | Login redirect | Escalate portfolio risk, review staffing gap | `DeliveryManagerDashboardPage.tsx` | Decision Dashboard |
| `/dashboard/director` | Director Dashboard | Director | Executive scan of org health | Login redirect | Drill into unit, project, or staffing issue | `DirectorDashboardPage.tsx` | Decision Dashboard |
| `/people` | People | HR, RM | Find and manage people records | Sidebar nav | View person detail, create employee | `PeoplePage.tsx` | List-Detail Workflow |
| `/people/:id` | Person Detail | HR, RM | Understand person operationally | Click from people list | Edit profile, manage lifecycle, view skills | `EmployeeDetailsPlaceholderPage.tsx` | Detail Surface |
| `/people/new` | Create Person | HR | Onboard new employee | Button from people list | Fill form, submit | `EmployeeLifecycleAdminPage.tsx` | Create/Edit Form |
| `/org` | Org Chart | all | View organization structure | Sidebar nav | Drill into department, view manager scope | `OrgPage.tsx` | Structural Overview |
| `/org/managers/:id/scope` | Manager Scope | HR, Director | See reporting scope of a manager | Click from org chart | Review reports, reassign | `ManagerScopePage.tsx` | Detail Surface |
| `/teams` | Teams | all | View operational delivery teams | Sidebar nav | View team dashboard | `TeamsPage.tsx` | List-Detail Workflow |
| `/teams/:id/dashboard` | Team Dashboard | RM, DM | Assess team staffing and spread | Click from teams list | Reassign, review allocation | `TeamDashboardPage.tsx` | Decision Dashboard |
| `/projects` | Projects | PM, DM | Browse and manage project registry | Sidebar nav | View project detail, create project | `ProjectsPage.tsx` | List-Detail Workflow |
| `/projects/new` | Create Project | PM, DM | Register a new project | Button from projects list | Fill form, submit | `CreateProjectPage.tsx` | Create/Edit Form |
| `/projects/:id` | Project Detail | PM | Understand project state and act | Click from projects list | Activate, close, staff, review budget | `ProjectDetailsPlaceholderPage.tsx` | Detail Surface |
| `/projects/:id/dashboard` | Project Dashboard | PM, DM | Operational cockpit for one project | Link from project detail | Review evidence, allocation, anomalies | `ProjectDashboardPage.tsx` | Decision Dashboard |
| `/assignments` | Assignments | PM, RM | Browse authoritative staffing truth | Sidebar nav | View assignment detail, create assignment | `AssignmentsPage.tsx` | List-Detail Workflow |
| `/assignments/new` | Create Assignment | PM, RM | Staff a person to a project | Button from assignments list | Fill form, submit | `CreateAssignmentPage.tsx` | Create/Edit Form |
| `/assignments/bulk` | Bulk Assign | PM, RM | Staff multiple people at once | Button from assignments list | Fill batch form, submit | `BulkAssignmentPage.tsx` | Create/Edit Form |
| `/assignments/:id` | Assignment Detail | PM, RM | Review assignment state and history | Click from assignments list | Approve, reject, end, extend | `AssignmentDetailsPlaceholderPage.tsx` | Detail Surface |
| `/resource-pools` | Resource Pools | RM | Manage pools of available people | Sidebar nav | View pool detail, create pool | `ResourcePoolsPage.tsx` | List-Detail Workflow |
| `/resource-pools/:id` | Pool Detail | RM | Assess pool capacity and members | Click from pools list | Add/remove member | `ResourcePoolDetailPage.tsx` | Detail Surface |
| `/work-evidence` | Work Evidence | all | Browse observed work evidence | Sidebar nav | Filter, export, review anomalies | `WorkEvidencePage.tsx` | List-Detail Workflow |
| `/workload` | Workload Matrix | RM, Director | See person × project allocation | Sidebar nav | Identify over/under allocation | `WorkloadMatrixPage.tsx` | Operational Queue |
| `/workload/planning` | Workload Planning | RM, Director | 12-week forward staffing timeline | Sidebar nav | Plan future assignments | `WorkloadPlanningPage.tsx` | Operational Queue |
| `/my-time` | My Time | all | Monthly timesheet, leave, gaps, bench time | Sidebar nav | Enter hours, submit, request leave | `MyTimePage.tsx` | Create/Edit Form |
| `/time-management` | Time Management | PM, RM, HR, DM | Approve timesheets/leave, compliance, overtime | Sidebar nav | Approve, reject, review compliance | `TimeManagementPage.tsx` | Operational Queue |
| `/timesheets` | ~~My Timesheet~~ | — | **Redirect → `/my-time`** | — | — | — | — |
| `/timesheets/approval` | ~~Timesheet Approval~~ | — | **Redirect → `/time-management`** | — | — | — | — |
| `/leave` | Time Off | all | Submit leave requests (creation form) | Direct link | Create request | `LeaveRequestPage.tsx` | Create/Edit Form |
| `/reports/time` | Time Analytics | PM, RM, HR | Time breakdown: standard, OT, bench, CAPEX/OPEX, trends | Sidebar nav | Filter, analyze, export | `TimeReportPage.tsx` | Analysis Surface |
| `/reports/capitalisation` | Capitalisation | DM, Director | CAPEX/OPEX breakdown | Sidebar nav | Filter, export | `CapitalisationPage.tsx` | Analysis Surface |
| `/reports/export` | Export Centre | HR, DM, Director | Generate XLSX reports | Sidebar nav | Select report, download | `ExportCentrePage.tsx` | Analysis Surface |
| `/reports/utilization` | Utilization | PM, RM, HR, DM | Drill into person utilization | Sidebar nav | Identify under/over utilized | `UtilizationPage.tsx` | Analysis Surface |
| `/reports/builder` | Report Builder | PM, RM, HR, DM | Build custom reports | Sidebar nav | Configure, save, export | `ReportBuilderPage.tsx` | Analysis Surface |
| `/cases` | Cases | all | Browse onboarding/operational cases | Sidebar nav | View case detail, create case | `CasesPage.tsx` | Operational Queue |
| `/cases/new` | Create Case | HR | Initiate a new case | Button from cases list | Fill form, submit | `CreateCasePage.tsx` | Create/Edit Form |
| `/cases/:id` | Case Detail | HR | Progress case through steps | Click from cases list | Advance step, add note, close | `CaseDetailsPage.tsx` | Detail Surface |
| `/staffing-requests` | Staffing Requests | PM, RM | Post and track staffing demand | Sidebar nav | View detail, create request | `StaffingRequestsPage.tsx` | Operational Queue |
| `/staffing-requests/new` | Create Request | PM, RM, DM | Capture staffing demand | Button from requests list | Fill form, submit | `CreateStaffingRequestPage.tsx` | Create/Edit Form |
| `/staffing-requests/:id` | Request Detail | RM | Evaluate candidates and fulfill | Click from requests list | Propose candidate, fulfill, cancel | `StaffingRequestDetailPage.tsx` | Detail Surface |
| `/staffing-board` | Staffing Board | RM, DM | Drag-and-drop assignment management | Sidebar nav | Move assignments, resolve conflicts | `StaffingBoardPage.tsx` | Operational Queue |
| `/exceptions` | Exceptions | PM, RM, HR, DM | Triage operational anomalies | Sidebar nav | Resolve, suppress, escalate | `ExceptionsPage.tsx` | Operational Queue |
| `/integrations` | Integrations | Director | External provider health | Sidebar nav | Check sync status, escalate | `IntegrationsPage.tsx` | Admin Control |
| `/admin` | Admin | admin | Consolidated operator controls | Sidebar nav | Navigate to sub-section | `AdminPanelPage.tsx` | Admin Control |
| `/admin/dictionaries` | Dictionaries | HR, Director | Metadata dictionary management | Admin nav | Add/edit entries | `DictionariesPage.tsx` | Admin Control |
| `/admin/audit` | Business Audit | HR, Director | Audit trail review | Admin nav | Search, filter, investigate | `BusinessAuditPage.tsx` | Admin Control |
| `/admin/notifications` | Notifications Admin | Director | Channel/template management | Admin nav | Configure channels | `NotificationsPage.tsx` | Admin Control |
| `/admin/integrations` | Integrations Admin | Director | Provider config and sync | Admin nav | Configure, trigger sync | `IntegrationsAdminPage.tsx` | Admin Control |
| `/admin/monitoring` | Monitoring | Director | Health and diagnostics | Admin nav | Check readiness, investigate | `MonitoringPage.tsx` | Admin Control |
| `/admin/settings` | Platform Settings | admin | Configure platform behavior | Admin nav | Edit settings, save | `SettingsPage.tsx` | Admin Control |
| `/admin/people/import` | Bulk Import | HR, Director | CSV people import | Admin nav | Upload, review, confirm | `BulkImportPage.tsx` | Create/Edit Form |
| `/admin/webhooks` | Webhooks | admin | Webhook subscription management | Admin nav | Create, edit, delete | `WebhooksAdminPage.tsx` | Admin Control |
| `/admin/hris` | HRIS Integration | admin | HRIS provider config | Admin nav | Configure, test connection | `HrisConfigPage.tsx` | Admin Control |
| `/admin/access-policies` | Access Policies | admin | ABAC policy management | Admin nav | View, edit policies | `AccessPoliciesPage.tsx` | Admin Control |
| `/metadata-admin` | Metadata Admin | admin | Validation and config | Admin nav | Manage metadata | `MetadataAdminPage.tsx` | Admin Control |
| `/settings/account` | Account Settings | all | Password/preferences | User menu | Change password, update prefs | `AccountSettingsPage.tsx` | Create/Edit Form |
| `/notifications` | Inbox | all | View notifications | Bell icon | Read, act on notification | `InboxPage.tsx` | List-Detail Workflow |
| `/login` | Login | unauthenticated | Authenticate | Direct URL | Enter credentials, submit | `LoginPage.tsx` | Auth Form |
| `/forgot-password` | Forgot Password | unauthenticated | Reset password | Login page link | Enter email, submit | `ForgotPasswordPage.tsx` | Auth Form |
| `/reset-password` | Reset Password | unauthenticated | Set new password | Email link | Enter new password, submit | `ResetPasswordPage.tsx` | Auth Form |
| `/auth/2fa-setup` | 2FA Setup | all | Set up two-factor auth | Post-login redirect | Scan QR, verify code | `TwoFactorSetupPage.tsx` | Auth Form |
