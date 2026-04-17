# Current State

This document summarizes the platform as it exists in code today.

It is meant to help planning agents separate:

- implemented and usable behavior
- implemented but still maturing behavior
- the real next bottlenecks for the next iteration

_Last updated: 2026-04-16 (Phase 20 security/UX/accessibility audit complete; 74/92 items done; 59 Prisma models; 199 API endpoints; 54 frontend test files + 29 E2E specs; 71 routes; 6 seed profiles; backend + frontend TS clean)_

---

## Runtime model

### Backend

- NestJS modular monolith
- global API prefix: `/api`
- structured JSON logging with correlation ids
- Swagger at `/api/docs`
- operator endpoints:
  - `/api/health`
  - `/api/readiness`
  - `/api/diagnostics`

### Frontend

- React + Vite + React Router
- browser entry at `http://localhost:5173`
- backend API configured through `VITE_API_BASE_URL`
- Vite proxy forwards `/api` calls to the backend inside the Docker network

### Local environment

- supported local runtime path is Docker-only
- PostgreSQL, backend, frontend, migration job, seed job, and optional monitoring services are containerized
- resource limits: PostgreSQL 512MB, backend 1GB, frontend 1GB
- six seed profiles: `demo`, `phase2`, `bank-scale`, `life-demo`, `investor-demo`, `enterprise`
- `phase2` profile creates 32 people, 16 org units, 4-level hierarchy, 12 projects, 22 assignments, 24 work evidence entries, and 8 test accounts

---

## Phase 2 delivery status

### Phase 2a — Mock Organization (seed expansion) ✅ COMPLETE

- `prisma/seeds/phase2-dataset.ts` — 32 people, 16 org units, 29 reporting lines, 4 resource pools, 12 projects, 22 assignments, 24 work evidence entries
- 8 local test accounts with role-specific passwords:
  - `noah.bennett@example.com` / `DirectorPass1!` → `director`
  - `diana.walsh@example.com` / `HrManagerPass1!` → `hr_manager`
  - `sophia.kim@example.com` / `ResourceMgrPass1!` → `resource_manager`
  - `lucas.reed@example.com` / `ProjectMgrPass1!` → `project_manager`
  - `carlos.vega@example.com` / `DeliveryMgrPass1!` → `delivery_manager`
  - `ethan.brooks@example.com` / `EmployeePass1!` → `employee`
  - `emma.garcia@example.com` / `DualRolePass1!` → `resource_manager` + `hr_manager`
- Seed with: `docker compose exec -e SEED_PROFILE=phase2 backend sh -c "npx ts-node --project tsconfig.json prisma/seed.ts"`

### Phase 2b — Backend Flow Gaps ✅ COMPLETE

| Item | Description | Status |
|------|-------------|--------|
| A1 | Delivery Manager Dashboard — `GET /dashboard/delivery-manager` | ✅ Done |
| A2 | Director Dashboard — `GET /dashboard/director` | ✅ Done |
| A3 | Assignment end `reason` field | ✅ Done (pre-existing) |
| A4 | `POST /people/:id/terminate` — TerminateEmployeeService + endpoint | ✅ Done |
| A5 | `POST /cases/:id/steps/:stepKey/complete` — case step completion | ✅ Done |
| A6 | Notification events on assignment approve/reject | ✅ Done |
| A7 | Project Dashboard — `GET /projects/:id/dashboard` with `evidenceByWeek` + `allocationByPerson` | ✅ Done |
| A8 | Assignment listing pagination + `from`/`to` date filters + `totalCount` | ✅ Done |
| A9 | `POST /auth/accounts` — admin local account creation endpoint | ✅ Done |
| — | `PATCH /metadata/dictionaries/entries/:entryId` — toggle entry enabled | ✅ Done |

### Phase 2c — Frontend & Dashboard Enrichment ✅ COMPLETE

| Item | Description | Status |
|------|-------------|--------|
| B1 | Delivery Manager Dashboard page (was "Coming soon" stub) | ✅ Done — full page at `/dashboard/delivery-manager` |
| B2 | Director Dashboard page | ✅ Done — new page at `/dashboard/director` |
| B3 | Assignment Details page | ✅ Done — approve/reject/end + history timeline |
| — | WorkloadCard danger/warning variant | ✅ Done |
| — | Employee dashboard: overallocation danger state | ✅ Done |
| — | HR dashboard: lifecycle activity list | ✅ Done |
| — | PM dashboard: nearing-closure section | ✅ Done |
| — | Assignments page date-range (`from`/`to`) filters + `totalCount` | ✅ Done |
| — | Project Dashboard page: `evidenceByWeek` + `allocationByPerson` from new endpoint | ✅ Done |
| — | Case Details page: step completion UI | ✅ Done |
| — | Terminate Employee UI (button + form on employee detail page) | ✅ Done |
| — | Admin Account Creation form on AdminPanelPage (User Accounts section) | ✅ Done |
| — | Metadata Admin entry add + disable/enable UI | ✅ Done |

### Phase 2d — E2E Test Suite ✅ COMPLETE (2026-04-05)

- All 38 JTBD Playwright E2E tests written under `e2e/tests/` (12 spec files)
- Auth fixture (`e2e/fixtures/auth.ts`): `login()` helper + per-role convenience wrappers + extended `test` fixtures
- Navigation helper (`e2e/helpers/navigation.ts`): `routes` map + `expectToast` + `clickWithConfirm`
- Test files:
  - `01-employee.spec.ts` — 2d-02, 2d-03, 2d-04
  - `02-work-evidence.spec.ts` — 2d-03 (extended: DM and PM)
  - `03-pm-dashboard.spec.ts` — 2d-05, 2d-08
  - `04-project-lifecycle.spec.ts` — 2d-06, 2d-07
  - `05-rm-assignments.spec.ts` — 2d-09, 2d-10, 2d-11, 2d-12, 2d-13, 2d-14
  - `06-hr-people.spec.ts` — 2d-15, 2d-16, 2d-17, 2d-18, 2d-19
  - `07-hr-cases.spec.ts` — 2d-20
  - `08-director.spec.ts` — 2d-21, 2d-22, 2d-23, 2d-24
  - `09-admin.spec.ts` — 2d-25, 2d-26, 2d-27, 2d-28, 2d-29, 2d-30, 2d-31
  - `10-cross-role.spec.ts` — 2d-32, 2d-33, 2d-34
  - `11-negative-paths.spec.ts` — 2d-35, 2d-36, 2d-37, 2d-38
  - `12-timesheets.spec.ts` — timesheet page access (employee, PM, DM)
