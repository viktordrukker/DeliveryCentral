> **ARCHIVED** — This document is retained for historical reference. All phases are complete as of 2026-04-08. See [Current State](../current-state.md) for active status.

# Phase 4 Plan — Product Backlog Implementation

**Created:** 2026-04-05  
**Source:** `docs/planning/DELIVERY_CENTRAL_PRODUCT_BACKLOG.md` (v3.0)  
**Prerequisite:** Phase 3 complete + QA pass (2026-04-05). All 35 frontend tests / 118 assertions pass. TS clean.

---

## Overview

Phase 4 implements the product backlog in priority order:

| Sub-phase | Backlog epic | Focus |
|-----------|-------------|-------|
| **4a** | Epic 1 | Foundation & Data Integrity — date defaults, person defaults, UUID names, breadcrumbs, enum labels, RBAC sidebar |
| **4b** | Epic 2 | Dashboard & Visualization Overhaul — recharts on every dashboard |
| **4c** | Epic 8 (subset) | UX Quick Wins — toast system, command palette, confirmation dialogs, skeletons, empty states |

Phase 5 (Epic 3 — Timesheets) and Phase 6 (Epic 6 — Org visualization) follow after 4c.

---

## Phase 4a — Foundation & Data Integrity

### 4a-1: Fix Dashboard Date Defaults (FR-1.1)

**Problem:** Four dashboard hooks still use hardcoded `defaultAsOf` constants. PM and RM were fixed (2026-04-05) but HR, Employee, Delivery Manager, and Director remain broken.

| Hook | Current value | Fix |
|------|-------------|-----|
| `useHrManagerDashboard.ts` | `'2025-03-15T00:00:00.000Z'` | `() => new Date().toISOString()` |
| `useEmployeeDashboard.ts` | `'2025-03-15T00:00:00.000Z'` | `() => new Date().toISOString()` |
| `useDeliveryManagerDashboard.ts` | `'2026-04-04T00:00:00.000Z'` | `() => new Date().toISOString()` |
| `useDirectorDashboard.ts` | `'2026-04-04T00:00:00.000Z'` | `() => new Date().toISOString()` |

Also: Planned vs Actual page (`/dashboard/planned-vs-actual`) — check its `asOf` initialization.

Any "Reset" button on a dashboard that resets to a hardcoded string must reset to `new Date().toISOString()` instead.

**Acceptance:** Login as any role → all dashboards show non-zero data on first load without changing any filter.

---

### 4a-2: Dashboard Subject Defaults to Logged-In User (FR-1.2)

**Problem:** HR dashboard defaults to a hardcoded person. Employee dashboard already reads from `principal?.personId` (confirmed Phase 3). HR dashboard needs the same treatment.

**Context:** `GET /auth/me` already exists (returns `MeDto: { userId, personId?, email, displayName, roles, source }`). `useAuth()` in frontend already decodes the JWT and exposes `personId` — no new backend work needed.

**Work:**

1. **`useHrManagerDashboard.ts`**: Apply the same `initialPersonId` pattern used in PM/RM hooks:
   - Change `useState(defaultHrManagerId)` → `useState(initialPersonId ?? '')`
   - Add `useEffect` syncing when `initialPersonId` first becomes defined
   - Guard fetch with `if (!personId) return`
   - Remove hardcoded `defaultHrManagerId` constant

2. **`HrManagerDashboardPage.tsx`**: Derive `effectivePersonId` from auth:
   ```tsx
   const effectivePersonId = searchParams.get('personId') ?? principal?.personId ?? undefined;
   ```

3. **Verify** Employee and Delivery Manager dashboards already pass `principal?.personId` — confirm no remaining hardcoded fallback UUID.

4. **`useDirectorDashboard.ts`**: Same `initialPersonId` treatment if it accepts a person filter.

**Acceptance:** Login as `diana.walsh` → HR Dashboard defaults to Diana Walsh. Login as `lucas.reed` → PM Dashboard defaults to Lucas Reed.

