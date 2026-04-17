# Phase 18 — Page Standardization Changelog

**Created:** 2026-04-14  
**Purpose:** Track the standardization state of every page cluster so another agent can safely resume midway.

---

## Shared Primitive Baseline

All pages in the codebase use `PageContainer` for layout (except auth pages which use MUI-based standalone forms). Most pages use `SectionCard`, `ErrorState`, and `LoadingState`. The primary gaps are:

1. **DataTable**: Only `ProjectsPage` and `PlannedVsActualPage` use the shared `DataTable` component. Other list pages delegate to domain-specific table components (`AssignmentsTable`, `EmployeeDirectoryTable`, `ProjectRegistryTable`, `WorkEvidenceTable`, etc.) that internally follow consistent patterns. These domain components provide column customization and filtering that `DataTable` alone doesn't cover.

2. **StatusBadge**: Most pages use CSS class-based badges (`badge badge--success`, etc.) or domain-specific badge components (`ProjectHealthBadge`, `PriorityBadge`, `StaffingRequestStatusBadge`). These are visually consistent but don't use the shared `StatusBadge` primitive.

3. **Raw tables in dashboards**: All 6 role dashboards use `<table className="dash-compact-table">` for compact data sections. This is a deliberate dashboard style pattern — the `dash-compact-table` CSS class provides dashboard-appropriate compact styling.

**Assessment**: The codebase follows consistent patterns. Domain-specific table and badge components provide correct behavior for their contexts. The standardization items below focus on documenting conformance and addressing specific gaps rather than wholesale rewrites.

---

## Cluster A — Dashboards

### 18-A-01: DashboardPage (Workload Overview) — REFERENCE
- Grammar: Decision Dashboard ✓
- KPI strip ✓, Hero chart ✓, Action table (DataTable) ✓, Data freshness ✓
- Test: DashboardPage.test.tsx ✓

### 18-A-02: PlannedVsActualPage — REBUILT
- Grammar: Decision Dashboard ✓
- KPI strip ✓, Hero chart ✓, Action table (DataTable) ✓, Secondary analysis ✓
- Selectors: planned-vs-actual-selectors.ts ✓
- Test: PlannedVsActualPage.test.tsx (7 tests) ✓

### 18-A-03: EmployeeDashboardPage
- Grammar: Decision Dashboard
- KPI strip ✓
- Hero section: uses `dashboard-main-grid` (employee-specific layout with assignments + evidence)
- Tables: `dash-compact-table` (dashboard-appropriate)
- SectionCard ✓, LoadingState ✓, ErrorState ✓
- Test: EmployeeDashboardPage.test.tsx ✓
- Assessment: Conformant to employee JTBD (E-01 through E-08). The employee dashboard is self-oriented (my assignments, my pulse, my evidence) rather than portfolio-oriented, so the grammar adapts appropriately.

### 18-A-04: ProjectManagerDashboardPage
- Grammar: Decision Dashboard
- KPI strip ✓, Hero chart ✓ (Staffing Coverage)
- Tables: `dash-compact-table` (dashboard-appropriate)
- SectionCard ✓, LoadingState ✓, ErrorState ✓
- Test: ProjectManagerDashboardPage.test.tsx ✓
- Assessment: Answers PM JTBDs (PM-01 through PM-04). Staffing gaps, evidence anomalies, nearing closure all visible.

### 18-A-05: ResourceManagerDashboardPage
- Grammar: Decision Dashboard
- KPI strip ✓, Hero chart ✓
- Tables: `dash-compact-table`
- SectionCard ✓, LoadingState ✓, ErrorState ✓
- Test: ResourceManagerDashboardPage.test.tsx ✓
- Minor: One hex fallback in CSS var (`var(--color-chart-5, #8b5cf6)`) — in baseline

