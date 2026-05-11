# Phase 4 Checkpoint — JTBD Validation per Role

**Run date:** 2026-05-09
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/jtbd-validation-matrix.md](../jtbd-validation-matrix.md) — 8 roles × 5 JTBDs = 40 live walks against `localhost:5173` + `localhost:3000/api`.
**Raw data:** [docs/planning/jtbd-screenshots/walker-results.json](../jtbd-screenshots/walker-results.json) (40 entries) + 40 PNGs at `docs/planning/jtbd-screenshots/<role>__<route>.png`.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Roles validated | 8 | **8** (admin, director, hr_manager, resource_manager, project_manager, delivery_manager, employee, dual_role) |
| JTBDs per role | 5 | **5** |
| Total walks | 40 | **40** |
| Live login (POST /api/auth/login) | yes | yes — all 8 200 OK |
| Screenshot per walk | yes | 40 PNGs (~5.5 MB total) |
| KPI text captured | every loaded page | ~28/40 had KPI strip; rest are list/form pages |
| GREEN | — | 27 |
| AMBER | — | 11 |
| RED | — | 2 |

## Findings summary (≤300 words)

**The 2 REDs:**

- **A4 (admin/audit-log)** — `/admin/audit-log` does not exist in `route-manifest.ts`; admin index renders instead. The persona JTBD explicitly asks for "auditable records separate from technical logs" — no FE surface today.
- **E4 (employee/work-evidence)** — `/work-evidence` is gated to `EVIDENCE_MANAGEMENT_ROLES = ['director', 'admin']` (route-manifest.ts:145). Employee gets silently redirected to `/dashboard/employee`. Persona JTBD ("see my recent evidence and effort summary") is broken.

**Notable AMBERs:**

- **D2 portfolio-radiator** loads but shows `0% Green / 0% Critical` across 14 projects with `48 Avg score`. RAG snapshot generation looks like it isn't running on seed.
- **dual_role default landing** routes to `/dashboard/hr` (HR wins over RM) — undocumented precedence rule.
- **RM dashboard** for Sophia (1 team / 6 people) shows 0% Util / 0/6 assigned, while global staffing-desk shows 27% Fill Rate / 15 Overallocated. Likely seed-thinness for the RM-managed-team perimeter or data-shaping mismatch.
- **Silent JS RBAC errors** — director on portfolio-radiator, delivery_manager on planned-vs-actual, employee on `/people` all throw "Insufficient role for this operation" page-errors while the page itself renders. Sub-feature silent-fail pattern.

**Confirmations of in-flight tracker items:**

- **D-102** is **already partly addressed** — `/staffing-board` redirects to `/staffing-desk?view=timeline`. Update the tracker narrative.
- **D-91** (workload routes) — `/workload` redirects to `/staffing-desk?view=table`. Same consolidation.
- **D-101** (dictionaries → metadata-admin) — both surfaces still co-exist; consolidation work pending.
- **D-86, D-87, D-88** — confirmed working as redirects in current routing.

## Skills invoked

- `e2e-testing` and `e2e-testing-patterns` — methodology inlined: live API login → JWT in localStorage → SPA navigation → DOM extraction → screenshot. Avoided full `@playwright/test` integration to skip the existing `e2e/auth.setup.ts` infrastructure (which uses stale `@example.com` credentials from the phase2 seed; current seed is it-company with `@itco.local`).
- `webapp-testing` — SPA-aware probe (waitUntil domcontentloaded + networkidle fallback) and DOM selectors (`.kpi-strip`, `<h1>`).
- The spec's `product-management:synthesize-research` and `product-management:write-spec` plugins are not installed; the per-role journey notes section in the matrix is the synthesis surface.
- Did not invoke any "browser MCP" — none was wired up; used direct `playwright` package via `node`.

## Tracker append plan (on user approval)

A new sub-heading `### Phase 4 — JTBD validation (docs/planning/jtbd-validation-matrix.md)` will be appended to the existing `## Research Findings (D-85+)` section.

| New D-id | Description |
|---|---|
| D-114 | [GAP] No `/admin/audit-log` FE route — admin investigation has no surface (RED) |
| D-115 | [BUG?] Portfolio radiator shows `0% Green / 0% Critical` despite 14 projects + Avg 48; verify RAG snapshot generation |
| D-116 | [RBAC] Employee cannot reach `/work-evidence` — JTBD E4 broken; widen RBAC to self-scope OR add a section to `/dashboard/employee` and `/my-time` |
| D-117 | [GAP] No `/admin/setup` post-install control surface; setup wizard is one-shot at `/setup` |
| D-118 | [UPDATE] D-102 narrative — `/staffing-board` already redirects; remaining work is drag-write inside `/staffing-desk` |
| D-119 | [DECIDE] dual-role default landing — `/dashboard/hr` wins; document the precedence rule or add per-user override |
| D-120 | [SEED/DATA] RM dashboard shows 0% Util across managed teams while global staffing-desk shows 27% fill — verify seed RM-managed-team coverage OR fix dashboard data shaping |
| D-121 | [UX] Silent JS RBAC errors on director/delivery_manager/employee dashboards — sub-features should fail loud (visible error + retry) or be hidden when role lacks access |

(8 new D-items + 1 narrative update to D-102; counter ends at D-121.)

## Open questions / next-session inputs

- **D-115 hinges on a quick verification** — does the seed populate `ProjectRagSnapshot` rows for the 14 active projects? If yes and the dashboard still shows 0% Green, threshold logic is broken; if no, the RAG snapshot job needs to be wired into `prisma/seed.ts` (or runs on a schedule that hasn't fired in dev).
- **D-119 is a product decision** — HR wins by default for the dual-role user. Acceptable? If not, the cleanest fix is per-user-preferred-dashboard via PlatformSetting or PersonNotificationPreference.
- **D-120 needs a quick SQL check** — does Sophia's managed team have any active assignments? If yes, the dashboard's data shaping is wrong (some rows aren't being included); if no, seed thinness for the RM persona perimeter.
- **Phase 4 RAG matrix is a snapshot of one moment** — a JTBD that's GREEN with seed-thin data may be RED for a real customer with a thicker dataset. Worth re-running this walker against a higher-fidelity seed (or staging) before declaring the matrix definitive.

## Exit conditions hit

- ✅ All 8 roles validated via live login + walk
- ✅ 5 JTBDs per role
- ✅ GREEN/AMBER/RED scoring with cited evidence
- ✅ Per-role journey notes
- ✅ Cross-references to existing tracker items (no duplicates)
- ✅ 8 closing recommendations + 1 narrative update

**Stop here.** Awaiting validation gate before tracker append.
