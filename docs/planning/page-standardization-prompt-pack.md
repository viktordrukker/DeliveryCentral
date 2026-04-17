# Page Standardization Prompt Pack

**Date:** 2026-04-14  
**Purpose:** give Claude Code standardized, JTBD-grounded prompts to redesign and refactor the major DeliveryCentral pages and workflows so the product converges on one visual and interaction system.

## How to use this pack

Use one prompt at a time. Each prompt assumes Claude Code should:

- inspect the referenced files first
- preserve current business logic unless explicitly improving the read model or API shape
- standardize layout, interactions, and component usage
- align the page with JTBDs and UX laws already documented in this repo

Primary source docs Claude should follow:

- [docs/planning/persona-jtbds.md](/home/drukker/DeliveryCentral/docs/planning/persona-jtbds.md:1)
- [docs/testing/EXHAUSTIVE_JTBD_LIST.md](/home/drukker/DeliveryCentral/docs/testing/EXHAUSTIVE_JTBD_LIST.md:1)
- [docs/planning/UX_OPERATING_SYSTEM_v2.md](/home/drukker/DeliveryCentral/docs/planning/UX_OPERATING_SYSTEM_v2.md:1)
- [frontend/src/app/route-manifest.ts](/home/drukker/DeliveryCentral/frontend/src/app/route-manifest.ts:1)

## Canonical standards to enforce everywhere

These rules apply to every prompt below.

### 1. Every page must declare its primary JTBD

Claude Code should explicitly identify:

- primary persona
- primary job to be done
- entry trigger
- expected next action after success

### 2. Reuse the standard component system

Prefer these shared building blocks:

- [DataTable](/home/drukker/DeliveryCentral/frontend/src/components/common/DataTable.tsx:1)
- [StatusBadge](/home/drukker/DeliveryCentral/frontend/src/components/common/StatusBadge.tsx:1)
- [SectionCard](/home/drukker/DeliveryCentral/frontend/src/components/common/SectionCard.tsx:1)
- [PageContainer](/home/drukker/DeliveryCentral/frontend/src/components/common/PageContainer.tsx:1)
- [TipBalloon](/home/drukker/DeliveryCentral/frontend/src/components/common/TipBalloon.tsx:1)
- [design-tokens.ts](/home/drukker/DeliveryCentral/frontend/src/styles/design-tokens.ts:1)

### 3. Follow the dashboard grammar for all decision surfaces

From the UX operating system:

1. urgent anomaly strip when needed
2. what-needs-you-now/action rail
3. KPI strip
4. tabs only when they reduce complexity
5. primary visualization area
6. drilldown table
7. data freshness/footer

### 4. Follow workflow grammar for list/detail/action screens

- tables must carry context
- detail screens must not be dead ends
- actions should live next to the decision data
- filtered state should survive navigation
- inline actions are preferred over unnecessary page hops

### 5. Standard visual policy

- no raw color literals
- no bespoke badge/table variants when shared primitives can do it
- KPI cards should be clickable doorways
- filters should be persistent and role-appropriate
- actions should produce clear next-step feedback

## Route coverage map

This pack covers the main route groups in [route-manifest.ts](/home/drukker/DeliveryCentral/frontend/src/app/route-manifest.ts:1):

### Dashboards

- `/`
- `/dashboard/planned-vs-actual`
- `/dashboard/employee`
- `/dashboard/project-manager`
- `/dashboard/resource-manager`
- `/dashboard/hr`
- `/dashboard/delivery-manager`
- `/dashboard/director`

### People & org

- `/people`
- `/people/:id`
- `/people/new`
- `/org`
- `/org/managers/:id/scope`
- `/teams`
- `/teams/:id/dashboard`

### Work execution

- `/projects`
- `/projects/new`
- `/projects/:id`
- `/projects/:id/dashboard`
- `/assignments`
- `/assignments/new`
- `/assignments/bulk`
- `/assignments/:id`
- `/work-evidence`
- `/timesheets`
- `/timesheets/approval`
- `/leave`

### Staffing and planning

- `/staffing-requests`
- `/staffing-requests/new`
- `/staffing-requests/:id`
- `/staffing-board`
- `/resource-pools`
- `/resource-pools/:id`
- `/workload`
- `/workload/planning`

### Governance and reports

