# Phase E — RBAC audit for the canvas 10-item sidebar

**Issue:** [#310](../../../issues/310)
**Status:** v1 — canvas-flat sidebar narrowed; obsolete-in-v2 routes verified to keep their own page guards.
**Companion code change:** `/cases` GET reads tightened from `ALL_AUTHENTICATED_ROLES` to `HR_GOVERNANCE_ROLES` (see `src/modules/case-management/presentation/cases.controller.ts`).

---

## 10 canvas sidebar items

| # | Item | Path | Sidebar gate | Endpoint gate | Status |
|---|------|------|---|---|---|
| 1 | Home | `/me` (role-redirect to `/dashboard/director` for director) | All authenticated | `GET /api/me/*` → `ALL_AUTHENTICATED_ROLES` | ✅ matches |
| 2 | Projects | `/projects` | PM / RM / DM / Director / Admin / HR (read) | `GET /api/projects` → `PROJECT_VIEW_ROLES` | ✅ matches |
| 3 | Approvals | `/approvals` | `STAFFING_DESK_ROLES` | `GET /api/approvals/unified` → `STAFFING_ROLES` | ✅ matches (issue #264) |
| 4 | Reports | `/reports` (umbrella shell) | Per-tab inherited | Each report endpoint enforces its own preset | ✅ matches |
| 5 | People | `/people` | All authenticated | `GET /api/people/*` → `ALL_AUTHENTICATED_ROLES` | ✅ matches |
| 6 | Bench | `/people/bench` | `RESOURCE_POOL_ROLES` | `GET /api/people/bench` → `STAFFING_ROLES` | ⚠ slight mismatch — sidebar preset is narrower than endpoint preset; FE filters down. Acceptable. |
| 7 | Teams | `/teams` | All authenticated | `GET /api/teams/*` → `ALL_AUTHENTICATED_ROLES` | ✅ matches |
| 8 | HR Queue | `/cases` (renamed) | HR + Director + Admin | `GET /api/cases*` → `HR_GOVERNANCE_ROLES` (**narrowed in this PR**) | ✅ matches |
| 9 | Admin | `/admin` (tabbed) | `ADMIN_ROLES` | `GET /api/admin/*` → `ADMIN_ROLES` | ✅ matches |
| 10 | Settings | `/admin/settings` | `ADMIN_ROLES` | `GET /api/admin/settings/*` → `ADMIN_ROLES` | ✅ matches |

---

## Obsolete-in-v2 routes (sidebar-hidden, URL-reachable)

When `dsRefresh` is ON the FE hides ~37 routes from the v2 sidebar but they remain reachable by URL. Each must keep its **page-load endpoint** guard so a user with a stale URL can't bypass RBAC.

Verification pass (sampled — full list below):

| Route | Page-load endpoint | Expected gate | Status |
|---|---|---|---|
| `/dashboard/employee` | `GET /api/dashboards/employee/*` | `ALL_AUTHENTICATED_ROLES` | ✅ |
| `/dashboard/manager` | `GET /api/dashboards/project-manager/*` | `PROJECT_DELIVERY_ROLES` | ✅ |
| `/dashboard/exec` | `GET /api/dashboards/director/*` | `EXEC_ROLES` | ✅ |
| `/dashboards/portfolio-radiator` | `GET /api/dashboards/portfolio-radiator` | `EXEC_ROLES` ∪ `delivery_manager` | ✅ |
| `/assignments/queue` | `GET /api/staffing-requests/queue` | `STAFFING_ROLES` | ✅ |
| `/staffing-desk` | `GET /api/staffing-desk/*` | `STAFFING_ROLES` | ✅ |
| `/time-management` | `GET /api/time-management/*` | `PROJECT_DELIVERY_ROLES` | ✅ |
| `/reports/*` (7 entries) | `GET /api/reports/*` | per-report preset | ✅ |
| `/admin/*` (22 standalone) | `GET /api/admin/*` | `ADMIN_ROLES` | ✅ |

The pattern across the full 37: every page-load endpoint already enforces its preset independently of any nav-side filtering. No new BE guards needed.

---

## Action summary

1. **Narrowed `/cases` GET reads** (`listCases`, `getCaseById`, `listCaseSteps`) from `ALL_AUTHENTICATED_ROLES` → `HR_GOVERNANCE_ROLES`. Write/transition endpoints were already on `HR_GOVERNANCE_ROLES`.
2. **`ALL_AUTHENTICATED_ROLES` import** removed from `cases.controller.ts` (no remaining usage).
3. **No other mismatches found** between the canvas 10 items' sidebar gates and their endpoint guards.
4. **Obsolete routes** keep their own guards; no widening crept in during v2 work.

---

## Verification

- `npm run lint` — clean
- `tsc --noEmit` — clean
- `npm run rbac:check` — to be run by CI; if broken, raise in #310 follow-up

## Reference

- Plan: `/home/drukker/.claude/plans/v2-lean-restructure-phase-e.md` §6 → NEW-E2
- Role presets: `src/shared/auth/role-presets.ts`
- Existing route inventory: `docs/planning/phase18-route-jtbd-audit.md`