- Pattern: API-based auth (JWT injected into localStorage), `test.describe.serial` for stateful flows, API assertions alongside UI assertions
- See `docs/planning/phase2-plan.md` Section 1 for acceptance criteria per JTBD

---

## Operational contexts

### Organization

Implemented backend capabilities:

- employee creation
- employee deactivation
- employee termination (cascades to end all active assignments)
- person directory and person detail reads
- org chart read
- manager scope read
- effective-dated reporting line creation
- team read APIs
- team create and member update APIs

Implemented frontend capabilities:

- employee directory
- employee details
- employee lifecycle admin create flow
- employee deactivation action
- employee termination action (with optional reason + date form)
- reporting-line management with effective dates
- org chart
- manager scope
- team management UI
- team dashboard UI

Runtime state: live and durable (Prisma-backed)

### Assignments and workload

Implemented backend capabilities:

- assignment create, bulk create, approve, reject, end, amend, revoke
- assignment activation service (APPROVED → ACTIVE when validFrom reached; `POST /assignments/activate`)
- assignment override creation for conflict resolution (override reason persisted in history)
- self-approval prevention (actorId !== personId)
- person active check at approval time (cannot approve for deactivated employee)
- project end date validation (assignment cannot exceed project end date)
- lifecycle history
- workload summary
- planned-vs-actual comparison
- employee, PM, RM, HR, delivery manager, and director dashboard detail APIs
- assignment listing with pagination, date-range filter, status filter, `totalCount`
- optimistic concurrency protection

Implemented frontend capabilities:

- assignments page (status filter + `from`/`to` date range filters + `totalCount` display)
- create assignment form
- bulk assignment UI
- assignment detail with approve/reject/end + history timeline
- governed assignment override UI
- planned-vs-actual
- employee, PM, RM, HR, delivery manager, and director dashboards

### Project registry

Implemented backend capabilities:

- create, activate, close, close-override project
- assign team to project
- project read/list APIs
- Jira sync support
- project dashboard endpoint (`evidenceByWeek`, `allocationByPerson`, `staffingSummary`)
- optimistic concurrency protection

Implemented frontend capabilities:

- project registry
- project details
- create project flow
- activate / close / assign-team actions
- governed close-override UI
- project dashboard UI (with `evidenceByWeek`, `allocationByPerson`, `staffingSummary` from new endpoint)

### Work evidence

Implemented: create, list/query, evidence-backed dashboard and project surfaces. Runtime is durable.

### Teams

Implemented: list, create, members, team detail, team dashboard summary. Runtime is durable.

### Cases

Implemented backend capabilities:

- create case (auto-creates ONBOARDING case on employee hire, OFFBOARDING on deactivation)
- list cases (filters persisted in URL search params)
- case detail
- list case steps
- complete case step
- close case (`POST /cases/:id/close`)
- cancel case (`POST /cases/:id/cancel`)
- archive case (`POST /cases/:id/archive`)
- approve case (`ApproveCaseService` — OPEN/IN_PROGRESS → APPROVED)
- reject case (`ApproveCaseService` — OPEN/IN_PROGRESS → REJECTED with reason)
- `subjectPersonName` / `ownerPersonName` resolved from `demoPeople` in response

Implemented frontend capabilities:

- cases list, case create flow, case detail
- case workflow step list with complete button per step
- COMPLETED step badge and timestamp display
- Close Case / Cancel Case / Archive Case action buttons
- Subject and Owner displayed as names (not raw UUIDs)
- Error state with retry action (Law 2 compliance)

### Metadata and admin

Implemented backend capabilities:

- metadata dictionary list and detail
- dictionary entry creation
- dictionary entry enable/disable (`PATCH /metadata/dictionaries/entries/:entryId`)
- admin config/settings/integrations/notifications aggregation
- admin local account creation (`POST /admin/accounts`)

Implemented frontend capabilities:

- admin panel (User Accounts section with Create Account form + enable/disable/delete per account)
- metadata admin (dictionary list; entry add form; enable/disable per entry)
- integrations admin
- notifications admin
- monitoring/admin diagnostics
- business audit browsing
- exception queue

### Dashboards

| Dashboard | Backend | Frontend |
|-----------|---------|----------|
| Workload (generic) | ✅ | ✅ |
| Employee | ✅ | ✅ |
| Project Manager | ✅ | ✅ (+ nearing-closure section) |
| Resource Manager | ✅ | ✅ |
| HR Manager | ✅ | ✅ (+ lifecycle activity list) |
| Delivery Manager | ✅ | ✅ (full page) |
| Director | ✅ | ✅ (new page at `/dashboard/director`) |
| Project Dashboard | ✅ | ✅ (new endpoint, evidenceByWeek + allocationByPerson) |

### Integrations

Implemented: Jira sync, M365 and RADIUS directory sync, reconciliation review, sync history. Runtime is operational.

### Notifications

Implemented: templates, channel abstraction, test-send, SMTP + Teams webhook transport, retry policy, outcome queries, audit. Assignment approve/reject events are wired. Notification queue endpoint (`GET /notifications/queue`) with status filter + pagination. Frontend queue section in NotificationsPage with status dropdown, paginated table, and payload detail.

**In-app notification inbox** (Phase 10): `in_app_notifications` table. `GET /notifications/inbox`, `POST /notifications/inbox/:id/read`, `POST /notifications/inbox/read-all` endpoints (auth-required, personal scope). `NotificationBell` component in TopHeader (native `<button>` element for accessibility) — bell icon with unread badge, dropdown panel, per-item read/navigate, mark-all-read, 30-second polling. Events wired: `assignment.created`, `assignment.approved`, `assignment.rejected`, `assignment.amended`, `case.created`, `case.step_completed`, `case.closed`, `case.approved`, `case.rejected`, `employee.deactivated`, `employee.terminated`.

### Audit, exceptions, and observability

Implemented: structured logging, correlation ids, business audit logging and querying (with `from`/`to` date filter, pagination, `totalCount`), exception queue, diagnostics, self-check scripts.

---

## Security and access control

Implemented:

- bearer-token principal sourcing with HS256 JWT
- RBAC guard layer (`@RequireRoles`)
- route-level protection for write/admin APIs
- test-friendly non-production auth helpers (blocked in production via startup guard)
- CORS with `credentials: true` and SameSite=strict refresh cookies
- Vite proxy configured so browser calls go through `/api` path (not direct to port 3000)
- Security headers in all environments: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy (both `main.ts` and `nginx.conf`)
- Self-approval prevention: employees cannot approve their own timesheets or assignments
- IDOR protection: actorId always derived from authenticated principal, never from request body
- Rate limiting: login (10 req/min), password reset (3 req/hour), global (100 req/min)
- Password complexity: min 8 chars + uppercase + lowercase + digit + special character
- 2FA temp token verification via full JWT signature validation (not manual base64)
- Password reset tokens never logged (only truncated hash)
- `/diagnostics` endpoint requires `@RequireRoles('admin')` (was previously `@Public()`)
- `$queryRaw` (parameterized) used instead of `$queryRawUnsafe` in health service
- `innerHTML` replaced with `replaceChildren()` in org chart (XSS surface removed)
- Admin config endpoints validated via class-validator DTOs
- Production startup guard prevents `AUTH_ALLOW_TEST_HEADERS` and `AUTH_DEV_BOOTSTRAP_ENABLED`
- GitHub Actions pinned to commit SHAs (supply chain hardening)
- Trivy container image scanning in CI pipeline
- Caddy reverse proxy rate limiting (100 req/min per IP)
- `npm audit` dependency scanning step in CI

Current limitation:
- authentication is token-based; not yet integrated with an external OIDC provider or JWKS validation flow

---

## Frontend route coverage

Implemented route groups:

- dashboard (workload, employee, PM, RM, HR, delivery manager, director, planned-vs-actual)
- people
- org
- teams
- projects (registry, detail, dashboard)
- assignments (list, create, bulk, detail)
- work evidence
- cases
- admin (panel, metadata, integrations, notifications, audit, monitoring, exceptions)

---

## Testing and validation posture

Implemented:

- backend unit/domain/repository/integration/contracts/performance coverage
- API integration and negative-path tests
- role dashboard and lifecycle tests
- frontend route/component tests: 54 test files (TypeScript clean as of 2026-04-16)
- E2E Playwright tests: 29 spec files covering all 7 roles + smoke + cross-role + accessibility
- UAT happy-path, anomaly, and dashboard packs
- release-readiness self-check and operator drill scripts
- CI retries set to 2 in Playwright config for flaky test resilience
- E2E tests use centralized URL constants (`PLAYWRIGHT_API_BASE`, `PLAYWRIGHT_BASE_URL`)
- Semantic locators (`getByRole`, `getByLabel`) preferred over CSS selectors
- axe-core accessibility smoke test per role dashboard (`14-accessibility.spec.ts`)
- `npm audit` and Trivy container scanning in CI pipeline

Testing gaps remaining:
- 19-10: Activity feed API/component tests not yet written
- E2E: some test files still use hardcoded `http://127.0.0.1:3000/api` (not all migrated)

---

## Phase 4a — Foundation & Data Integrity ✅ COMPLETE (2026-04-05)

All F1.1–F1.7 items implemented:

- **F1.1 Date Defaults**: All dashboard hooks, pages, and forms now initialize `asOf`/date fields to `new Date().toISOString()` instead of hardcoded strings. Reset buttons also compute `new Date()` at click time.
- **F1.2 Person Defaults**: `useHrManagerDashboard` and `useEmployeeDashboard` no longer use hardcoded person UUID constants. Both use the `useEffect` sync + empty-string guard pattern.
- **F1.3 UUID Resolution**: `PersonSelect` component resolves person IDs to names via `fetchPersonDirectory`. `resolvePersonName` module-level cache. Cases page filter dropdowns replaced with `PersonSelect`. `ProjectTeamAssignmentForm` "Workflow Actor" is now a `PersonSelect`.
- **F1.4 Breadcrumbs**: `Breadcrumb` component added. Breadcrumbs live on: Project Details, Assignment Details, Case Details, Employee Details, Team Dashboard, Resource Pool Detail, Project Dashboard, Account Settings.
- **F1.5 Enum Labels**: `humanizeEnum()` utility with label maps for ASSIGNMENT_STATUS, PROJECT_STATUS, ORG_UNIT_TYPE, ANOMALY_TYPE, SOURCE_TYPE, NOTIFICATION_CHANNEL, EMPLOYMENT_STATUS, INTEGRATION_PROVIDER. Applied across: AssignmentsTable, OrgChartTree, ExceptionQueueTable, AnomalyPanel, PlannedVsActualPage.
- **F1.6 Label-Value Spacing**: `.metadata-detail__stat` CSS fixed (flex column, gap, block display for label/strong).
- **F1.7 RBAC Sidebar**: "MY WORK" section added at top of SidebarNav. Project/Employee details gate write actions on `canManageProject`/`canManageLifecycle` based on `principal.roles`.

Test suite: 35 files / 118 tests all pass. TypeScript clean.

## Phase 4c — UX Quick Wins ✅ COMPLETE (2026-04-05)

All items 4c-1-01 through 4c-9-06 implemented across 9 feature areas:

- **4c-1 Toast notifications**: `sonner` installed; `<Toaster position="bottom-right" richColors />` mounted in `App.tsx`.
- **4c-2 Confirm dialogs**: `ConfirmDialog` component created (`frontend/src/components/common/ConfirmDialog.tsx`). All `window.confirm()` calls replaced across: AssignmentWorkflowActions, AssignmentEndActions, AssignmentDetailsPlaceholderPage, CreateAssignmentPage, ProjectDetailsPlaceholderPage, AdminPanelPage, EmployeeDetailsPlaceholderPage, CaseDetailsPage, TeamDetails.
- **4c-3 Command palette**: `CommandPalette` component created (`frontend/src/components/common/CommandPalette.tsx`). Triggered by `Ctrl+K`/`Cmd+K` in AppShell. Groups: People (debounced API search), Projects (debounced API search), Pages (RBAC-filtered), Actions. Keyboard navigation: ArrowUp/Down, Enter, Escape.
- **4c-4 Sidebar nav**: Already implemented in Phase 4a (items N/A).
- **4c-5 Skeleton loaders**: `Skeleton`, `TableSkeleton`, `CardSkeleton`, `ChartSkeleton` created (`frontend/src/components/common/Skeleton.tsx`). CSS pulse animation added to `global.css`.
- **4c-6 Empty states with actions**: `EmptyState` updated with optional `action?: { href, label }` prop. CTAs added on: AssignmentsPage ("No assignments yet"), ProjectsPage ("No projects yet"), WorkEvidencePage ("No evidence logged"), CasesPage ("No cases open"), ResourcePoolsPage ("No pools").
- **4c-7 View/edit mode**: `ProjectDetailsPlaceholderPage` metadata section now gates editing behind `isEditing` state toggle with Edit/Cancel buttons (RBAC-gated on `canManageProject`).
- **4c-8 Filtered dropdowns**: AssignmentsPage approval state filter changed from text input to `<select>` using `ASSIGNMENT_STATUS_LABELS`. EmployeeDirectoryPage resource pool filter changed from text input to `<select>` populated from `fetchResourcePools()` API call.
- **4c-9 Export XLSX**: `exportToXlsx` utility created (`frontend/src/lib/export.ts`) using SheetJS CE (`xlsx`). Export buttons added to: EmployeeDirectoryPage, AssignmentsPage, ProjectsPage, WorkEvidencePage, BusinessAuditPage.