---

### 4a-3: UUID Resolution (FR-1.3)

**Problem:** Several locations still show raw UUIDs or fallback to `null`/`undefined` where a name is expected.

**Work:**

1. **`PersonResolver` utility** — `frontend/src/lib/person-resolver.ts`:
   - Module-level cache: `Map<string, string>` (personId → displayName)
   - `resolvePersonName(id: string, people: Array<{id, displayName}>): string` — looks up in cache, falls through to list, returns `id` if not found
   - `usePersonResolver(ids: string[]): Record<string, string>` hook — fetches person directory once and populates cache

2. **Assignment Detail — Workflow Actor field** (FR-1.3.4):
   - Replace the raw text input `<input type="text" label="Workflow Actor">` with a searchable person dropdown
   - Populate from person directory, filtered to roles with approval authority (`resource_manager`, `hr_manager`, `director`, `admin`)
   - Component: `PersonSelect` — reusable typeahead dropdown in `src/components/common/PersonSelect.tsx`

3. **Project Detail** — `projectManagerDisplayName` is already returned by the backend. Ensure it is rendered as a clickable link `<Link to={/people/${projectManagerId}}>{projectManagerDisplayName}</Link>`.

4. **Person name links** — every resolved person name should link to `/people/:id`. Apply to: project detail PM, case detail subject/owner, assignment detail person.

**Acceptance:** No UUID visible in the UI during normal use. Every person reference is a clickable name.

---

### 4a-4: Breadcrumbs (FR-1.4)

**Problem:** No breadcrumb component exists. Detail pages show "HOME / DASHBOARD" regardless of actual context.

**Work:**

1. **`Breadcrumb` component** — `frontend/src/components/common/Breadcrumb.tsx`:
   ```tsx
   interface BreadcrumbItem { label: string; href?: string; }
   function Breadcrumb({ items }: { items: BreadcrumbItem[] }): JSX.Element
   ```
   Renders: `Home > People > Ethan Brooks` with each step linked except the last.

2. **Wire into detail pages:**

| Page | Breadcrumb |
|------|-----------|
| `PersonDetailPage` | Home > People > [person.displayName] |
| `ProjectDetailsPage` | Home > Projects > [project.name] |
| `AssignmentDetailPage` | Home > Assignments > [person] on [project] |
| `CaseDetailsPage` | Home > Cases > [case.caseReference] |
| `TeamDetailPage` | Home > Teams > [team.name] |
| `ResourcePoolDetailPage` | Home > Resource Pools > [pool.name] |
| `ProjectDashboardPage` | Home > Projects > [project.name] > Dashboard |

3. **Page `<title>` tag**: Use `document.title = ...` or a `useTitle` helper so the browser tab shows the entity name.

**Acceptance:** Navigate to any detail page → breadcrumb accurately reflects the navigation path.

---

### 4a-5: Enum Label Expansion (FR-1.5)

**Problem:** `labels.ts` covers change types, case types, and feature flags. Missing: assignment status, project status, org unit type, exception type, anomaly type, person employment status, integration provider, notification channel.

**Work:**

1. Extend `frontend/src/lib/labels.ts` with:

```ts
// Assignment / staffing enums
ASSIGNMENT_STATUS: { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected', ENDED: 'Ended', ... }
PROJECT_STATUS: { DRAFT: 'Draft', ACTIVE: 'Active', CLOSED: 'Closed', CANCELLED: 'Cancelled' }
ORG_UNIT_TYPE: { DEPARTMENT: 'Department', TEAM: 'Team', ORG_UNIT: 'Org Unit', ... }
EXCEPTION_TYPE: { ... }
ANOMALY_TYPE: { EVIDENCE_AFTER_ASSIGNMENT_END: 'Evidence after staffing end', ... }
EMPLOYMENT_STATUS: { ACTIVE: 'Active', INACTIVE: 'Inactive', TERMINATED: 'Terminated' }
INTEGRATION_PROVIDER: { JIRA: 'Jira', M365: 'Microsoft 365', RADIUS: 'RADIUS' }
SOURCE_TYPE: { JIRA_WORKLOG: 'Jira Worklog', MANUAL: 'Manual entry', ... }
NOTIFICATION_CHANNEL: { EMAIL: 'Email', TEAMS_WEBHOOK: 'Microsoft Teams', ... }
```