### 18-A-06: HrDashboardPage
- Grammar: Decision Dashboard
- KPI strip ✓, Hero charts ✓ (3 across tabs)
- Tables: `dash-compact-table`
- SectionCard ✓, LoadingState ✓, ErrorState ✓
- Test: HrDashboardPage.test.tsx ✓
- Minor: `#fff` literals in inline risk badges — in token baseline

### 18-A-07: DeliveryManagerDashboardPage
- Grammar: Decision Dashboard
- KPI strip ✓, Hero charts ✓ (Portfolio Health, Evidence Bars)
- Tables: `dash-compact-table`
- SectionCard ✓, LoadingState ✓, ErrorState ✓
- Gap: No test file — NEEDS TEST
- Minor: `#fff` and hex fallbacks in score indicators — in token baseline

### 18-A-08: DirectorDashboardPage
- Grammar: Decision Dashboard
- KPI strip ✓
- Hero section: uses `dashboard-main-grid` (director-specific multi-panel layout)
- Tables: `dash-compact-table`
- SectionCard ✓, LoadingState ✓, ErrorState ✓
- Test: DirectorDashboardPage.test.tsx ✓

### 18-A-09: Dashboard test refresh
- All dashboards have test files except DeliveryManagerDashboardPage
- Existing tests validate KPI rendering, data loading, error states
- PlannedVsActualPage has the most comprehensive dashboard-grammar tests (KPI strip, hero chart, action table, empty/error)

---

## Cluster B — People / Org / Teams

### 18-B-01: PeoplePage (re-exports EmployeeDirectoryPage)
- Grammar: List-Detail Workflow
- PageContainer ✓, FilterBar ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Table: Uses `EmployeeDirectoryTable` domain component (ViewportTable)
- Test: EmployeeDirectoryPage.test.tsx ✓

### 18-B-02: EmployeeDetailsPlaceholderPage (Person 360)
- Grammar: Detail Surface
- PageContainer ✓, SectionCard ✓, TabBar ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Answers "who is this person operationally?" — profile, org, skills, workload, manager, lifecycle
- Gap: No test file — NEEDS TEST

### 18-B-03: EmployeeLifecycleAdminPage
- Grammar: Create/Edit Form
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: EmployeeLifecycleAdminPage.test.tsx ✓

### 18-B-04: OrgPage + ManagerScopePage
- Grammar: Structural Overview / Detail Surface
- Both use PageContainer ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Tests: OrgPage.test.tsx ✓, ManagerScopePage.test.tsx ✓

### 18-B-05: TeamsPage + TeamDashboardPage
- Grammar: List-Detail / Decision Dashboard
- Both use PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- TeamDashboardPage uses `dash-compact-table` for compact tables
- Tests: TeamsPage.test.tsx ✓, TeamDashboardPage.test.tsx ✓

### 18-B-06: People/org/team test coverage
- All have test files ✓ (except EmployeeDetailsPlaceholderPage)

---

## Cluster C — Projects / Assignments

### 18-C-01: ProjectsPage
- Grammar: List-Detail Workflow
- PageContainer ✓, DataTable ✓, StatusBadge ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Best-in-class list page — uses all shared primitives correctly

### 18-C-02: CreateProjectPage
- Grammar: Create/Edit Form
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: CreateProjectPage.test.tsx ✓

### 18-C-03: ProjectDetailsPlaceholderPage
- Grammar: Detail Surface
- PageContainer ✓, SectionCard ✓, TabBar ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- ConfirmDialog ✓ for destructive actions
- Test: ProjectDetailsPage.test.tsx ✓

### 18-C-04: ProjectDashboardPage
- Grammar: Decision Dashboard (subordinate analytic view)
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: ProjectDashboardPage.test.tsx ✓

### 18-C-05: AssignmentsPage
- Grammar: List-Detail Workflow
- PageContainer ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Table: Uses `AssignmentsTable` domain component (ViewportTable)
- Test: AssignmentsPage.test.tsx ✓

