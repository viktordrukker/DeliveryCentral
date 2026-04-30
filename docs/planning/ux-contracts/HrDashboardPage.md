# UX Contract — `HrDashboardPage`

**Route:** `/dashboard/hr` ([`route-manifest.ts:117`](../../../frontend/src/app/route-manifest.ts#L117))
**Component:** [`HrDashboardPage.tsx`](../../../frontend/src/routes/dashboard/HrDashboardPage.tsx)
**Grammar:** Decision Dashboard (Grammar 1) with sub-tabs
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `HR_DASHBOARD_ROLES` = `hr_manager`, `director`, `admin`.
- **Self-scope:** optional `?personId=…` URL param overrides default (auth principal's `personId`).

## 2. Click paths

| Trigger | Destination |
|---|---|
| HR manager search input (datalist) | updates URL `personId` + state |
| Title-bar "Employee directory" | `/people` |
| Title-bar "Cases" | `/cases` |
| Tab click (Headcount / Organization / Data Quality / Roles / Lifecycle / Wellbeing) | `navigate(pathname + search + #tabId, { replace: true })` |
| KPI Total Headcount | `/people` |
| KPI Active Employees | `/people?status=active` |
| KPI Data Issues | `handleTabChange('data-quality')` (no nav) |
| KPI At Risk | `handleTabChange('lifecycle')` |
| KPI Open Cases | `/cases` |
| Data Quality row click / "View" link | `/people/{id}` |
| Lifecycle at-risk row / "View" | `/people/{id}` |
| Lifecycle joiner / deactivation row | `/people/{id}` |
| Lifecycle "View all cases" | `/cases` |
| Wellbeing manager dropdown | sets `heatmapManagerId` |
| Wellbeing pool dropdown | sets `heatmapPoolId` |
| Wellbeing empty-state action | `/notifications/new?type=pulse-reminder` |
| Footer "Refresh" | `state.setAsOf(new Date().toISOString())` |

## 3. Form validation

_None._

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._

## 6. Filters / sort / pagination / saved views

| Control | URL / state | Default |
|---|---|---|
| `personId` | URL search param | auth principal's `personId` |
| Active tab | URL hash fragment | `'headcount'` |
| Wellbeing manager filter | local state | `''` ("All managers") |
| Wellbeing pool filter | local state | `''` ("All pools") |

No localStorage. No pagination on data tables.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | skeleton page |
| Error | dynamic |
| Lifecycle empty | EmptyState (when no joiners and no deactivations) |
| Org distribution empty | EmptyState |
| Roles/grades empty | EmptyState |
| Wellbeing empty | EmptyState w/ action `/notifications/new?type=pulse-reminder` |

Data freshness: "Updated X time ago · Refresh" via `formatDistanceToNow`.

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /dashboard/hr-manager/{personId}?asOf={iso}` |
| Mount | `GET /people?page=1&pageSize=100&role=hr_manager` (manager dropdown) |
| Mount | `GET /people?page=1&pageSize=100` (Wellbeing manager options) |
| Mount | `GET /resource-pools` (Wellbeing pool options) |
| Open cases | `GET /cases?status=OPEN|IN_PROGRESS` |
| Wellbeing filter change | `GET /pulse/heatmap?managerId&poolId` (race-condition guarded) |
| Refresh | resets `asOf` to current time |

## 9. Other notable behaviors

- **Tab change** uses `replace: true` to avoid back-button clutter.
- **Headcount trend** computed client-side: 6-month window (all months show same `activeHeadcount`).
- **Data quality scores** derived from employee counts client-side.
- **At-risk badges** rendered red/white text.
- **Chart export** available on Headcount, Organization, Roles, Lifecycle cards (XLSX).
- **Heatmap fetch** uses `let active = true` cleanup pattern.

---

## Mapped regression spec

[`e2e/ux-regression/HrDashboardPage.spec.ts`](../../../e2e/ux-regression/HrDashboardPage.spec.ts)