2. Add `humanizeEnum(value: string, map?: Record<string, string>): string` — looks up in map, falls back to Title Case conversion of the raw value.

3. Apply `humanizeEnum` everywhere SCREAMING_CASE values are currently displayed: org chart type badges, assignment status columns, filter option labels, exception queue type column, anomaly type display.

**Acceptance:** No SCREAMING_CASE or snake_case values visible in the UI during normal use.

---

### 4a-6: Label-Value Spacing Fix (FR-1.6)

**Problem:** On Teams, Integrations Admin, Notifications, and Metadata pages, labels run directly into values: "CodePOOL-CON", "Members10", "ProviderJIRA".

**Work:**

1. Locate the shared card/detail pattern (likely a `<dt>/<dd>` or `<span>` pair rendered inline without separator).
2. Fix by either:
   - Adding `: ` after the label (colon + space)
   - Or stacking label above value with `flex-direction: column`
3. Apply consistently across all affected pages.

**Acceptance:** Every label-value pair has clear visual separation.

---

### 4a-7: RBAC Sidebar Filtering (FR-1.7)

**Problem:** Sidebar currently shows all navigation items to all users. Employees can see Admin, HR, RM links (even though routes are guarded, the links create confusion and fail visually).

**Work:**

1. **Extend `AppRouteDefinition`** in `frontend/src/app/navigation.ts` to include `allowedRoles?: string[]`.

2. **Assign `allowedRoles`** to every route definition:
   - `/admin/*`: `['admin']`
   - `/dashboard/hr`: `['hr_manager', 'admin', 'director']`
   - `/dashboard/resource-manager`: `['resource_manager', 'admin', 'director']`
   - `/dashboard/delivery-manager`: `['delivery_manager', 'admin', 'director']`
   - `/dashboard/director`: `['director', 'admin']`
   - `/dashboard/project-manager`: `['project_manager', 'admin', 'director']`
   - `/dashboard/employee`: `['employee', 'hr_manager', 'resource_manager', 'admin', 'director']` (all roles)
   - `/projects/new`, `/assignments/new`: `['project_manager', 'resource_manager', 'admin']`
   - All other routes: visible to all authenticated users

3. **`SidebarNav`** filters `routes` to those where `!route.allowedRoles || route.allowedRoles.some(r => principal.roles.includes(r))`.

4. **Conditional action buttons**: "Create Assignment", "Create Project", "Terminate Employee", "Delete" — conditionally rendered based on role check.

**Acceptance:** Login as `ethan.brooks` (employee) → sidebar shows only Employee Dashboard, Work Evidence, Assignments. No Admin/HR/RM links.

---

## Phase 4b — Dashboard & Visualization Overhaul

**New package:** `recharts` (MIT). Install via: `npm install recharts --prefix frontend`.

### 4b-1: Main Dashboard Charts (FR-2.1)

**Page:** `/` (`DashboardPage`)

| Component | Chart type | Data source |
|-----------|-----------|-------------|
| `WorkloadDistributionChart` | Horizontal stacked bar | Project list + allocation per role |
| `StaffingStatusDonut` | Donut/Pie | Count of fully staffed / understaffed / unstaffed projects |
| `HeadcountTrendChart` | Line + area fill | Assignment count per week (last 12 weeks) |
| Sparklines in KPI cards | Miniline (4 data points) | Week-over-week delta per KPI |

Backend note: Main dashboard currently returns point-in-time aggregates. The headcount trend and sparklines require weekly snapshots. Options:
- **Option A (preferred):** Compute trend client-side by calling the existing workload endpoint with multiple `asOf` values in parallel (4-week sparkline = 4 parallel calls).
- **Option B:** Add `GET /dashboard/trend?weeks=12` endpoint returning weekly snapshots. Implement if Option A is too slow.