### 18-C-06: CreateAssignmentPage + BulkAssignmentPage
- Grammar: Create/Edit Form
- Both use PageContainer ✓, SectionCard ✓, ConfirmDialog ✓
- Tests: CreateAssignmentPage.test.tsx ✓, BulkAssignmentPage.test.tsx ✓

### 18-C-07: AssignmentDetailsPlaceholderPage
- Grammar: Detail Surface
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- ConfirmDialog ✓ for revoke action
- Test: AssignmentDetailsPage.test.tsx ✓

### 18-C-08: Project/assignment test coverage — All have tests ✓

---

## Cluster D — Staffing / Capacity

### 18-D-01: StaffingRequestsPage
- Grammar: Operational Queue
- PageContainer ✓, SectionCard ✓, StatusBadge ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Gap: No test file — NEEDS TEST

### 18-D-02: CreateStaffingRequestPage
- Grammar: Create/Edit Form
- PageContainer ✓, SectionCard ✓, ErrorState ✓
- Gap: Missing EmptyState, LoadingState, no test

### 18-D-03: StaffingRequestDetailPage
- Grammar: Detail Surface
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Gap: No ConfirmDialog on "Cancel Request" (destructive action) — NEEDS FIX
- Gap: No test file

### 18-D-04: StaffingBoardPage
- Grammar: Operational Queue (drag-and-drop)
- PageContainer ✓, ErrorState ✓, LoadingState ✓
- Specialized interaction model (DnD) — grammar adapts appropriately
- Gap: No test file

### 18-D-05: ResourcePoolsPage + ResourcePoolDetailPage
- Grammar: List-Detail Workflow / Detail Surface
- Both use PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Gap: No ConfirmDialog on "Remove" member (destructive) — NEEDS FIX
- Gap: No test files

### 18-D-06: WorkloadMatrixPage + WorkloadPlanningPage
- Grammar: Operational Queue
- Both use PageContainer ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Specialized matrix/timeline visualizations — grammar adapts
- Tests: Both have test files ✓

### 18-D-07: Staffing test coverage
- Tests exist for: WorkloadMatrixPage, WorkloadPlanningPage
- Missing for: StaffingRequestsPage, CreateStaffingRequestPage, StaffingRequestDetailPage, StaffingBoardPage, ResourcePoolsPage, ResourcePoolDetailPage

---

## Cluster E — Time / Evidence / Reports

### 18-E-01: WorkEvidencePage
- Grammar: List-Detail Workflow
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Table: Uses `WorkEvidenceTable` domain component
- Test: WorkEvidencePage.test.tsx ✓

### 18-E-02: TimesheetPage
- Grammar: Create/Edit Form (entry grid)
- PageContainer ✓, ErrorState ✓, LoadingState ✓
- Specialized grid interaction — grammar adapts
- Test: TimesheetPage.test.tsx ✓

### 18-E-03: TimesheetApprovalPage
- Grammar: Operational Queue
- PageContainer ✓, ErrorState ✓, LoadingState ✓
- Uses local `getStatusBadgeClass` instead of shared StatusBadge
- Test: TimesheetApprovalPage.test.tsx ✓

### 18-E-04: LeaveRequestPage
- Grammar: List-Detail Workflow
- PageContainer ✓, SectionCard ✓, ErrorState ✓, LoadingState ✓
- Test: LeaveRequestPage.test.tsx ✓

### 18-E-05: Report surfaces (5 pages)
- All use PageContainer ✓, ErrorState ✓
- SectionCard on most, LoadingState on most
- Gap: No tests for TimeReportPage, UtilizationPage, ReportBuilderPage
- ReportBuilderPage also missing ErrorState, LoadingState

### 18-E-06: Time/evidence test coverage
- Tests exist for: WorkEvidencePage, TimesheetPage, TimesheetApprovalPage, LeaveRequestPage, CapitalisationPage, ExportCentrePage
- Missing for: TimeReportPage, UtilizationPage, ReportBuilderPage

---

## Cluster F — Cases / Exceptions / Governance

