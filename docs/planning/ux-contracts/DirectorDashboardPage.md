# UX Contract — `DirectorDashboardPage`

**Route:** `/dashboard/director` ([`route-manifest.ts:119`](../../../frontend/src/app/route-manifest.ts#L119))
**Component:** [`DirectorDashboardPage.tsx`](../../../frontend/src/routes/dashboard/DirectorDashboardPage.tsx)
**Grammar:** Decision Dashboard (Grammar 1) — multi-panel custom grid variant
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `DIRECTOR_ADMIN_ROLES` = `director`, `admin`.

## 2. Click paths

| Trigger | Destination |
|---|---|
| KPI Active Projects | `/projects` |
| KPI Utilisation | `/people` |
| KPI On Bench | `/people?filter=unassigned` |
| KPI Open Gaps | `/projects` (only when portfolio summary present) |
| Title-bar Export | XLSX download (active/assignments/staffed/unstaffed/utilisation rate) |
| Title-bar "Projects" / "Workload" | `/projects` / `/workload` |
| Unit Utilisation view toggle | chart ↔ table |
| Health Distribution view toggle | chart ↔ table |
| Available Pool view toggle | chart ↔ table |
| Heatmap period buttons | sets `heatmapWeeks` ∈ `{2, 4, 13, 26, 52}` |
| Available Pool row | `/people/{personId}` |
| Available Pool "View all" link (>10) | `/workload` |
| Project row (action table) | `/projects/{projectId}/dashboard` |
| Project "Go" link | `/projects/{projectId}/dashboard` |
| Refresh footer | `refetch()` |

## 3. Form validation

_None._

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._

## 6. Filters / sort / pagination / saved views

| Selector | State |
|---|---|
| `heatmapWeeks` | local, default 4 |
| `utilView` / `healthView` / `poolView` | local |

Project list sorted by health (red → yellow → green). Available pool capped at 10 in table view.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | "Loading..." (skeleton page) |
| Error | dynamic with `onRetry={refetch}` |
| Unit utilisation empty | title "No data"; description "No org unit data." |
| Available pool empty | title "Pool empty"; description "No people currently available." |
| Projects empty | title "No projects"; description "No projects found." Action: Create Project |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /portfolio-dashboard/heatmap?weeks={weeks}`, `GET /portfolio-dashboard/summary`, `GET /portfolio-dashboard/available-pool`, `GET /project-registry`, `GET /project-health/{id}` (per project, allSettled), `GET /dashboard/director` |
| Period change | refetch heatmap |

## 9. Other notable behaviors

- **`tc(value, warn, danger, higherIsBad)`** threshold helper governs health colors.
- **lastFetch** updated whenever `state.data` changes.
- **`RecentActivityRail`** renders role-specific activity card.
- **Action table caption:** "Projects sorted by health — worst first."

---

## Mapped regression spec

[`e2e/ux-regression/DirectorDashboardPage.spec.ts`](../../../e2e/ux-regression/DirectorDashboardPage.spec.ts)