**UI layout:** See backlog FR-2.1 layout specification.

**Acceptance:** Main dashboard shows 3 charts + sparklines. Hover on bar shows project detail. Click drills to `/projects`.

---

### 4b-2: Employee Dashboard Charts (FR-2.2)

**Page:** `/dashboard/employee`

| Component | Chart type |
|-----------|-----------|
| `WorkloadGauge` | Radial/gauge chart — total allocation % |
| `WeeklyAllocationArea` | Stacked area — hours per project per week (12 weeks) |
| `EvidenceTimeline` | Bar chart — hours logged per day (last 14 days) |

**Data:** `fetchEmployeeDashboard` already returns assignments with allocation %. Work evidence hours need to be grouped by day client-side or via a new query param on `GET /work-evidence?personId=&from=&to=`.

---

### 4b-3: PM Dashboard Charts (FR-2.3)

**Page:** `/dashboard/project-manager`

| Component | Chart type |
|-----------|-----------|
| `ProjectStaffingCoverage` | Grouped bar — Required FTE vs Allocated FTE per project |
| `ProjectTimelineGantt` | Horizontal date-range bars per project |
| Evidence coverage progress bar | Per-project card enhancement |

**Data:** PM dashboard response already includes project list with staffing counts. Start/end dates for Gantt are on each project.

---

### 4b-4: RM Dashboard Charts (FR-2.4)

**Page:** `/dashboard/resource-manager`

| Component | Chart type |
|-----------|-----------|
| `TeamCapacityHeatmap` | Grid (Person × Week) coloured by allocation % |
| `ResourcePoolUtilization` | Donut — allocated vs idle |
| `DemandPipelineChart` | Stacked bar — upcoming assignments grouped by role |
| Bench list | List with quick-assign button (already partially implemented) |

**Heatmap spec:** 8 columns (current + 7 forward weeks). Cell colours: 0% = grey, 1-49% = light blue, 50-99% = green, 100% = amber, >100% = red.

**Data:** RM dashboard response includes people + allocation. Weekly breakdown requires either client-side computation from assignment date ranges or a new backend endpoint.

---

### 4b-5: HR Dashboard Charts (FR-2.5)

**Page:** `/dashboard/hr`

| Component | Chart type |
|-----------|-----------|
| `OrgDistributionTreemap` | Treemap — org units sized by headcount |
| `HeadcountTrend` | Line chart — 6-month trend |
| `DataQualityRadar` | Radar — axes: manager %, org unit %, assignments %, email %, resource pool % |
| `ManagerSpanDistribution` | Bar histogram — reports per manager |

---

### 4b-6: Delivery Dashboard Charts (FR-2.6)

**Page:** `/dashboard/delivery-manager`

| Component | Chart type |
|-----------|-----------|
| `PortfolioHealthHeatmap` | Grid (Project × Dimension) — Staffing / Evidence / Timeline / Budget |
| `EvidenceVsAssignmentBars` | Side-by-side bars — expected vs logged hours per project |
| `BurnRateTrend` | Multi-line — hours consumed over time per project |

---

### 4b-7: Planned vs Actual Charts (FR-2.7)

**Page:** `/dashboard/planned-vs-actual`

| Component | Chart type |
|-----------|-----------|
| `PlannedVsActualBars` | Grouped bar — planned vs actual per person |
| `DeviationScatter` | Scatter plot — planned (x) vs actual (y), diagonal = ideal |
| Table row colours | Green = matched, yellow = <20% deviation, red = >20% |

---

## Phase 4c — UX Quick Wins

**New packages:** `sonner` (MIT), `cmdk` (MIT). Install: `npm install sonner cmdk --prefix frontend`.

### 4c-1: Toast Notification System (FR-8.3)

**Library:** `sonner`.

