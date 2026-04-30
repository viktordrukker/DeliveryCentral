# UX Contract — `StaffingDeskPage`

**Route:** `/staffing-desk` ([`route-manifest.ts:160`](../../../frontend/src/app/route-manifest.ts#L160))
**Component:** [`StaffingDeskPage.tsx`](../../../frontend/src/routes/staffing-desk/StaffingDeskPage.tsx)
**Grammar:** Operational Queue (Grammar 5) with table-or-planner view-switcher
**Last verified:** 2026-04-27 against `7c495e6`

This is the most feature-rich page in the app. The contract is intentionally detailed.

---

## 1. Route & Roles

- **Roles allowed:** `STAFFING_DESK_ROLES` = `['resource_manager', 'project_manager', 'delivery_manager', 'director', 'admin']` ([`route-manifest.ts:88, 160`](../../../frontend/src/app/route-manifest.ts#L88))
- **Self-scope:** none.
- **Auth-required redirects:** handled by app-level route guard.

## 2. Click paths

### Title bar
| Trigger | Destination | Notes |
|---|---|---|
| **Columns** button | _no nav_ — `setColumnsOpen(true)` opens `ColumnConfigurator` panel ([`StaffingDeskPage.tsx:81`](../../../frontend/src/routes/staffing-desk/StaffingDeskPage.tsx#L81)) | |
| **Saved Filters (N)** dropdown toggle | _no nav_ — opens `SavedFiltersDropdown` ([`StaffingDeskPage.tsx:82`](../../../frontend/src/routes/staffing-desk/StaffingDeskPage.tsx#L82)) | Count is `saved.length` |
| **Export XLSX** button | _no nav_ — fetches all rows (page=1, pageSize=5000) and downloads ([`StaffingDeskExportButton.tsx:31-41`](../../../frontend/src/components/staffing-desk/StaffingDeskExportButton.tsx#L31-L41)) | Disabled when `isLoading \|\| totalCount === 0`; label switches to "Exporting…" |
| **View switcher** "Table / Planner" | _no nav_ — toggles `filters.view` between `'table'` and `'planner'` ([`StaffingDeskViewSwitcher.tsx:6-29`](../../../frontend/src/components/staffing-desk/StaffingDeskViewSwitcher.tsx#L6-L29)) | Planner renders `<WorkforcePlanner poolId orgUnitId>` |
| **TipTrigger** "?" | _no nav_ — toggles global `TipBalloon` visibility |

### KPI strip
| Trigger | Destination | Notes |
|---|---|---|
| **Supply** card | _no nav_ — `setSupplyOpen(true)` shows `<SupplyDrillDown>` modal ([`StaffingDeskPage.tsx:105-110, 183`](../../../frontend/src/routes/staffing-desk/StaffingDeskPage.tsx#L105-L110)) | |
| **Demand** card | _no nav_ — `setDemandOpen(true)` shows `<DemandDrillDown>` modal | |
| **Fill Rate** card | `/staffing-desk?kind=request&status=FULFILLED` ([`StaffingDeskKpiStrip.tsx:62`](../../../frontend/src/components/staffing-desk/StaffingDeskKpiStrip.tsx#L62)) | Same-page deep-link |
| **Overallocated** card | `/staffing-desk?allocMin=101` ([`StaffingDeskKpiStrip.tsx:69`](../../../frontend/src/components/staffing-desk/StaffingDeskKpiStrip.tsx#L69)) | Same-page deep-link |

### Action buttons
| Trigger | Destination | Notes |
|---|---|---|
| **Make Assignment** | `/assignments/new` | Role-gated at destination (`ASSIGNMENT_CREATE_ROLES`) |
| **Create Staffing Request** | `/staffing-requests/new` | Role-gated at destination (`STAFFING_REQUEST_ROLES`) |

### Tabs (table view)
| Trigger | Behavior | Notes |
|---|---|---|
| **Supply** tab | `setFilters({ kind: 'assignment', page: '1' })` | Resets pagination |
| **Demand** tab | `setFilters({ kind: 'request', page: '1' })` | Resets pagination |

### Inline filters (per-column, per-tab)
| Trigger | Behavior | Notes |
|---|---|---|
| Any inline filter input | Updates `inlineFilters[colKey]` local state | Client-side; NOT URL-persisted |
| **Clear filters** button | `setInlineFilters({})` for current tab | Visible only when `activeFilterCount > 0`; does NOT clear URL filters |

### Table rows
| Trigger | Destination | Notes |
|---|---|---|
| Cell click (any except Person) | _no nav_ — `setSelectedRow(row)` opens `StaffingDeskDetailDrawer` | |
| **Person name** click | _no nav_ — `setTimelinePopup({ personId, personName })` opens 18-month timeline modal ([`StaffingDeskPage.tsx:160-179`](../../../frontend/src/routes/staffing-desk/StaffingDeskPage.tsx#L160-L179)) | `event.stopPropagation()` blocks row click |

### Detail drawer
| Trigger | Destination | Notes |
|---|---|---|
| Backdrop click | _no nav_ — `setSelectedRow(null)` | |
| Close × button | _no nav_ — `setSelectedRow(null)` | |
| Escape key | _no nav_ — `setSelectedRow(null)` | |
| **View Employee Profile** | `/people/${personId}` | Role-gated `PEOPLE_MANAGE_ROLES`; 50ms nav delay |
| **View Assignment Details** | `/assignments/${assignmentId}` | Role-gated `ASSIGNMENT_CREATE_ROLES` |
| **Review Timesheets** | `/time-management?person=${encodeURIComponent(personName)}` | Role-gated `TIMESHEET_MANAGER_ROLES` |
| **View Project** | `/projects/${projectId}` | No role gate |
| **View Request Details** | `/staffing-requests/${requestId}` | Demand-row only |

### Pagination
| Trigger | Behavior | Notes |
|---|---|---|
| **←** button | `setFilters({ page: String(state.page - 1) })` | Disabled when `page <= 1` |
| **→** button | `setFilters({ page: String(state.page + 1) })` | Disabled when `page >= ceil(totalCount / pageSize)` |
| **Page size** dropdown | `setFilters({ pageSize, page: '1' })` | Options: 25, 50, 100; resets page |

### Column configurator
| Trigger | Behavior | Notes |
|---|---|---|
| Drag column | `moveColumn(dragKey, direction)` | Multi-step swap; persisted to localStorage |
| Toggle visibility | `toggleColumn(key)` | Minimum 1 column must remain visible |
| **Reset** | `reset()` | Restores default order + visibility; presets unaffected |
| **Save preset** | Saves current order + visibility to localStorage | Name validated non-empty after `.trim()` |
| **Load preset** | Applies preset; new (post-save) columns appended at end | |
| **Delete preset** | Removes from localStorage | No confirmation |
| Backdrop click / × button | `setColumnsOpen(false)` | |

### Saved filters dropdown
| Trigger | Behavior | Notes |
|---|---|---|
| **Save** | Persists current URL filter state to localStorage `staffing-desk-saved-filters` ([`SavedFiltersDropdown.tsx:38-44`](../../../frontend/src/components/staffing-desk/SavedFiltersDropdown.tsx#L38-L44)) | Name validated non-empty; duplicate name overwrites; `createdAt` recorded |
| Load preset | Calls `setFilters(preset.filters)`; resets `page` to 1 | Closes dropdown |
| Delete preset (×) | Removes from localStorage | No confirmation |

## 3. Form validation

| Form / Input | Rule | Citation |
|---|---|---|
| Saved filter name | Non-empty after `.trim()` | [`SavedFiltersDropdown.tsx:39-40`](../../../frontend/src/components/staffing-desk/SavedFiltersDropdown.tsx#L39-L40) |
| Column preset name | Non-empty after `.trim()` | [`ColumnConfigurator.tsx:78-79`](../../../frontend/src/components/staffing-desk/ColumnConfigurator.tsx#L78-L79) |
| Numeric inline filter | Accepts: exact (`80`), comparison (`>=80`, `<50`); invalid silently ignored | [`InlineFilters.tsx:199-218`](../../../frontend/src/components/staffing-desk/InlineFilters.tsx#L199-L218) |
| Date inline filter | Native HTML5 `<input type="date">` | |
| Text inline filter | Fuzzy match, no validation | |
| Multiselect inline filter | CSV-delimited; case-insensitive contains | |

## 4. Confirmation prompts

_None._ All destructive actions (delete saved filter, delete preset, reset columns) are immediate with no confirmation. Reversible — saved filters and presets can be re-created, defaults can be re-applied.

## 5. Toast / notification triggers

_None_ on this page. Errors render in `<ErrorState description={state.error} />` with fallback copy `"Failed to load staffing desk data."` ([`useStaffingDesk.ts:53-55`](../../../frontend/src/features/staffing-desk/useStaffingDesk.ts#L53-L55)).

## 6. Filters / sort / pagination / saved views

### URL search params (managed by `useFilterParams`)

| Param | Default | Sent to API | Notes |
|---|---|---|---|
| `kind` | `''` | yes | `'assignment'` (Supply tab) / `'request'` (Demand tab) |
| `view` | `'table'` | _local_ | `'table'` or `'planner'` — controls render path |
| `page` | `'1'` | yes | Reset to 1 on tab change or filter change |
| `pageSize` | `'50'` | yes | Options: 25, 50, 100 |
| `sortBy` | `''` | yes | Column key |
| `sortDir` | `''` | yes | `'asc'` or `'desc'` |
| `person` | `''` | yes | |
| `project` | `''` | yes | |
| `poolId` | `''` | yes | Also passed to Planner view |
| `orgUnitId` | `''` | yes | Also passed to Planner view |
| `status` | `''` | yes | Pipe-delimited |
| `priority` | `''` | yes | Pipe-delimited |
| `role` | `''` | yes | |
| `skills` | `''` | yes | Pipe-delimited |
| `from` | `''` | yes | ISO date |
| `to` | `''` | yes | ISO date |
| `allocMin` | `''` | yes | Numeric % |
| `allocMax` | `''` | yes | Numeric % |

All restore on back-navigation (browser history).

### Inline filters (client-side, per-tab, NOT URL-persisted)

**Supply tab columns** ([`StaffingDeskTable.tsx:45-65`](../../../frontend/src/components/staffing-desk/StaffingDeskTable.tsx#L45-L65)): Person (text), Timeline (none), Project (multiselect), Role (multiselect), `%` (numeric), Start (date), End (date), Status (multiselect), Grade (text), Job Role (multiselect), Dept (multiselect), Manager (multiselect), Pool (multiselect), Skills (multiselect), Email (text), Emp. (multiselect), Code (text), Created (date).

**Demand tab columns** ([`StaffingDeskTable.tsx:67-90`](../../../frontend/src/components/staffing-desk/StaffingDeskTable.tsx#L67-L90)): Project (multiselect), Timeline (none), Role (multiselect), `%` (numeric), HC (none), Priority (multiselect), Start (date), End (date), Status (multiselect), Skills (multiselect), By (multiselect), Summary (text), Created (date).

Inline-filter state is per-tab and persists in component state across tab switches; **clearing inline filters does not clear URL filters**. Tab state lives in URL via `kind`.

### localStorage keys

| Key | Scope |
|---|---|
| `staffing-desk-saved-filters` | URL-filter presets (across both tabs) |
| `dc:col-vis:sd-supply` | Hidden columns array — Supply |
| `dc:col-order:sd-supply` | Ordered column keys — Supply |
| `dc:col-presets:sd-supply` | Named column presets — Supply |
| `dc:col-vis:sd-demand` | Hidden columns array — Demand |
| `dc:col-order:sd-demand` | Ordered column keys — Demand |
| `dc:col-presets:sd-demand` | Named column presets — Demand |

Column visibility / order / presets are independent per tab.

## 7. Empty / loading / error states

| State | Trigger | Copy |
|---|---|---|
| Loading | `state.isLoading === true` | `<LoadingState variant="skeleton" skeletonType="table" />` |
| Error | `state.error !== null` | `<ErrorState description={state.error} />` (fallback `"Failed to load staffing desk data."`) |
| Empty (filters match nothing) | `currentItems.length === 0 && rawItems.length > 0` | "No rows match the current filters." in table body |
| Empty (no data loaded) | `currentItems.length === 0 && rawItems.length === 0` | "No data loaded." in table body |
| Saved-filters dropdown empty | `saved.length === 0` | "No saved filters yet." |
| Multiselect filter — no matches | `filtered.length === 0` | "No matches" |
| Pagination strip | `totalCount === 0` | Hidden entirely |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount / URL change / refetch | `GET /api/staffing-desk` with serialized `StaffingDeskQuery` (all 18 URL params) ([`useStaffingDesk.ts:49`](../../../frontend/src/features/staffing-desk/useStaffingDesk.ts#L49)) |
| Export | `GET /api/staffing-desk?…&page=1&pageSize=5000` ([`StaffingDeskExportButton.tsx:33`](../../../frontend/src/components/staffing-desk/StaffingDeskExportButton.tsx#L33)) |
| Drawer opens for assignment row | `GET /api/person-directory/${personId}` and `GET /api/skills/${personId}` in parallel ([`StaffingDeskDetailDrawer.tsx:71-77`](../../../frontend/src/components/staffing-desk/StaffingDeskDetailDrawer.tsx#L71-L77)) |
| Drawer opens for request row | _no person/skill fetch_ |
| Person-timeline popup | `<WorkloadTimeline personId>` issues its own assignment-window fetches |
| Refetch trigger | URL param changes → `queryKey` (JSON-stringified) changes → effect re-runs |

## 9. Other notable behaviors

- **View switcher branches the entire render path.** `view='table'` renders `<StaffingDeskTable>`; `view='planner'` renders `<WorkforcePlanner poolId orgUnitId>` — different component, different mental model.
- **Person-timeline modal** opens via person-name click, shows 6 months back / 12 months forward. Backdrop and × close it.
- **Aging indicator** on Demand "Created" column: tone-thresholded badge — danger (old), warning (medium), neutral (recent) ([`StaffingDeskTable.tsx:79-89`](../../../frontend/src/components/staffing-desk/StaffingDeskTable.tsx#L79-L89)).
- **Status badge tone map** ([`staffing-desk.types.ts:15-24`](../../../frontend/src/lib/api/staffing-desk.types.ts#L15-L24)): `active`, `pending`, `done`, `cancelled`, `draft`.
- **Priority badge tone map** ([`staffing-desk.types.ts:26-35`](../../../frontend/src/lib/api/staffing-desk.types.ts#L26-L35)): `URGENT → danger`, `HIGH → warning`, `MEDIUM → info`, `LOW / default → neutral`.
- **KPI thresholds** ([`StaffingDeskKpiStrip.tsx:5-14`](../../../frontend/src/components/staffing-desk/StaffingDeskKpiStrip.tsx#L5-L14)): Supply FTE warn=10, danger=5 (lower-is-bad); Fill Rate warn=80, danger=60 (lower-is-bad).
- **Timeline cell behavior:** Supply renders `<WorkloadTimeline personId compact preloadedAssignments={r.personAssignments} />`; Demand renders the same with `personId=""`, empty preload, and `planned={…}`.
- **Tab counts:** "Supply (N)" = `kind === 'assignment'` items in current page; "Demand (N)" = `kind === 'request'` items.
- **Drawer focus management:** `panelRef.current?.focus()` on mount (`tabIndex=-1`).
- **Open-ended end-date label:** "Open-ended" when `endDate === null`.
- **Export filename:** `staffing_desk_${YYYY-MM-DD}.xlsx`. Sheet columns: Type, Person, Project, Role, Allocation %, Status, Priority, Start Date, End Date, Skills, HC Required, HC Fulfilled.

---

## Mapped regression spec

[`e2e/ux-regression/StaffingDeskPage.spec.ts`](../../../e2e/ux-regression/StaffingDeskPage.spec.ts)