- `/exceptions`
- `/reports/time`
- `/reports/capitalisation`
- `/reports/export`
- `/reports/utilization`
- `/reports/builder`
- `/cases`
- `/cases/new`
- `/cases/:id`
- `/integrations`

### Admin

- `/admin`
- `/admin/dictionaries`
- `/admin/audit`
- `/admin/notifications`
- `/admin/integrations`
- `/admin/monitoring`
- `/metadata-admin`
- `/admin/settings`
- `/admin/people/import`
- `/admin/webhooks`
- `/admin/hris`
- `/admin/access-policies`

## Workflow clusters

The surface area is large, so the best standardization strategy is by workflow cluster rather than random page-by-page redesigns.

### Cluster A: Dashboard decision surfaces

Routes:

- `/`
- `/dashboard/planned-vs-actual`
- `/dashboard/employee`
- `/dashboard/project-manager`
- `/dashboard/resource-manager`
- `/dashboard/hr`
- `/dashboard/delivery-manager`
- `/dashboard/director`

JTBD focus:

- fast scan
- triage
- drilldown into action
- cross-link into the right operational workflow

### Cluster B: People and org governance

Routes:

- `/people`
- `/people/:id`
- `/people/new`
- `/org`
- `/org/managers/:id/scope`
- `/teams`
- `/teams/:id/dashboard`

JTBD focus:

- understand workforce shape
- inspect a person deeply
- correct org and lifecycle issues
- keep team and org models distinct

### Cluster C: Projects and assignments

Routes:

- `/projects`
- `/projects/new`
- `/projects/:id`
- `/projects/:id/dashboard`
- `/assignments`
- `/assignments/new`
- `/assignments/bulk`
- `/assignments/:id`

JTBD focus:

- project lifecycle management
- assignment governance
- staffing truth
- fast access from problem to action

### Cluster D: Staffing and workload planning

Routes:

- `/staffing-requests`
- `/staffing-requests/new`
- `/staffing-requests/:id`
- `/staffing-board`
- `/resource-pools`
- `/resource-pools/:id`
- `/workload`
- `/workload/planning`

JTBD focus:

- detect staffing gaps
- evaluate candidates
- rebalance capacity
- act without repetitive navigation

### Cluster E: Time, evidence, and operational execution

Routes:

- `/work-evidence`
- `/timesheets`
- `/timesheets/approval`
- `/leave`
- `/reports/time`
- `/reports/capitalisation`
- `/reports/export`
- `/reports/utilization`
- `/reports/builder`

JTBD focus:

- quick accurate time logging
- fast approval
- evidence traceability
- operational reporting

### Cluster F: Cases, exceptions, and governance

Routes:

- `/cases`
- `/cases/new`
- `/cases/:id`
- `/exceptions`
- `/integrations`

JTBD focus:

- detect what is broken
- resolve with full context
- preserve auditability

### Cluster G: Admin and operator control surfaces

Routes:

- `/admin`
- `/admin/dictionaries`
- `/admin/audit`
- `/admin/notifications`
- `/admin/integrations`
- `/admin/monitoring`
- `/metadata-admin`
- `/admin/settings`
- `/admin/people/import`
- `/admin/webhooks`
- `/admin/hris`
- `/admin/access-policies`

JTBD focus:

- central operator control
- governed admin actions
- diagnostics, audit, and configuration with low confusion

## Prompts

### Prompt 1: All dashboards

```text
Review and redesign the DeliveryCentral dashboard surfaces so they all follow one canonical decision-dashboard standard.

Scope:
- frontend/src/routes/dashboard/DashboardPage.tsx
- frontend/src/routes/dashboard/PlannedVsActualPage.tsx
- frontend/src/routes/dashboard/EmployeeDashboardPage.tsx
- frontend/src/routes/dashboard/ProjectManagerDashboardPage.tsx
- frontend/src/routes/dashboard/ResourceManagerDashboardPage.tsx
- frontend/src/routes/dashboard/HrDashboardPage.tsx
- frontend/src/routes/dashboard/DeliveryManagerDashboardPage.tsx
- frontend/src/routes/dashboard/DirectorDashboardPage.tsx

Reference docs:
- docs/planning/persona-jtbds.md
- docs/testing/EXHAUSTIVE_JTBD_LIST.md
- docs/planning/UX_OPERATING_SYSTEM_v2.md
- docs/planning/planned-vs-actual-dashboard-discovery.md

Primary goal:
- Standardize all dashboards around one layout grammar and one interaction model.

Rules:
- Use Workload Overview (DashboardPage.tsx) as the canonical structural reference.
- Every dashboard must act as a decision surface, not just a report.
- Every KPI must be a drilldown doorway.
- Prefer one hero chart, one action zone, and one drilldown table over multiple equal-weight sections.
- Use shared primitives: DataTable, SectionCard, StatusBadge, TipBalloon, design tokens.
- Remove inline styles where shared layout classes or tokens can replace them.
- Preserve each dashboard’s role-specific JTBD.

Expected output:
- standardize layout hierarchy
- identify and fix pages that are still report-first
- improve actionability and cross-linking into the right workflows
- modernize charts and table framing without breaking existing business logic
- add or update tests for the new structure where appropriate
```