1. Add `<Toaster />` to `App.tsx` root.
2. Replace every `alert()`, `window.confirm()` success message, and silent failure with `toast.success(...)` / `toast.error(...)`.
3. Replace in-page success banners (the green `<p>` blocks currently used after form submissions) with toasts.
4. Loading toast for async operations > 1s.

**Scope:** Assignment workflow actions, project actions, create flows, admin actions, account management.

---

### 4c-2: Confirmation Dialogs for Destructive Actions (FR-8.4)

**Problem:** Currently uses `window.confirm()` (non-styleable, blocks thread) for Close Project and similar. Some actions (Terminate Employee, Deactivate Employee) have no confirmation at all.

1. Build `ConfirmDialog` component — `frontend/src/components/common/ConfirmDialog.tsx`:
   - Modal overlay with title, message, optional reason text input, Confirm + Cancel buttons
   - `onConfirm(reason?: string): void` callback

2. Replace `window.confirm()` calls with `ConfirmDialog` in:
   - Close Project (`ProjectDetailsPage`)
   - Terminate Employee (`PersonDetailPage`)
   - Deactivate Employee
   - Remove team member
   - Delete admin account (`AdminPanelPage`)
   - Close/Cancel/Archive case (`CaseDetailsPage`)

---

### 4c-3: Global Command Palette (FR-8.2)

**Library:** `cmdk`.

1. `CommandPalette` component — `frontend/src/components/common/CommandPalette.tsx`
2. `Cmd+K` / `Ctrl+K` keyboard shortcut registered in `App.tsx`
3. Groups: People (search via person directory), Projects (search via project registry), Pages (static navigation list), Actions (Log Hours, Create Assignment)
4. Arrow-key navigation, Enter to navigate, Esc to close

---

### 4c-4: Role-Filtered Sidebar Navigation (FR-8.1)

Consolidates with 4a-7. Additional work:
- "MY WORK" section at top: My Dashboard + (Phase 5) My Timesheet
- Collapsible section groups: DASHBOARDS | PEOPLE & ORG | WORK | REPORTS | ADMIN
- Active page highlight (already partially implemented via `activePath`)

---

### 4c-5: Skeleton Loaders (FR-8.7)

1. `Skeleton` primitive — `frontend/src/components/common/Skeleton.tsx`:
   ```tsx
   function Skeleton({ className }: { className?: string }): JSX.Element
   // Renders a pulsing grey block
   ```
2. `TableSkeleton` — 5 rows of skeleton cells
3. `CardSkeleton` — skeleton matching KPI card shape
4. Replace every `{isLoading && <p>Loading...</p>}` pattern with the appropriate skeleton variant.

---

### 4c-6: Empty States with CTAs (FR-8.8)

1. `EmptyState` component — `frontend/src/components/common/EmptyState.tsx`:
   ```tsx
   function EmptyState({ icon, title, description, action }: EmptyStateProps): JSX.Element
   ```
2. Apply to every empty list/table that currently shows nothing or just "No data":
   - Assignments list: "No assignments yet" + [Create Assignment]
   - Projects list: "No projects yet" + [Create Project]
   - Cases list: "No cases open" + [Create Case]
   - Work Evidence: "No evidence logged" + [Log Evidence]
   - Notifications queue: "No notifications"
   - Exception queue: "No exceptions"

---

### 4c-7: View/Edit Mode Separation (FR-8.5)

**Problem:** Project detail page shows the "Edit Project" form permanently below the summary (always editable). Person detail may have the same issue.

1. **ProjectDetailsPage**: Show read-only summary by default. "Edit" button (shown only to authorized roles) switches to inline edit form. Cancel returns to read-only.
2. **PersonDetailPage**: Same pattern.
3. **AssignmentDetailPage**: Already mostly read-only with action buttons. Verify no always-visible edit form.

---

## Phase 5 — Time Management (Epic 3)

Planned as next phase after 4c. Requires significant new backend work.

### 5-1: Database Schema