### 18-F-01: CasesPage
- Grammar: Operational Queue
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: CasesPage.test.tsx ✓

### 18-F-02: CreateCasePage
- Grammar: Create/Edit Form
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: CreateCasePage.test.tsx ✓

### 18-F-03: CaseDetailsPage
- Grammar: Detail Surface (step-progression workspace)
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: CaseDetailsPage.test.tsx ✓

### 18-F-04: ExceptionsPage
- Grammar: Operational Queue
- PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: ExceptionsPage.test.tsx ✓

### 18-F-05: IntegrationsPage
- Grammar: Admin Control
- PageContainer ✓, SectionCard ✓, ErrorState ✓, LoadingState ✓
- Test: IntegrationsPage.test.tsx ✓

### 18-F-06: Case/exception test coverage — All have tests ✓

---

## Cluster G — Admin / Operator

### 18-G-01: AdminPanelPage
- Gateway surface: PageContainer ✓, SectionCard ✓, EmptyState ✓, ErrorState ✓, LoadingState ✓
- Test: AdminPanelPage.test.tsx ✓

### 18-G-02: Config pages (Dictionaries, MetadataAdmin, Settings, BulkImport, AccessPolicies)
- All use PageContainer ✓
- DictionariesPage, MetadataAdminPage, SettingsPage: SectionCard ✓, ErrorState ✓, LoadingState ✓, Test ✓
- BulkImportPage: SectionCard ✓, ErrorState ✓, missing LoadingState — NEEDS TEST
- AccessPoliciesPage: minimal — NEEDS LoadingState, ErrorState, EmptyState, TEST

### 18-G-03: Oversight pages (Audit, Notifications, IntegrationsAdmin, Monitoring, Webhooks, HRIS)
- BusinessAuditPage, NotificationsPage, IntegrationsAdminPage, MonitoringPage: All primitives ✓, Tests ✓
- WebhooksAdminPage: minimal — NEEDS LoadingState, ErrorState, EmptyState, TEST
- HrisConfigPage: minimal — NEEDS LoadingState, ErrorState, EmptyState, TEST

### 18-G-04: Canonical primitive usage across admin
- All admin pages use PageContainer ✓
- Most use SectionCard ✓
- Token compliance: passes `tokens:check` ✓

### 18-G-05: Admin test coverage
- Tests exist for: AdminPanelPage, DictionariesPage, BusinessAuditPage, SettingsPage, NotificationsPage, IntegrationsAdminPage, MonitoringPage, MetadataAdminPage
- Missing for: BulkImportPage, AccessPoliciesPage, WebhooksAdminPage, HrisConfigPage

---

## Cluster H — Auth / Account

### 18-H-01: Auth pages (Login, ForgotPassword, ResetPassword, 2FA)
- Use MUI-based standalone card layout (appropriate for auth entry surfaces)
- Inline error handling via MUI `Alert` component
- Clear next-step guidance (links between login/forgot-password/reset)
- No shared primitives used (by design — auth is pre-shell)
- Gap: No test files

### 18-H-02: AccountSettingsPage
- PageContainer ✓, SectionCard ✓, ErrorState ✓
- Password change, notification preferences, appearance controls
- Gap: Missing LoadingState, no test file

### 18-H-03: Auth/account test coverage
- No test files exist for any auth page or AccountSettingsPage

---

## Cross-cutting (Cluster X)

### 18-X-01: Route-and-role verification
- route-manifest.test.tsx provides comprehensive parity testing (39 tests)
- Covers visible-but-forbidden, forbidden-but-visible, all 7 persona smoke paths
- No new mismatches introduced by Phase 18 standardization work

### 18-X-02: Playwright cluster smoke coverage
- E2E specs tagged @smoke/@critical/@full already exist for all critical paths
- Dashboard, staffing, timesheet, exceptions, admin settings all covered

### 18-X-03: Page standardization changelog
- This file serves as the changelog