### Prompt 2: People and org surfaces

```text
Review and redesign the People and Org surfaces so they feel like one coherent workforce-governance workflow instead of disconnected pages.

Scope:
- frontend/src/routes/people/PeoplePage.tsx
- frontend/src/routes/people/EmployeeDirectoryPage.tsx
- frontend/src/routes/people/EmployeeDetailsPlaceholderPage.tsx
- frontend/src/routes/people/EmployeeLifecycleAdminPage.tsx
- frontend/src/routes/org/OrgPage.tsx
- frontend/src/routes/org/ManagerScopePage.tsx
- frontend/src/routes/teams/TeamsPage.tsx
- frontend/src/routes/teams/TeamDashboardPage.tsx

JTBD focus:
- HR: understand workforce shape and correct people-data issues
- RM/Director: inspect reporting structure and team load
- Employee: understand own profile context and reporting line

Design standards:
- list/detail flows must carry filter context
- person detail should become a real “Person 360” surface
- org and team concepts must stay visually and conceptually distinct
- tables should use DataTable
- status indicators should use StatusBadge
- charts and summaries should answer workforce questions directly

Specific asks:
- standardize People list, Person detail, Org, and Teams around one navigation and context model
- make the detail experience more inspector-like and action-adjacent
- ensure HR lifecycle actions live near the relevant profile evidence
- improve breadcrumbs and back-to-filter continuity
- update tests to cover core people/org JTBD flows
```

### Prompt 3: Projects and assignments workflow

```text
Review and redesign the Projects and Assignments surfaces as one end-to-end project staffing workflow.

Scope:
- frontend/src/routes/projects/ProjectsPage.tsx
- frontend/src/routes/projects/CreateProjectPage.tsx
- frontend/src/routes/projects/ProjectDetailsPlaceholderPage.tsx
- frontend/src/routes/projects/ProjectDashboardPage.tsx
- frontend/src/routes/assignments/AssignmentsPage.tsx
- frontend/src/routes/assignments/CreateAssignmentPage.tsx
- frontend/src/routes/assignments/BulkAssignmentPage.tsx
- frontend/src/routes/assignments/AssignmentDetailsPlaceholderPage.tsx

JTBD focus:
- PM: manage project lifecycle and staffing risk
- RM: create, review, and govern assignments
- Director/Admin: inspect project and staffing health

Design standards:
- Projects and Assignments should feel tightly linked
- lifecycle actions should live next to context, not behind dead-end flows
- project detail should answer “is this project healthy, staffed, and on track?”
- assignment detail should answer “what changed, why, and what should happen next?”
- bulk actions should be efficient and low-friction

Specific asks:
- standardize list/detail/create/bulk flows
- reduce unnecessary page hops between project and assignment work
- use consistent action rails, KPI framing, and detail sections
- modernize create/edit forms to reduce repetitive input
- add tests for project lifecycle and assignment governance JTBDs
```

### Prompt 4: Staffing and workload planning

