# UX Contract — `DashboardPage` (Workload Overview)

**Route:** `/` (declared in [`route-manifest.ts:112`](../../../frontend/src/app/route-manifest.ts#L112) as "Workload Overview")
**Component:** [`DashboardPage.tsx`](../../../frontend/src/routes/dashboard/DashboardPage.tsx)
**Grammar:** Decision Dashboard (Grammar 1)
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Roles allowed (manifest):** `ALL_ROLES` — every authenticated role can navigate to `/`.
- **Effective audience:** only `admin` and `director` actually see the Workload Overview UI. All other roles are redirected client-side ([`DashboardPage.tsx:262-265`](../../../frontend/src/routes/dashboard/DashboardPage.tsx#L262-L265)) via `getDashboardPath(principal.roles)` to their role-specific dashboard:
  - `employee` → `/dashboard/employee`
  - `project_manager` → `/dashboard/project-manager`
  - `resource_manager` → `/dashboard/resource-manager`
  - `hr_manager` → `/dashboard/hr`
  - `delivery_manager` → `/dashboard/delivery-manager`
- **Auth required:** yes. Unauthenticated requests to `/` go to `/login` (handled by route guard, not this component).
- **Self-scope:** none — this is a portfolio-level dashboard.

## 2. Click paths

### KPI strip (5 cards — every value is a clickable drilldown, UX Law 9)

| Trigger | Destination | Notes |
|---|---|---|
| KPI card "Utilization N%" | `/workload` | Border color computed by `tc()` thresholds (warn 90, danger 100; <60 → warning) |
| KPI card "Active Projects N" | `/projects` | Accent border |
| KPI card "Active Assignments N" | `/assignments` | Purple (`--color-chart-5`) border; sparkline shown when ≥4 trend points |
| KPI card "Available People N" | `/people` | Border color via `tc(unassigned, 3, 1, false)` (lower-is-bad inversion) |
| KPI card "Open Issues N" | `/exceptions` | Border color via `tc(issues, 2, 5)`; status text "✓ All clear" or "N unstaffed" |

### Title-bar actions ([`DashboardPage.tsx:67-82`](../../../frontend/src/routes/dashboard/DashboardPage.tsx#L67-L82))

| Trigger | Destination / Behavior |
|---|---|
| `DateRangePreset` (compact) | Updates `rangeFrom` / `rangeTo` state; filters hero chart series in-place; no navigation |
| Link "Projects" | `/projects` |
| Link "Assignments" | `/assignments` |
| Link "Planned vs actual" | `/dashboard/planned-vs-actual` |
| `TipTrigger` "?" button | Toggles all `TipBalloon` tooltips visible across the page (provided by `TipsProvider`) |

### Action items table

| Trigger | Destination | Notes |
|---|---|---|
| Row click (any column except "View") | `nav(item.href)` (router push) | `item.href` = `/projects/:id` for unstaffed-project rows; `/people` for the idle-workforce row |
| "View" link in last column | Same `item.href` (uses `<Link>`); `event.stopPropagation()` prevents the row-click from firing twice |

### Data freshness footer

| Trigger | Behavior |
|---|---|
| "Refresh" button | Calls `refetch()` (re-runs `fetchWorkloadDashboardSummary`); resets `lastFetch` timestamp; does NOT re-fetch the trend series |

## 3. Form validation

_None._ This page has no forms.

## 4. Confirmation prompts

_None._ This page has no destructive actions.

## 5. Toast / notification triggers

_None._ This page does not emit toasts. Errors render in `<ErrorState description={state.error} />`, not as toasts.

## 6. Filters / sort / pagination / saved views

| Control | URL param | Default | Restore on back | Notes |
|---|---|---|---|---|
| Date range | _(none — local state only)_ | empty (uses full trend series) | no | `rangeFrom` / `rangeTo` are `useState` strings; lost on navigation. Phase 18 / DS may URL-persist; current behavior is local. |
| Action table sort | _(none)_ | severity descending (implicit by `actionItems.useMemo` order: unstaffed projects first, then idle-workforce row) | — | Not user-controllable today. |
| Pagination | _(none)_ | all action items rendered | — | Action items are typically <10. |

## 7. Empty / loading / error states

| State | Trigger | Copy / UI | CTA |
|---|---|---|---|
| Loading (initial) | `state.isLoading === true` | `<LoadingState label="Loading dashboard..." variant="skeleton" skeletonType="page" />` | none |
| Error | `state.error` truthy | `<ErrorState description={state.error} />` | _no retry button currently — see contract gap below_ |
| Empty hero chart | `heroData.length === 0` | `<EmptyState description="No trend data available for the selected range." title="No data" />` | none |
| System healthy banner | `noStaffCount === 0 && unassigned <= 3` | `✓ System healthy — No staffing gaps detected` | none |

> **Contract gap noted:** ErrorState renders `description` only (no Retry button on this page). Migrating to new `<DataView>`/`<ErrorState>` may add a Retry CTA. If so, document the change in the migration PR.

## 8. Side effects

| Interaction | API call | Audit | Notification | Analytics |
|---|---|---|---|---|
| Initial mount | `GET /api/workload/dashboard/summary` (via `fetchWorkloadDashboardSummary`) | none | none | none |
| Initial mount | `GET /api/workload/trend?weeks=24` (via `fetchWorkloadTrend(24)`) | none | none | none |
| "Refresh" button | `GET /api/workload/dashboard/summary` only — does NOT re-fetch trend | none | none | none |
| Date range change | _no API call_ — re-derives `heroData` from existing `trendRaw` | none | none | none |
| KPI / action-row click | router navigation only — no API call from this page | none | none | none |

## 9. Other notable behaviors

- **OnboardingChecklist** is rendered above the KPI strip for all users (component decides internally whether to show itself). Migration must keep this above the KPI strip.
- **Sparkline visibility** — utilization sparkline shown only if `utilSpark.length > 3`; assignment sparkline shown only if `assignmentSpark.length > 3`. Both arrays are derived from the last 12 weeks of `trendRaw`.
- **`tc()` threshold helper** ([`DashboardPage.tsx:31-40`](../../../frontend/src/routes/dashboard/DashboardPage.tsx#L31-L40)) governs every KPI border color and the utilization progress bar fill. Migration must preserve thresholds: utilization (warn 90 / danger 100; below 60 → warning), unassigned (warn 3 / danger 1, lower-is-bad), issues (warn 2 / danger 5).
- **Action item severity ranking** is implicit, not configurable: unstaffed projects (severity High, danger tone) always appear before the single idle-workforce row (severity Low, info tone, only emitted when `unassigned > 3`).
- **`getRowKey={(item) => item.id}`** — keys: `unstaffed-${projectId}` for project rows, `idle-workforce` for the singleton row.
- **`minWidth={780}`** on the action `DataTable` — forces horizontal scroll below ~800px viewports (relevant for the eventual mobile card-list mode in DS-4).

---

## Mapped regression spec

[`e2e/ux-regression/DashboardPage.spec.ts`](../../../e2e/ux-regression/DashboardPage.spec.ts) — every row above is one or more `test()` blocks in this file.
