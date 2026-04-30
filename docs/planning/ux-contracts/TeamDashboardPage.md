# UX Contract — `TeamDashboardPage`

**Route:** `/teams/:id/dashboard` ([`route-manifest.ts:130`](../../../frontend/src/app/route-manifest.ts#L130))
**Component:** [`TeamDashboardPage.tsx`](../../../frontend/src/routes/teams/TeamDashboardPage.tsx)
**Grammar:** Decision Dashboard (Grammar 1) — team-scoped
**Last verified:** 2026-04-27 against `7c495e6`

---

## 1. Route & Roles

- **Allowed:** `ALL_ROLES`.
- **Self-scope:** none. **Drilldown label** set to team name.

## 2. Click paths

| Trigger | Destination |
|---|---|
| "Back to teams" | `/teams` |
| "Assignments" | `/assignments` |
| KPI Members | `/people` |
| KPI Active Assignments | `/assignments` |
| KPI Projects | `/projects` |
| KPI Unassigned | `/people?status=unassigned` |
| KPI Exceptions | `/exceptions` |
| Project row | `/projects/{projectId}` |
| Project "Go" link | `/projects/{projectId}` (stopPropagation) |
| Cross-project member row | `/people/{personId}` |
| Cross-project "Go" link | `/people/{personId}` (stopPropagation) |
| Unassigned person row | `/people/{personId}` |
| Unassigned "Go" link | `/people/{personId}` (stopPropagation) |

## 3. Form validation

_None._ Read-only dashboard.

## 4. Confirmation prompts

_None._

## 5. Toast / notification triggers

_None._

## 6. Filters / sort / pagination / saved views

- No URL params besides `:id`. No pagination, no filters, no localStorage.

## 7. Empty / loading / error states

| State | Copy |
|---|---|
| Loading | "Loading team dashboard..." |
| Error | dynamic |
| Not found | "No team dashboard was found for {id}." |
| No projects | "No active project involvement recorded." |
| No cross-project spread | "No team members staffed across multiple active projects." |
| No unassigned | "Everyone in this team currently has at least one assignment." |

## 8. Side effects

| Interaction | API call |
|---|---|
| Mount | `GET /teams/{id}/dashboard` |

## 9. Other notable behaviors

- **KPI border colors:** Unassigned border = warning if > 0, else active. Exceptions border = danger if > 0, else active.
- **Anomaly Summary row tones:** `openExceptionCount > 0` → danger; `staleApprovalCount > 0` → warning; `projectClosureConflictCount > 0` → danger.
- All sections use `dash-compact-table` and are collapsible via `SectionCard collapsible`.
- TipBalloon on "Unassigned" KPI for context.

---

## Mapped regression spec

[`e2e/ux-regression/TeamDashboardPage.spec.ts`](../../../e2e/ux-regression/TeamDashboardPage.spec.ts)