```text
Review and redesign the Staffing and Workload Planning surfaces as a single capacity-management system.

Scope:
- frontend/src/routes/staffing-requests/StaffingRequestsPage.tsx
- frontend/src/routes/staffing-requests/CreateStaffingRequestPage.tsx
- frontend/src/routes/staffing-requests/StaffingRequestDetailPage.tsx
- frontend/src/routes/staffing-board/StaffingBoardPage.tsx
- frontend/src/routes/resource-pools/ResourcePoolsPage.tsx
- frontend/src/routes/resource-pools/ResourcePoolDetailPage.tsx
- frontend/src/routes/workload/WorkloadMatrixPage.tsx
- frontend/src/routes/workload/WorkloadPlanningPage.tsx

JTBD focus:
- RM: rebalance capacity, fill demand, avoid conflicts
- PM: request staffing with enough context
- Delivery/Director: understand where gaps and overload exist

Reference UX sections:
- docs/planning/UX_OPERATING_SYSTEM_v2.md section B.1 Staffing and Assignments
- docs/planning/UX_OPERATING_SYSTEM_v2.md section B.3 Workload Balancing

Design standards:
- this cluster should prioritize detect → understand → decide → act
- requests, pools, and planning views should cross-link naturally
- inspector-style side context is preferred where it reduces navigation
- conflict and overload states must be obvious
- smart defaults and persistent filters should be used aggressively

Specific asks:
- standardize staffing request list/detail/create experiences
- improve workload and staffing-board actionability
- align resource pool detail with staffing workflows
- make capacity risk visually consistent across all pages
- update tests for staffing and workload JTBDs
```

### Prompt 5: Time, evidence, and execution surfaces

```text
Review and redesign the time/evidence/execution surfaces so they support fast operational entry, review, and reporting with one consistent system.

Scope:
- frontend/src/routes/work-evidence/WorkEvidencePage.tsx
- frontend/src/routes/timesheets/TimesheetPage.tsx
- frontend/src/routes/timesheets/TimesheetApprovalPage.tsx
- frontend/src/routes/leave/LeaveRequestPage.tsx
- frontend/src/routes/reports/TimeReportPage.tsx
- frontend/src/routes/reports/CapitalisationPage.tsx
- frontend/src/routes/reports/ExportCentrePage.tsx
- frontend/src/routes/reports/UtilizationPage.tsx
- frontend/src/routes/reports/ReportBuilderPage.tsx

JTBD focus:
- Employee: log time quickly and correctly
- PM/RM/HR/Director: approve, inspect, and report with minimal friction

Reference UX sections:
- docs/planning/UX_OPERATING_SYSTEM_v2.md section B.4 Timesheets and Approval
- docs/planning/UX_OPERATING_SYSTEM_v2.md section B.5 Cost Governance

Design standards:
- timesheet entry should optimize speed and confidence
- approval should be queue-first with immediate context
- evidence and reports should preserve traceability back to staffing and projects
- report pages should feel like analysis surfaces, not isolated exports

Specific asks:
- standardize grid/table/form patterns across time and evidence pages
- make approval and anomaly context visible near the decision
- use shared chart and table conventions
- improve report page hierarchy and drilldown logic
- add or update tests for critical time/evidence JTBDs
```

### Prompt 6: Cases, exceptions, and governance flow

```text
Review and redesign the cases and exceptions surfaces as one operational-resolution workflow.

Scope:
- frontend/src/routes/cases/CasesPage.tsx
- frontend/src/routes/cases/CreateCasePage.tsx
- frontend/src/routes/cases/CaseDetailsPage.tsx
- frontend/src/routes/exceptions/ExceptionsPage.tsx
- frontend/src/routes/integrations/IntegrationsPage.tsx

JTBD focus:
- HR: manage lifecycle cases clearly and audibly
- PM/RM/Director/Admin: identify and resolve operational anomalies quickly

Reference UX sections:
- docs/planning/UX_OPERATING_SYSTEM_v2.md section B.6 People Lifecycle
- docs/planning/UX_OPERATING_SYSTEM_v2.md section B.7 Exception Handling

Design standards:
- exceptions should be triage-first, with embedded context and fast action
- case detail should support step progression without losing context
- governance surfaces should show what is broken, why, and what action is available

Specific asks:
- standardize queue/list/detail patterns
- reduce dead-end navigation
- improve severity, priority, and next-action visibility
- make linked entity context visible without needless navigation
- update tests for case progression and exception resolution JTBDs
```

### Prompt 7: Admin and operator control surfaces