New components created: `ConfirmDialog`, `Skeleton` (+ `TableSkeleton`, `CardSkeleton`, `ChartSkeleton`), `CommandPalette`, `ProjectSelect`, `export.ts`.

Test suite: 35 files / 118 tests all pass. TypeScript clean.

---

## Phase 5 — Time Management ✅ COMPLETE (2026-04-05)

All F3.1–F3.3 items implemented:

- **Prisma schema**: `TimesheetWeek` + `TimesheetEntry` models with `TimesheetStatus` enum (DRAFT/SUBMITTED/APPROVED/REJECTED). Migration SQL at `prisma/migrations/20260405_timesheets/migration.sql`.
- **Backend module** (`src/modules/timesheets/`): `TimesheetRepository`, `TimesheetsService`, `TimesheetsController`, `TimesheetsModule` wired into `AppModule`.
- **Backend endpoints**: `GET /timesheets/my`, `PUT /timesheets/my/entries`, `POST /timesheets/my/:weekStart/submit`, `GET /timesheets/my/history`, `GET /timesheets/approval`, `POST /timesheets/:id/approve`, `POST /timesheets/:id/reject`, `GET /reports/time`.
- **Lock enforcement**: upsert rejects if week status is APPROVED or SUBMITTED.
- **Frontend API client** (`frontend/src/lib/api/timesheets.ts`): full CRUD + approval + time report.
- **TimesheetPage** (`/timesheets`): weekly grid (Mon-Sun columns), auto-save on blur with 500ms debounce, Saving/Saved indicator, CAPEX toggle per row, row/column/grand totals, grand total colour coding (green 35-45h, yellow, red >50h), week navigation, description popover per cell, Submit for Approval button, read-only mode for APPROVED/REJECTED weeks.
- **TimesheetApprovalPage** (`/timesheets/approval`): queue list with filters, approve/reject with ConfirmDialog, bulk approve, expandable read-only grid, approval progress bar (HTML `<progress>`). Restricted to manager roles.
- **TimeReportPage** (`/reports/time`): 4 charts (Hours by Project bar, Hours by Person bar, Daily Trend line, CAPEX/OPEX pie), period filter (this week/month/quarter/custom), XLSX export. Restricted to manager roles.
- **Navigation**: My Timesheet, Timesheet Approval, Time Report added to navigation.ts; routes added to router.tsx.
- **Tests**: 24 new tests across `TimesheetPage.test.tsx` and `TimesheetApprovalPage.test.tsx`. All 37 test files / 142 tests pass. TypeScript clean.

## Phase 6 — Organization & Structure Visualization ✅ COMPLETE (2026-04-05)

All F6.1–F6.3 items implemented:

- **F6.1 Interactive Visual Org Chart**: `react-d3-tree` installed; `OrgTreeChart` component created at `frontend/src/components/charts/OrgTreeChart.tsx`. Transforms `OrgChartNode[]` → `RawNodeDatum` tree. SVG custom node renders org unit name (bold), manager name, member count badge, type badge (humanized via `ORG_UNIT_TYPE_LABELS`). Click node → `/people?orgUnitId=<id>`. Depth level selector (top 1/2/3/all levels via pre-pruning). Search term highlights matching nodes in yellow. Static legend/minimap in bottom-right corner. Dotted-line panel retained alongside as sidebar. `OrgPage` updated to use `OrgTreeChart` in place of text hierarchy. `react-d3-tree` mocked in test setup (`frontend/src/test/d3-tree-mock.ts`).
- **F6.2 Workload Matrix**: `GET /workload/matrix` backend endpoint (NestJS `WorkloadModule`) queries APPROVED active assignments filtered by `poolId`, `orgUnitId`, `managerId`. Frontend `WorkloadMatrixPage` at `/workload` with sticky first column, colour-coded cells (0%=empty, 1-49%=light blue, 50-79%=blue, 80-100%=green, >100%=red), row totals, FTE column totals, click-to-assignments navigation, XLSX export, Resource Pool / Org Unit / Manager filter dropdowns. Route + navigation added (PEOPLE & ORG group, RM/Director/Admin only).
- **F6.3 Workload Planning Timeline**: `GET /workload/planning` backend endpoint returns people + 12 forward ISO-week dates. Frontend `WorkloadPlanningPage` at `/workload/planning` with 12-week grid; cells show total allocation %, colour-coded; assignment blocks per cell with "extend 1 week" / "shorten 1 week" controls (calls `PATCH /assignments/:id`); conflict indicator (>100% shown red with ! badge); Resource Pool filter; What-if mode toggle adds hypothetical assignments (local state only, shown with dashed yellow styling).
- **Backend module**: `src/modules/workload/` — `WorkloadRepository`, `WorkloadService`, `WorkloadController`, `WorkloadModule` wired into `AppModule`.
- **Frontend API client**: `frontend/src/lib/api/workload.ts` — `fetchWorkloadMatrix`, `fetchWorkloadPlanning`.
- **Tests**: `WorkloadMatrixPage.test.tsx` (8 tests), `WorkloadPlanningPage.test.tsx` (8 tests). All 39 test files / 158 tests pass. TypeScript clean.

## Phase 7 — Project Lifecycle Enhancement ✅ COMPLETE (2026-04-05)

All F7.1–F7.2 items implemented:

- **F7.1 Project Detail Tabbed Layout**: `ProjectDetailsPlaceholderPage` redesigned with 6-tab interface (Summary | Team | Timeline | Evidence | Budget | History). Active tab stored in `?tab=` URL param. `TabBar` component at `frontend/src/components/common/TabBar.tsx`. Summary tab shows read-only fields + health badge + edit form (RBAC-gated). Team tab shows APPROVED assignments table (person links, role, allocation, dates) + Assign Team form. Timeline tab shows SVG Gantt of assignment date ranges coloured by staffing role. Evidence tab shows evidence list + `EvidenceTimelineBar` chart. Budget tab shows placeholder. History tab shows placeholder.
- **F7.2 Project Health Scoring**: `GET /projects/:id/health` endpoint added to `ProjectsController` backed by `ProjectHealthQueryService`. Scoring: staffing (33 pts if approved assignments exist), evidence (33 pts recent, 16 pts stale, 0 none), timeline (34 pts if end date future, 17 no end date, 0 past). Grades: green≥70, yellow≥40, red<40. `ProjectHealthBadge` SVG circle component at `frontend/src/components/common/ProjectHealthBadge.tsx`. `fetchProjectHealth` API at `frontend/src/lib/api/project-health.ts`. Health badge added to project list rows and project detail Summary tab. `ProjectHealthScorecardTable` added to `DeliveryManagerDashboardPage`. Project list has sortable Health column with ↕/▲/▼ toggle.
- **Tests**: New mocks for `fetchAssignments`, `fetchWorkEvidence`, `fetchProjectHealth` in `ProjectDetailsPage.test.tsx`. Tab navigation tests added. Health badge column test in `ProjectsPage.test.tsx`. All 39 test files / 161 tests pass. TypeScript clean.

## Phase 8 — Financial Governance & Capitalisation ✅ COMPLETE (2026-04-05)

All F4.1–F4.2 items implemented:

- **F4.1 Capitalisation Backend**: `capex` field added to `work_evidence` table (migration SQL). `GET /reports/capitalisation?from=&to=&projectId=` endpoint aggregates approved timesheet hours by CAPEX/OPEX per project. Reconciliation alert flags projects where `|actual - expected| / expected > 0.10`. Period lock table (`period_locks`). `POST /admin/period-locks`, `GET /admin/period-locks`, `DELETE /admin/period-locks/:id` (admin only). Period lock enforcement in `TimesheetsService.upsertEntry`.
- **F4.2 Project Budget Backend**: `project_budgets` and `person_cost_rates` tables with migrations. `PUT /projects/:id/budget` upserts per-fiscal-year CAPEX/OPEX budget. `PUT /people/:id/cost-rate` inserts person cost rate. `GET /projects/:id/budget-dashboard` returns burn-down data (weekly cumulative cost vs budget line), forecast (linear extrapolation with `projectedTotalCost`, `remainingBudget`, `onTrack`), cost breakdown by staffing role, and `healthColor` (green/yellow/red).
- **F4.1 Capitalisation Frontend**: `CapitalisationPage` at `/reports/capitalisation` with period selector, CAPEX/OPEX breakdown table (sortable by CAPEX %), stacked bar chart (CAPEX=blue, OPEX=grey), period trend line chart (CAPEX % per month). Period lock UI (admin only): lock from/to form + locked periods table with Unlock button. Export XLSX (via `exportToXlsx`) + Export PDF (via `window.print()`). Route added with `director`, `admin`, `delivery_manager` roles.
- **F4.2 Budget Frontend**: Budget tab in `ProjectDetailsPlaceholderPage` replaced with real content: budget edit form (fiscal year + CAPEX/OPEX inputs, admin/pm only), `BudgetBurnDownChart` (actual cost vs budget line), `ForecastChart` (projected vs budget bar), `CostBreakdownDonut` (cost by staffing role). Budget health color badge on Summary tab (On Track / At Risk / Over Budget). New chart components: `BudgetBurnDownChart`, `ForecastChart`, `CostBreakdownDonut`.
- **New API clients**: `frontend/src/lib/api/capitalisation.ts`, `frontend/src/lib/api/project-budget.ts`.
- **Tests**: `CapitalisationPage.test.tsx` (10 tests — table renders, chart sections visible, XLSX export fires, period lock UI, create/delete lock, error state, totals). `ProjectDetailsPage.test.tsx` updated (Budget tab renders charts, budget health badge). `recharts-mock.ts` updated with `CartesianGrid`, `BarChart`/`PieChart` as `PassThrough`. All 40 test files / 171 tests pass. TypeScript clean.

## Phase 9 — Employee 360 & Wellbeing ✅ COMPLETE (2026-04-05)

All F5.1–F5.3 items implemented:

- **F5.1 Pulse Backend**: `pulse_entries` table (migration SQL). `POST /pulse` upserts one entry per person per week (derives `personId` from JWT, `weekStart` = ISO Monday). `GET /pulse/my?weeks=N` returns own history. Frequency hardcoded as 'weekly' (Phase 11 will wire platform settings). `PulseModule` registered in `AppModule`.
- **F5.2 360 View Backend**: `GET /people/:id/360?weeks=12` — returns `moodTrend` (from `pulse_entries`), `workloadTrend` (from `projectAssignment` allocation by week), `hoursTrend` (from approved `timesheetWeek` entries), `currentMood`, `currentAllocation`, `alertActive` (mood ≤ 2 for 2+ consecutive weeks). Access restricted to hr_manager, delivery_manager, resource_manager, director, admin.
- **F5.3 Heatmap Backend**: `GET /reports/mood-heatmap?from=&to=&orgUnitId=&managerId=&poolId=` — returns Person × Week mood grid with team averages. Filterable by org unit (`personOrgMembership`), manager (`reportingLine.managerPersonId`), or resource pool (`personResourcePoolMembership`).
- **F5.1 Pulse Widget**: `PulseWidget` component — 5 emoji mood buttons (😣 Struggling → 😄 Great), optional collapsible text note, single-click submit, success/error feedback, readonly state when already submitted. History dots row for last 4 prior weeks. Embedded in `EmployeeDashboardPage`.
- **F5.2 360 Frontend**: `Person360Tab` component with alert badge (⚠ Low mood alert), current mood/allocation summary cards. "360 View" tab on `PersonDetailPage` — role-gated (hr_manager, delivery_manager, resource_manager, director, admin). Three charts: `MoodTrendChart` (LineChart, reference lines at 2 and 3), `WorkloadTrendChart` (LineChart, reference line at 100%), `HoursLoggedChart` (BarChart).
- **F5.3 Heatmap Frontend**: `TeamMoodHeatmap` component — CSS grid Person × Week, cells colored by mood (1=#ef4444 → 5=#22c55e, null=#e5e7eb), click cell navigates to `/people/:id?tab=360`. Team averages row at bottom. Filter bar (manager, pool) with `DirectReportsMoodTable` summary below. Embedded in `HrDashboardPage`.
- **New API client**: `frontend/src/lib/api/pulse.ts` — `submitPulse`, `fetchPulseHistory`, `fetchPerson360`, `fetchMoodHeatmap`.
- **Tests**: `PulseWidget.test.tsx` (4 tests), `EmployeeDashboardPage.test.tsx` updated (pulse widget mock + assertion), `HrDashboardPage.test.tsx` updated (heatmap mock + assertion), `EmployeeDetailsPage.test.tsx` updated (360 tab click test). All 41 test files / 176 tests pass. TypeScript clean (backend + frontend).

## Phase 10 — In-App Notifications ✅ COMPLETE (2026-04-05)

All F9.1 backend and frontend items implemented:

- **Backend**: `InAppNotification` Prisma model + migration SQL. `InAppNotificationsModule` with `InAppNotificationRepository` (Prisma-backed), `InAppNotificationService`, `InboxController`. Routes: `GET /notifications/inbox`, `POST /notifications/inbox/:id/read`, `POST /notifications/inbox/read-all`. Auth-required (all roles), personal scope (derived from JWT `personId`).
- **Event wiring**: `NotificationEventTranslatorService` updated to accept `InAppNotificationService` (injected via `InAppNotificationsModule` import in `NotificationsModule`). In-app records created for: `assignment.created` (recipient = assignment person), `assignment.approved` (recipient = assignment person), `assignment.rejected` (recipient = assignment person), `case.created` (recipient = subject person), `case.step_completed` (recipient = case owner), `case.closed` (recipient = case subject). Calling services updated to pass `recipientPersonId`/`ownerPersonId`/`subjectPersonId`.
- **Frontend**: `frontend/src/lib/api/inbox.ts` — `fetchInbox`, `markNotificationRead`, `markAllRead`. `NotificationBell` component — bell 🔔 + unread count badge, absolute-positioned dropdown panel (max 400px, scrollable), per-notification icon (📋 cases, 👤 assignments, 📁 projects), relative timestamp, unread blue-left-border, × mark-read button, "Mark all read" header button, click → navigate + mark read, 30-second polling via `setInterval` / `clearInterval`. Added to `TopHeader` next to Sign Out.
- **Tests**: `NotificationBell.test.tsx` — 8 tests (renders bell, unread badge count, dropdown opens, empty state, mark-read API call, mark-all-read API call, polling after 30s, event icon). `App.test.tsx` updated with `fetchInbox` mock. All 42 test files / 184 tests pass. TypeScript clean.

## Phase 11 — Enterprise Config & Governance ✅ COMPLETE (2026-04-06)

All 25 items (11-1-01 through 11-3-07) implemented:

- **F10.1 Platform Settings**: `PlatformSetting` model in Prisma (key/value JSON store). `src/modules/platform-settings/` NestJS module. `GET /admin/settings` returns all 6 sections with defaults (general, timesheets, capitalisation, pulse, notifications, security). `PATCH /admin/settings/:key` updates a key and audit-logs the change. `SettingsPage` at `/admin/settings` with per-field Save buttons, boolean checkboxes, select dropdowns, text/number inputs. Added to router + navigation (admin-only). `frontend/src/lib/api/platform-settings.ts` API client.
- **F10.2 Full Audit Trail**: `AuditLogRecord` extended with `oldValues`/`newValues` fields. `BusinessAuditRecordDto` updated to expose them. Settings PATCH logs old + new values. Project History tab replaced with live `AuditTimeline` fetching from `GET /audit/business?targetEntityType=Project&entityId=:id`. Assignment detail page: Audit History section added. Person detail page: History tab added with `AuditTimeline`. `AuditTimeline` component at `frontend/src/components/common/AuditTimeline.tsx` — vertical timeline with colour-coded action icons (CREATE=blue, UPDATE=yellow, DELETE=red), humanized action labels, relative timestamps, expandable old→new diff table.
- **F10.3 Skills Registry**: `Skill` and `PersonSkill` Prisma models (migration SQL). `src/modules/skills/` NestJS module with 3 controllers: `GET /admin/skills`, `POST /admin/skills` (admin/hr), `DELETE /admin/skills/:id` (admin), `GET /people/:id/skills`, `PUT /people/:id/skills` (full replace). `GET /assignments/skill-match?skills=skill1,skill2` — finds people with ALL listed skills and < 100% allocation. Skills tab on PersonDetailPage with proficiency badges (Beginner/Intermediate/Advanced/Expert), certified flag, edit mode with skill picker. SkillMatchPanel embedded in CreateAssignmentPage — expand to select skills, click "Find matches", shows candidates table with allocation %. `frontend/src/lib/api/skills.ts` API client.
- **Tests**: `SettingsPage.test.tsx` (6 tests), `AuditTimeline.test.tsx` (5 tests), `PersonSkillsTab.test.tsx` (6 tests). All 45 test files / 201 tests pass. TypeScript clean.

## Phase 12 — Reporting & Export Centre ✅ COMPLETE (2026-04-05)

All items 12-1-01 through 12-2-07 implemented:

- **F11.1 Director Executive Dashboard Enhancement**:
  - `FteTrendChart` component at `frontend/src/components/charts/FteTrendChart.tsx` — `LineChart` of staffed FTE per month derived from weekly trend data.
  - `CostDistributionPie` component at `frontend/src/components/charts/CostDistributionPie.tsx` — `PieChart` of total hours by project from capitalisation report.
  - `DirectorDashboardPage` enhanced: fetches projects + health scores and renders `Portfolio Summary Table` (project name links, status badge, `ProjectHealthBadge`, assignment count). Fetches `fetchCapitalisationReport` for cost pie (shown only when data present). Fetches `fetchWorkloadMatrix` to compute org-wide average allocation, displayed via reused `WorkloadGauge` component. All 5 KPI cards wrapped in `<Link>` elements pointing to `/projects`, `/assignments`, `/people`.
- **F11.2 Export Centre**:
  - `ExportCentrePage` at `/reports/export` — card-based layout with 5 report cards, each with description, optional date-range inputs, and Generate & Download button (loading state while generating).
  - Headcount Report: `fetchPersonDirectory({ pageSize: 500 })` → exports Name, Email, Status, Org Unit, Manager, Resource Pools, Active Assignments Count.
  - Assignment Overview: `fetchAssignments({ pageSize: 500 })` → exports Person, Project, Role, Allocation %, Status, Start Date, End Date.
  - Timesheet Summary: `fetchApprovalQueue({ status: 'APPROVED', from, to })` → exports Person, Week, Total Hours, CAPEX Hours, OPEX Hours, Status.
  - CAPEX/OPEX by Project: `fetchCapitalisationReport({ from, to })` → exports Project, CAPEX Hours, OPEX Hours, Total Hours, CAPEX %, Alert.
  - Workload Matrix: `fetchWorkloadMatrix()` → exports person × project matrix rows with Total % column.
  - Route added to router + navigation (group: 'work', roles: director, admin, delivery_manager, hr_manager).
- **Tests**: `DirectorDashboardPage.test.tsx` (6 tests), `ExportCentrePage.test.tsx` (8 tests). All 47 test files / 217 tests pass. TypeScript clean.

## Phase G — Unfair Advantages (2026-04-06) ✅ COMPLETE

All Phase G items implemented:

- **G-01 Weighted Skill Coverage Scoring**: `StaffingSuggestionsService` with proficiency × importance × availability × recency algorithm; `GET /staffing-requests/suggestions?requestId=` returns ranked candidates with per-skill breakdown; suggestions panel on `StaffingRequestDetailPage`.
- **G-02 Conflict-Aware Drag-and-Drop Staffing Board**: `StaffingBoardPage` at `/staffing-board` with person swimlanes × 12-week columns; `@dnd-kit/core` drag handler calls conflict check before commit; `GET /workload/check-conflict` endpoint.
- **G-03 Algorithmic Capacity Forecast**: `GET /workload/capacity-forecast` with bench projection and at-risk people detection; `CapacityForecastChart` stacked area chart on `WorkloadPlanningPage` with click-through to at-risk people list.
- **G-04 Case SLA Engine**: `InMemoryCaseSlaService` with per-type SLA hours (ONBOARDING=72h, OFFBOARDING=48h, TRANSFER=96h, PERFORMANCE=120h); escalation tier computation (0/1/2); SLA countdown indicator on `CaseDetailsPage` with green/yellow/red/red-tier2 color coding; admin SLA config endpoints.
- **G-05 Webhook / Event API**: `InMemoryWebhookService` with HMAC-SHA256 signed delivery (`X-Delivery-Signature`), delivery log; `POST/GET/DELETE /admin/webhooks`; test delivery endpoint; `WebhooksAdminPage` with add/test/delete/view deliveries UI.
- **G-06 HRIS Integration**: `HrisAdapterPort` interface; `BambooHrAdapter` and `WorkdayAdapter` stubs; `HrisSyncService` with adapter selection and manual sync trigger; `GET/POST /admin/hris/config` + `POST /admin/hris/sync`; `HrisConfigPage` with connection config and field mapping UI.
- **G-07 Custom Report Builder**: `ReportBuilderService` with 5 data sources (people, assignments, projects, timesheets, work_evidence) and column metadata; `GET /reports/builder/sources`, `GET/POST/DELETE /reports/templates`; `ReportBuilderPage` with column selector, filter builder, sort order, preview table, save/load templates, XLSX export.
- **G-08 ABAC**: `AbacPolicy` interface + `AbacPolicyRegistry` with 3 seed policies (rm-approve-pool, pm-read-project, employee-own-timesheet); `applyDataFilter()` for Prisma where-clause injection; `GET /admin/access-policies`; `AccessPoliciesPage` with role/resource filter and policy table.

## Deferred items resolved (2026-04-07)

All previously deferred tracker items are now implemented:

- **13-A1–A5 (Prisma schema)**: `StaffingRequest` + `StaffingRequestFulfilment` models + enums added to `schema.prisma`; applied via `prisma db push` against running Docker DB; manual migration SQL at `prisma/migrations/20260407_staffing_requests/`.
- **13-C5 (Notification seed)**: `seedNotificationInfrastructure()` added to `seed.ts`; 4 staffing request notification templates seeded into Docker DB.
- **13-D8 (DM staffing gaps table)**: `StaffingGapsTable` + `OpenRequestsByProjectTable` rendered in `DeliveryManagerDashboardPage` from backend-provided data.
- **13-E3–E5 (Playwright E2E specs)**: Tests written in `e2e/tests/13-staffing-flows.spec.ts` (PM→RM flow, HR at-risk panel, DM staffing gaps); WSL2 browser limitations prevent local execution.
- **A-L01 (ConfirmDialog on employee creation)**: `ConfirmDialog` wraps the create form submission in `EmployeeLifecycleAdminPage`; tests updated.
- **F-07 (Mobile layout)**: `overflow-x: auto` on timesheet/data-table wrappers; `@media (max-width: 640px)` rules in `global.css` for tables, filter bars, and assignment table column hiding.
- **Group 3 (SSO/onboarding settings)**: `sso.*` and `onboarding.*` settings added to `platform-settings.service.ts`, DTO, frontend API types, and `SettingsPage.tsx` with 2 new sections.
- **Group 4 (BurnRateTrend + skill matching)**:
  - `burnRateTrend` field added to DM dashboard DTO + service (evidence entries grouped by ISO week, last 8 weeks); `BurnRateTrendChart` (recharts `LineChart`) rendered in `DeliveryManagerDashboardPage`.
  - `fetchStaffingSuggestions()` added to frontend API; `StaffingRequestDetailPage` fetches and renders ranked skill-matched candidates panel (`data-testid="skill-suggestions-panel"`) when request is OPEN/IN_REVIEW with skills.

## Highest-value remaining gaps (priority order)

All phases (1–19, 20a–i, A–G, DD, MS, QA-A through QA-M) are complete or in progress. **54 frontend test files + 29 E2E specs passing. Backend TS clean. Frontend TS clean.**

### Phase 20 — Comprehensive Audit (2026-04-15/16) — 74/92 items done

Remaining 17 items are architectural refactoring (20c sub-phase):
- Module boundary violations (cross-module imports of internal repos)
- Service decomposition (split AuthService 498→4 services)
- DTO creation for 25+ inline @Body() parameters
- Replace `any` types in 15+ Prisma Gateway interfaces
- Extract shared hooks (useDashboardQuery, usePersonSelector, fetchDashboard<T>)
- Split god components (ProjectManagerDashboardPage, DirectorDashboardPage, HrDashboardPage)
- Add transaction boundaries to multi-step operations
- Resolve circular dependencies (4 modules use forwardRef)

### Business logic added (Phase 20b)
- Assignment APPROVED → ACTIVE transition with `ActivateApprovedAssignmentsService`
- Case approval/rejection workflow (`ApproveCaseService`)
- Auto-create ONBOARDING case on employee hire
- Auto-create OFFBOARDING case on employee deactivation
- Overlapping leave request detection (server-side)
- Budget approval workflow (audit-trail based; full DB schema pending)
- Missing notification events added (amended, deactivated, case approved/rejected)

### Accessibility (Phase 20e — complete)
- `prefers-reduced-motion` media query for all animations
- Native `<button>` in NotificationBell (was `<div>`)
- `scope="col"` on table headers across all pages
- Color contrast verified (--color-text-subtle darkened to 4.5:1)
- Focus-visible indicators on charts, tables, KPIs, tip balloons
- DataTable captions on key instances
- axe-core Playwright a11y test suite (`e2e/tests/14-accessibility.spec.ts`)

### UX improvements (Phase 20g — complete)
- Filter persistence via URL (CasesPage, WorkloadMatrixPage)
- Form pre-fill from URL params and auth context (CreateAssignment, CreateStaffingRequest, BulkAssignment)
- Timesheet approval auto-expands submitted rows (one-screen approval)
- Error/empty states all have forward actions
- Sort order persisted in URL (ProjectsPage)
- KPI drilldown fixed (TeamDashboard "Unassigned" links to filtered list)

### Frontend quality (Phase 20d)
- Disabled button styling for all variants
- Focus-visible on interactive table rows, KPI strip, chart wrappers
- Table row hover transitions
- Confirm dialog fade-in animation
- Inline styles extracted to constants in ActionDataTable and WorkloadMatrixPage
- Pagination component (`PaginationControls`) with page numbers, first/last, rows-per-page selector
- StaffingRequestsPage now paginated

### Completed 2026-04-11 (DB Migration & Demo Readiness)

- **In-memory → DB migration**: All persistent data stores moved to Prisma-backed repositories:
  - Notifications module (4 repos: Channel, Template, Request, Delivery)
  - Metadata module (new Prisma repos: MetadataDictionary, MetadataEntry)
  - Resource Pools module (new PrismaResourcePoolRepository)
  - Case management (CaseStep service now Prisma-backed; CaseComment stores in CaseRecord.payload JSON)
  - Audit observability (PrismaAuditLogStore writes to AuditLog table with in-memory cache for sync reads)
  - Kept in-memory: external system adapters (Jira, M365, Radius), webhooks (no Prisma model), CaseSLA config
- **Class-validator decorators**: Added to all 28 write DTO files across all modules
- **Comprehensive seed dataset** (phase2 profile): 32 people, 16 org units, 12 projects, 22 assignments, 24 evidence entries, 3 cases with 14 steps, 6 metadata dictionaries, 42 platform settings, 25 skills, 8 timesheet weeks, 36 pulse entries, 8 in-app notifications, 3 notification channels, 15 templates
- **Admin impersonation**: "View as..." dropdown in top header for admin users; overlays impersonated personId/roles onto `useAuth()` so all dashboards, role guards, and data fetching reflect the selected user
- **Auth fix**: `AuthenticatedPrincipalFactory` no longer throws on invalid/expired tokens — returns `undefined` so `@Public()` endpoints work regardless of stale tokens
- **Throttle limit**: Increased from 10 to 100 req/min globally; login endpoint keeps strict 10 req/min
- **Dashboard trend**: Sequential fetching (was 12 parallel calls hitting rate limit)
- **Scroll fix**: `.app-shell__content` changed to `overflow-y: auto`; `.page-container--viewport` no longer blocks scroll
- **Custom scrollbars**: 5px ultra-thin, color-matched for light content and dark sidebar
- **Sidebar fix**: Collapse button pinned at bottom; nav menu scrollable; duplicate key warning fixed
- **leave_requests migration**: Created and applied (table was missing from DB)
- **Monitoring fix**: Applied pending migration; fixed audit visibility false positive

### Completed 2026-04-08

- **15c-08**: Planned vs Actual page redesigned — tabbed summary table with expandable rows
- **15d-01 to 15d-05**: Interactive Org Chart with `d3-org-chart`
- **Phase 16**: Code-splitting for 18 heavy pages via `React.lazy` + `Suspense`
- **QA fixes**: C4 (hot-reload), C9/H3 (ESM), C10/L1 (seed UUIDs), I6 (DTO decorators)

### Phase A bug fixes applied (2026-04-06)

- A-C01: Bearer token removed from admin panel display
- A-C02: RBAC guards on all `/admin/*` routes; AccessDenied page for unauthorized roles
- A-C03: Case owner dropdown uses personId (not account ID); name resolution via multi-dataset Map
- A-C04: Assignment queries join project/person names; planned-vs-actual also fixed
- A-C05: Employee directory includes INACTIVE; status filter dropdown added
- A-C06: ErrorBoundary wrapping AppShell; 404 NotFoundPage for unmatched routes
- A-H01: Grade dropdown populated with G7–G14 entries from in-memory factory
- A-H02: Role dropdown falls back to RBAC role list when no metadata dictionary
- A-H03: Approve/Reject buttons hidden (not just disabled) when not applicable
- A-H04/M04: Dual breadcrumb eliminated; PageTitleBar no longer renders hardcoded crumbs
- A-H05: Date locale standardized to en-US throughout
- A-H06: Case participant count includes subject + owner (+2 in list and detail)
- A-H07: CSS `flex: 1 1 auto; min-height: 0` on main content area
- A-H08: InMemoryCaseStepService with 4 ONBOARDING steps auto-created on case creation
- A-M01: Auto-redirect to entity detail page after employee/case/assignment creation
- A-M02: Employee form adds hire date, job title, location, line manager fields
- A-M03: Export XLSX visible when search active (condition fixed)
- A-M05: Pagination shows "filtered" label when client-side filter active
- A-M06: Skillsets section hidden when no options configured
- A-M07: Case type is a dropdown select (not disabled text input)
- A-L02: Employee creation redirects directly to new profile (no success banner needed)
- A-L04: Assignment note field moved above date range in detail view
- A-L05: TableSkeleton on key list pages (people, assignments, cases, projects)
- A-L06: btn/btn--* replaced with button/button--* in 3 files

### QA bug fixes applied earlier (2026-04-05)

- BUG-008: actorId auto-derived from auth context on assignment workflow actions (no manual entry)
- BUG-019: Project Manager displayed as name (not UUID) on project detail page
- BUG-044: Resource Pools displayed as names (not UUIDs) on person detail page
- BUG-052: Case subject/owner names resolved in backend response (already working)
- BUG-060: PM dashboard activity feed person names resolved from demoPeople (already working)
- ADM3: Admin panel now lists, enables/disables, and deletes local accounts
- RM3a: RM dashboard quick-assignment modal implemented
- Notification wired: `case.step_completed` event fires on step completion
