# UX Contract — `AssignmentsPage`

**Route:** `/assignments` ([`route-manifest.ts:136`](../../../frontend/src/app/route-manifest.ts#L136))
**Component:** [`AssignmentsPage.tsx`](../../../frontend/src/routes/assignments/AssignmentsPage.tsx)
**Grammar:** List-Detail Workflow (Grammar 2) with two tabs (Assignments | Positions)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- `/assignments` — `ALL_ROLES`
- `/assignments/new` — `ASSIGNMENT_CREATE_ROLES` = `project_manager`, `resource_manager`, `delivery_manager`, `director`, `admin` ([`route-manifest.ts:67-73, 137`](../../../frontend/src/app/route-manifest.ts#L67-L73))
- `/assignments/bulk` — `ASSIGNMENT_CREATE_ROLES` ([`route-manifest.ts:138`](../../../frontend/src/app/route-manifest.ts#L138))
- `/assignments/:id` — `ALL_ROLES`
- **Self-scope:** `isEmployeeOnly` = principal has roles but none in `ASSIGNMENT_CREATE_ROLES` ([`AssignmentsPage.tsx:26-28`](../../../frontend/src/routes/assignments/AssignmentsPage.tsx#L26-L28)). When true, `useStaffingDesk` is called with `personId: principal.personId` so the user only sees their own rows.

## 2. Click paths

| Trigger | Destination | Notes |
|---|---|---|
| **Create Assignment** (title bar) | `/assignments/new` | Hidden when `isEmployeeOnly` |
| **Create Position** (title bar) | `/staffing-requests/new` | Hidden when `isEmployeeOnly` |
| **Columns** button | _no nav_ — opens `ColumnConfigurator` ([`AssignmentsPage.tsx:43-49`](../../../frontend/src/routes/assignments/AssignmentsPage.tsx#L43-L49)) | |
| **Saved Filters (N)** dropdown | _no nav_ — opens `SavedFiltersDropdown` | localStorage key `assignments-saved-filters` ([`AssignmentsPage.tsx:53`](../../../frontend/src/routes/assignments/AssignmentsPage.tsx#L53)) |
| **Export XLSX** | _no nav_ — downloads file (assignment or position scoped) | Disabled while `state.isLoading`; visible only when `state.items.length > 0` |
| **Copy link** | clipboard copy `window.location.href` | inline "Copied ✓" |
| **TipTrigger** | toggles global tips | |
| **Assignments** tab | `setFilters({ tab: 'assignments' })` | URL persistence via `tab` param |
| **Positions** tab | `setFilters({ tab: 'positions' })` | |
| **Inline filter** input | local `assignmentFilters` / `positionFilters` state | Per-tab; not URL |
| **Clear filters** button | resets current tab's inline filters | Visible when `activeFilterCount > 0`; shows count |
| **Row click** on assignment-kind row | `/assignments/${row.id}` | |
| **Row click** on request-kind row | `/staffing-requests/${row.id}` | |
| **Saved filter — Save** | persists current filters to localStorage | Name validated non-empty; duplicate overwrites |
| **Saved filter — Load** | applies preset, closes dropdown | |
| **Saved filter — Delete** | removes from localStorage | No confirmation |

## 3. Form validation

| Form / Input | Rule |
|---|---|
| Saved filter name | Non-empty after `.trim()`; Enter submits |
| Column preset name | Non-empty after `.trim()` |
| Inline numeric filter | Same parser as StaffingDesk (exact / `>=` / `<` / etc.) |
| Inline date / text / multiselect filters | Native HTML5 / fuzzy / CSV-multi |

No native `<form>` elements outside saved-filter / preset name inputs.

## 4. Confirmation prompts

_None._ Saved-filter and preset deletion is immediate (reversible by re-saving).

## 5. Toast / notification triggers

_None_ on this page. Errors render in `<ErrorState>`.

## 6. Filters / sort / pagination / saved views

### URL search params

| Param | Default | Notes |
|---|---|---|
| `tab` | `'assignments'` | `'assignments'` or `'positions'` |
| `personId` | _set internally only when `isEmployeeOnly` is true_ | Sent to `useStaffingDesk` query |

### Inline filter state (per tab, in-memory)

| Tab | Columns with filters |
|---|---|
| Assignments | Person (text), Project (multi), Role (multi), `%` (numeric), Start (date), End (date), Status (multi), Next Step (none), Grade (text), Dept (multi), Manager (multi), Pool (multi), Emp. (multi), Code (text), Created (date) |
| Positions | Project (multi), Role (multi), Priority (multi), HC (none), `%` (numeric), Start (date), End (date), Status (multi), Next Step (none), Skills (multi), Requested By (multi), Summary (text), Created (date) |

State is per-tab. Inline filter set decay: switching tabs preserves each tab's state separately.

### Pagination

**None server-side.** All items returned by `useStaffingDesk` are loaded; client-side filters narrow the visible set.

### localStorage keys

| Key | Scope |
|---|---|
| `assignments-saved-filters` | URL-filter presets |
| `dc:col-vis:asn-assignments` | Hidden columns — Assignments tab |
| `dc:col-order:asn-assignments` | Column order — Assignments tab |
| `dc:col-presets:asn-assignments` | Named presets — Assignments tab |
| `dc:col-vis:asn-positions` | Hidden columns — Positions tab |
| `dc:col-order:asn-positions` | Column order — Positions tab |
| `dc:col-presets:asn-positions` | Named presets — Positions tab |

## 7. Empty / loading / error states

| State | Trigger | Copy / UI |
|---|---|---|
| Loading | `state.isLoading` | `<LoadingState variant="skeleton" skeletonType="table" />` |
| Error | `state.error` | `<ErrorState description={state.error} />` |
| Page empty | `state.items.length === 0` && no error / loading | `<EmptyState>` — title "Nothing here yet"; description "No assignments or positions found." Action `/assignments/new` only when not `isEmployeeOnly` |
| Tab empty (after filter) | active tab has 0 items after inline filter | "No assignments found." / "No positions found." / "No rows match the current filters." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount / refetch | `fetchStaffingDesk({ kind: '', personId? })` ([`useStaffingDesk.ts:40`](../../../frontend/src/features/staffing-desk/useStaffingDesk.ts#L40)) |
| Tab change | _no API_ — re-derives client side |
| Inline filter change | _no API_ |
| Export | _no API_ — XLSX assembled client-side |

`personId` is included in query only when `isEmployeeOnly`.

## 9. Other notable behaviors

- **Next Step column** ([`AssignmentsWorkflowTable.tsx:44-66`](../../../frontend/src/components/assignments/AssignmentsWorkflowTable.tsx#L44-L66)) renders status-conditional copy + icon + color. Assignments: `CREATED → '→ Propose candidate'` (blue), `PROPOSED → '⏳ Review proposal'` (orange bold), `BOOKED → '✓ Start onboarding'` (blue), `ONBOARDING → '▶ Begin work'` (pending), `ASSIGNED → '● In progress'` (active green), `ON_HOLD → '⏸ Release or cancel'` (orange bold), else `'— Closed'` (subtle gray). Positions diverge slightly: `BOOKED → '✓ Booked'`, `ASSIGNED → '● Filled'`.
- **Column categories** ([`AssignmentsWorkflowTable.tsx:70-103`](../../../frontend/src/components/assignments/AssignmentsWorkflowTable.tsx#L70-L103)): Assignments: Core / Person / Assignment. Positions: Core / Request.
- **Skills column** shows first 3 skills + "+N more" if >3, muted gray, fontSize 10.
- **End date** renders "Open" muted gray if null.
- **HC** rendered "fulfilled/required" right-aligned.
- **Cell text truncation:** values >15 chars get `data-full` attribute for hover tooltip.
- **Export columns** ([`AssignmentsPage.tsx:64-82`](../../../frontend/src/routes/assignments/AssignmentsPage.tsx#L64-L82)):
  - Assignments: Person, Project, Role, Allocation %, Start, End, Status.
  - Positions: Project, Role, Priority, HC Required, HC Fulfilled, Status.
  - Filename `${tab}_YYYY-MM-DD.xlsx`; single sheet "Data".

---

## Mapped regression spec

[`e2e/ux-regression/AssignmentsPage.spec.ts`](../../../e2e/ux-regression/AssignmentsPage.spec.ts)