```text
Review and redesign the admin/operator pages so they behave like one governed control center rather than a set of loosely related admin screens.

Scope:
- frontend/src/routes/admin/AdminPanelPage.tsx
- frontend/src/routes/admin/DictionariesPage.tsx
- frontend/src/routes/admin/BusinessAuditPage.tsx
- frontend/src/routes/admin/NotificationsPage.tsx
- frontend/src/routes/admin/IntegrationsAdminPage.tsx
- frontend/src/routes/admin/MonitoringPage.tsx
- frontend/src/routes/metadata-admin/MetadataAdminPage.tsx
- frontend/src/routes/admin/SettingsPage.tsx
- frontend/src/routes/admin/BulkImportPage.tsx
- frontend/src/routes/admin/WebhooksAdminPage.tsx
- frontend/src/routes/admin/HrisConfigPage.tsx
- frontend/src/routes/admin/AccessPoliciesPage.tsx

JTBD focus:
- Admin: diagnose, configure, audit, and operate safely
- Director: inspect governance and platform health where allowed

Design standards:
- centralize the mental model of “configure, inspect, and audit”
- use consistent page headers, sectioning, and action placement
- separate technical diagnostics from business audit clearly
- make risky actions explicit and reversible when possible

Specific asks:
- standardize all admin pages around a common control-surface pattern
- reduce fragmentation between admin panel and deep admin pages
- improve discoverability of diagnostics, audit, and settings
- use shared status, table, and section primitives
- add or update tests for core admin JTBDs
```

### Prompt 8: Authentication and account surfaces

```text
Review and redesign the auth/account surfaces so they feel consistent with the rest of the product and support secure self-service with minimal confusion.

Scope:
- frontend/src/routes/auth/LoginPage.tsx
- frontend/src/routes/auth/ForgotPasswordPage.tsx
- frontend/src/routes/auth/ResetPasswordPage.tsx
- frontend/src/routes/auth/TwoFactorSetupPage.tsx
- frontend/src/routes/settings/AccountSettingsPage.tsx

JTBD focus:
- every user: sign in, recover access, manage authentication settings, change password safely

Design standards:
- auth screens should be clean, low-noise, and trustworthy
- account settings should feel like part of the main app, not a utility afterthought
- messaging should reduce anxiety and clarify what happens next

Specific asks:
- standardize auth form layout and feedback
- make security state explicit
- ensure account settings aligns with the unified token/component system
- add or update tests for login/password/2FA/account JTBDs
```

## Strategic page-specific prompts

These pages are important enough to warrant dedicated prompts like the Planned vs Actual brief.

### Strategic pages to treat individually

- `/dashboard/planned-vs-actual`
- `/dashboard/project-manager`
- `/dashboard/resource-manager`
- `/dashboard/hr`
- `/dashboard/delivery-manager`
- `/dashboard/director`
- `/people/:id`
- `/projects/:id`
- `/assignments/:id`
- `/staffing-requests/:id`
- `/timesheets/approval`
- `/exceptions`
- `/admin`

## Meta prompt: full-app standardization pass

Use this only after the workflow-cluster prompts above have been used to establish direction.

```text
Perform a full DeliveryCentral frontend standardization review across all routes in frontend/src/routes, using route-manifest.ts as the canonical scope list and the JTBD/UX docs as governing rules.

Goals:
- identify inconsistent layout, component usage, table behavior, badge semantics, KPI behavior, and action placement
- standardize pages by workflow cluster, not by isolated cosmetic cleanup
- preserve business logic while improving clarity, actionability, and continuity
- use shared primitives and tokenized styling throughout

Required references:
- docs/planning/persona-jtbds.md
- docs/testing/EXHAUSTIVE_JTBD_LIST.md
- docs/planning/UX_OPERATING_SYSTEM_v2.md
- frontend/src/app/route-manifest.ts
- frontend/src/styles/design-tokens.ts
- frontend/src/components/common/DataTable.tsx
- frontend/src/components/common/StatusBadge.tsx

Output expectations:
- identify the current JTBD of each major route cluster
- propose the target screen grammar for each cluster
- implement the highest-impact standardization changes
- update tests for the affected JTBDs and workflow continuity
```

## Recommended execution order

Run prompts in this order for the highest leverage:

1. All dashboards
2. Staffing and workload planning
3. Projects and assignments
4. People and org
5. Time, evidence, and execution
6. Cases, exceptions, and governance
7. Admin and operator control surfaces
8. Authentication and account surfaces

## Final recommendation

Do not ask Claude Code to “make pages look nicer.”  
Ask it to standardize each workflow cluster around:

- one JTBD
- one page grammar
- one component vocabulary
- one continuity model
- one action model

That will produce a coherent product rather than a series of isolated redesigns.