New tables (Prisma migration):
- `timesheet_week` — (person_id, week_start, status: DRAFT|SUBMITTED|APPROVED|REJECTED, submitted_at, approved_by, approved_at, rejected_reason)
- `timesheet_entry` — (id, timesheet_week_id, project_id, assignment_id?, date, hours, capex: bool, description, created_at)

### 5-2: Backend Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/timesheets/my?weekStart=` | Get own timesheet for week (auto-creates DRAFT if none) |
| PUT | `/timesheets/my/entries` | Upsert a single cell (project + date + hours) |
| POST | `/timesheets/my/:weekStart/submit` | Submit week (DRAFT → SUBMITTED) |
| GET | `/timesheets/approval?status=&personId=&from=&to=` | Manager view |
| POST | `/timesheets/:id/approve` | Approve |
| POST | `/timesheets/:id/reject` | Reject with reason |

### 5-3: Frontend Pages

- `/timesheets` — Weekly grid (rows = assignments, columns = Mon-Sun, auto-save on blur)
- `/timesheets/approval` — Manager approval queue
- `/reports/time` — Time reporting charts (FR-3.3)

---

## Phase 6 — Organization & Structure Visualization (Epic 6)

### 6-1: Visual Org Chart (FR-6.1)

**Library:** `react-d3-tree` (MIT).

Replace text org chart on `/org` with interactive tree diagram. Each node: org unit name, manager name, headcount, type badge. Zoom/pan, click to navigate.

### 6-2: Workload Matrix (FR-6.2)

New page `/workload` — Person × Project allocation matrix. Cell colours by allocation %. Row and column totals. Export to XLSX.

### 6-3: Workload Planning Timeline (FR-6.3)

Forward 12-week Gantt per person showing project blocks. Conflict detection (>100% in any week highlighted red). Filter by resource pool.

---

## Acceptance Criteria per Sub-phase

### 4a Done when:
- All 6 dashboards show non-zero data on first load
- Login as any role → dashboard defaults to that person (where applicable)
- No UUID visible in UI during normal use
- All detail pages show correct breadcrumb
- No SCREAMING_CASE visible in UI
- No label runs into its value
- Employee cannot see Admin/HR/RM sidebar links

### 4b Done when:
- Every dashboard has at least 2 charts
- Charts have hover tooltips
- Charts render with real data (non-zero after 4a date fix)
- All 35 frontend test files pass (update mocks as needed)

### 4c Done when:
- Every user action produces a toast (success or error)
- No `window.confirm()` remains in the codebase
- `Cmd+K` opens command palette
- "Loading..." text replaced with skeletons across all pages
- Empty states have descriptive message + CTA button

---

## Test Strategy

- **4a:** Unit tests for `PersonResolver`, `humanizeEnum`. Update existing component tests where mock data needs to include new fields.
- **4b:** Chart components tested with mock data ensuring render without crash and key text labels appear. No pixel-exact chart tests.
- **4c:** Component tests for `ConfirmDialog`, `CommandPalette`, `Skeleton`, `EmptyState`. Integration tests for toast invocations via mock.
- **Phase 5:** Full backend integration tests for timesheet lifecycle (create → submit → approve/reject). Frontend tests for the grid auto-save flow.
- **Phase 6:** Visual org chart tested for node rendering and navigation. Workload matrix tested for correct cell colouring logic.

---

## Dependencies & Risks

| Risk | Mitigation |
|------|-----------|
| Recharts bundle size (~300 KB gzip) | Tree-shake via named imports only; no default import |
| Headcount trend requires multiple API calls | Parallel `Promise.all` with 12 sequential `asOf` values; add loading skeleton |
| Timesheet grid auto-save debounce conflicts | Use a ref-based debounce, cancel on unmount; server must be idempotent (upsert) |
| `react-d3-tree` SSR incompatibility | N/A — project is SPA only |
| cmdk keyboard shortcut conflicts | Scope to `document` level, check `event.target` is not an input before activating |
