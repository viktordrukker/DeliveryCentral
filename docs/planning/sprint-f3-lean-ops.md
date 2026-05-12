# Sprint F-3 — Lean Delivery Operations (PO/BA decomposition)

**Sprint window:** 2026-05-12 → +8 days
**Theme:** front-load Cat-1 business-process items so day-to-day delivery work is fewer-clicks + more proactive.

## Sprint Goal

PMs, RMs, and Directors see real pending work without hunting, can approve in one click from the surface they're already on, and dashboards reflect ground truth instead of placeholders. Nothing is invented — every item is plan-authored.

## Personas

| Persona | Email | Primary surface |
|---|---|---|
| PM Lucas | lucas.reed@itco.local | `/dashboard/manager?scope=portfolio`, `/projects/:id` |
| RM Sophia | sophia.kim@itco.local | `/dashboard/manager?scope=pool`, `/staffing-desk` |
| DM Carlos | carlos.vega@itco.local | `/dashboard/manager?scope=squad`, `/cases/:id` |
| Director Noah | noah.bennett@itco.local | `/dashboard/exec` |
| HR Diana | diana.walsh@itco.local | `/people`, `/dashboard/exec` |
| Dual-role Emma | emma.garcia@itco.local | dual landing (D-119) |
| Admin | admin@deliverycentral.local | `/admin/feature-flags`, toggles |

## Sprint backlog — user stories

Each story = one PR (per strict CI/CD-green rule). 8 stories planned for 8 working days, with F-3.4 bundling 21-09 + Pitfall #14 because they share PvA → project plumbing.

| # | Story | Persona | Plan ref | Est |
|---|---|---|---|---|
| F-3.1 | Approve from CaseDetailsPage + Project BudgetTab | DM Carlos, PM Lucas | D-91, D-92 | 1d |
| F-3.2 | Manager dashboard "Pending Approvals" tile + queue | PM/RM/DM | WO-4.14/5.5 | 1d |
| F-3.3 | Director dashboard SLA + Time-to-fill tiles | Director Noah | WO-4.15/5.6 | 1d |
| F-3.4 | Nudge button + PvA Resolve → approval CTA | PM Lucas | 21-09 + CLAUDE.md Pitfall #14 | 1d |
| F-3.5 | Portfolio radiator real Green/Critical % | Director Noah | D-115 | 1d |
| F-3.6 | RM dashboard real counts (Sophia 6-person team) | RM Sophia | D-120 | 1d |
| F-3.7 | Per-user `preferredDashboardRoute` setting | Dual-role Emma | D-119 | 1d |
| F-3.8 | Toggle flips + internal walk + sprint closeout | Admin | — | 1d |

---

## Story details

### F-3.1 — Approve from CaseDetailsPage + Project BudgetTab (D-91, D-92)

**User story.** As a Delivery Manager or Project Manager, I want to approve/reject Cases (D-91) and BudgetChangeRequests (D-92) directly from where I'm reading them, so I don't have to navigate to a separate approval queue.

**Acceptance criteria.**

1. On `/cases/:id` (`CaseDetailsPage`) when case `status='OPEN'` and current user has `ADMIN | DELIVERY_MANAGER`, an "Approve" button is visible alongside existing actions.
2. Click → `ConfirmDialog` with optional reason → `POST /api/cases/:id/approve` (BE endpoint exists).
3. On 200: success toast, case refetches, status updates to `APPROVED`, AuditLog gets `case.approved` row.
4. On 403/4xx: `ErrorState` with forward CTA (Law-2).
5. Button hidden when case not in `OPEN`. Submitter cannot self-approve.
6. Symmetric on `/projects/:id` Budget tab for each `BudgetChangeRequest` with `status='PENDING'`: per-row "Approve" + reason → `POST /api/projects/:id/budget-change-requests/:approvalId/approve`.
7. Submitter cannot approve own request.

**Definition of Done.**

- TS clean (`tsc --noEmit`).
- Tests added in `CaseDetailsPage.test.tsx` + budget tab test for: visible-by-role, hidden-wrong-role, confirm-dialog, success toast, error path, self-approve hidden.
- Frontend test suite passes.
- PR: pre-merge CI green AND post-merge `build-and-stage` green AND staging `/api/health/deep` `ready`.

**Critical files.**

- `frontend/src/lib/api/cases.ts` — add `approveCase(id, { reason? })`.
- `frontend/src/routes/cases/CaseDetailsPage.tsx` — add action button + dialog.
- `frontend/src/lib/api/project-budget.ts` — add `approveBudgetChange(projectId, approvalId, { reason? })`.
- `frontend/src/routes/projects/.../BudgetTab.tsx` — per-row approve action.

**Risks.** Backend endpoints exist but RBAC may need confirming (some Phase HD migrations added new auth checks). Test by hitting `/api/cases/:id/approve` via curl as DM before wiring FE.

---

### F-3.2 — Manager dashboard "Pending Approvals" tile + queue (WO-4.14/5.5)

**User story.** As a PM/RM/DM, I want a "Pending Approvals" KPI tile + scoped action queue on `/dashboard/manager`, so I see what needs my attention without opening separate inbox surfaces.

**Acceptance criteria.**

1. `/dashboard/manager?scope=portfolio|pool|squad` shows a new KPI tile: "Pending Approvals" with count.
2. `data-jtbd="What needs my attention?"` on the KPI.
3. Tile click → navigate to pre-filtered approval queue (`/approvals?scope=...&assignedTo=me`) — new route OR existing `/staffing-desk?filter=pending` reused.
4. Below KPI strip, "Awaiting Your Action" action table lists up to 10 items in scope: SR proposals, budget-change requests, case approvals, leave requests. Each row: entity name, age, severity (overdue ⇒ red), one-click "Approve | Reject | View".
5. Empty state with forward CTA ("No pending items. View all approvals →").
6. Existing dashboard tests still pass.

**DoD.** Same as F-3.1. Plus new flag `flag.feature.dashboard.approvalQueue.enabled` registered (defaults ON after merge).

**Critical files.**

- BE: `GET /api/dashboard/manager/pending-actions?scope=…` — new aggregator endpoint that joins SR + budget-change + case + leave queues filtered to current user. OR FE-side aggregator if BE has matching list endpoints already (read scope first).
- FE: `<PendingApprovalsTile>` + integration into `ManagerDashboardPage.tsx`.
- Flag: `src/shared/config/platform-flags.service.ts`.

**Risks.** Cross-domain aggregator. Start by listing all pending queues + their endpoints; if BE missing, ship FE multi-fetch + a follow-up to BE-aggregate.

---

### F-3.3 — Director SLA + Time-to-fill tiles (WO-4.15/5.6)

**User story.** As Director Noah, I want approvals-waiting, 24h SLA-breach count, and Time-to-fill sparkline on my exec dashboard, so I can intervene before delivery slips.

**Acceptance criteria.**

1. `/dashboard/exec` gets three tiles:
   - **Approvals Waiting** — count + click → filtered queue.
   - **24h SLA Breach** — count of SRs with `slaDueAt` in last/next 24h; tile turns red if >0; `data-jtbd="What's at risk?"`.
   - **Time-to-Fill** — `<Sparkline>` showing rolling 4-week median days per filled SR; subtitle shows current median.
2. Empty state for Time-to-Fill if <3 filled SRs in last 4 weeks ("Not enough data").
3. New flag `flag.feature.dashboard.timeToFill.enabled` (default ON after merge).

**DoD.** Same shape as F-3.1.

**Critical files.**

- BE: `GET /api/dashboard/exec/sla-summary` returning `{ approvalsWaiting, slaBreaches24h, timeToFillSeries: number[], timeToFillMedian: number | null }`.
- FE: tiles in `ExecDashboardPage.tsx` (or DirectorDashboardPage if exec is role-router).

---

### F-3.4 — Nudge approver + PvA Resolve → approval CTA (21-09 + Pitfall #14)

**User story 4a (Nudge — 21-09).** As PM Lucas with a stalled SR, I want a "Nudge approver" button so I can ping the approver without leaving the page.

**Acceptance criteria 4a.**

1. On `/staffing-requests/:id`, when SR status is `WAITING_APPROVAL` and >24h since last action, show "Nudge approver" button (PM/RM only).
2. Click → `POST /api/staffing-requests/:id/nudge` (NEW endpoint, rate-limited to 1 nudge/4h/SR).
3. Creates AuditLog `staffing_request.nudged` + in-app notification to approver.
4. Toast "Approver nudged" or "Nudge already sent recently; try again in Xh".
5. Flip `flag.feature.staffing.proposalNudge.enabled` → default ON after merge.

**User story 4b (Pitfall #14).** As PM Lucas resolving a Planned vs Actual exception, I want clicking "Resolve" to land on the project's budget/time approval surface so I close the loop without re-navigating.

**Acceptance criteria 4b.**

1. From `/dashboard/exec` → PvA exception row → "Resolve", target is `/projects/:id?tab=budget` or `?tab=time` (depending on exception type).
2. On that view, if a pending approval exists, the F-3.1 approve CTA is visible.
3. If no pending approval but variance > threshold, surface "Request adjustment" CTA which creates a `BudgetChangeRequest`.

**Critical files.**

- BE: `src/modules/staffing-requests/presentation/staffing-requests.controller.ts` + new `NudgeStaffingRequestService` + `staffing_request.nudged` audit event.
- FE: button on `StaffingRequestDetailPage.tsx`; PvA dashboard row click handler updated.
- Cross-link: `ProjectDetailsPlaceholderPage.tsx` (or rename) — accept `?tab=budget|time` query param.

---

### F-3.5 — Portfolio Radiator real data (D-115)

**User story.** As Director Noah, I want the portfolio radiator to show real Green/Critical percentages so I trust the dashboard.

**Acceptance criteria.**

1. `/dashboard/exec` portfolio radiator shows non-zero values that match `SELECT count(*) FILTER (WHERE healthStatus='GREEN') / count(*)` against ground truth.
2. Cold-start (zero ProjectHealthSnapshot rows) shows `—` (B-09 suppression).
3. Color thresholds: Green > 50% ⇒ status-active, 25–50% ⇒ warning, < 25% ⇒ danger.
4. Tile click → filtered `/projects?healthStatus=...` view.

**Critical files.** Investigate `frontend/src/features/dashboard/usePortfolioRadiator.ts` (or whichever hook feeds it) + `src/modules/dashboard/application/...portfolio-radiator-query.service.ts`. Root cause TBD — likely a healthStatus mapping or projection bug given UAT-18 shows `—` for cold-start projects.

**DoD.** Verified via Playwright as Director + cross-checked with psql query.

---

### F-3.6 — RM dashboard data shaping (D-120)

**User story.** As RM Sophia, I want my 6-person team dashboard to show real Managed Teams / Managed People / Idle / Overallocated counts vs DB ground truth.

**Acceptance criteria.**

1. Login as Sophia → `/dashboard/manager?scope=pool` shows tile counts that match psql:
   - Managed People = `SELECT count(*) FROM Person WHERE primaryResourceManagerId = sophia_id`
   - Idle = managed people with no active ProjectAssignment
   - Overallocated = managed people with sum(allocation) > 100%
2. Browser-verify with screenshot in PR.

**Critical files.** `useResourceManagerDashboard.ts` + RM dashboard query service.

---

### F-3.7 — Per-user preferred dashboard route (D-119)

**User story.** As Emma (dual-role HR+RM), I want to choose which dashboard I land on after login, so I don't have to navigate every time.

**Acceptance criteria.**

1. New PersonSetting (or PlatformSetting per-user) key `account.preferredDashboardRoute` with allowed values matching the routes the user can access.
2. `/settings/account` adds a "Preferred dashboard" dropdown listing routes the user has access to (filtered via `canAccessRoute`).
3. `getDashboardPath()` consults this setting first; falls back to role precedence (HR > RM for dual-role).
4. Test: Emma sets preference, signs out + back in, lands on chosen dashboard.

**Critical files.**

- Schema: add `preferredDashboardRoute` column to `Person` OR new `PersonSetting` table (decide during impl).
- BE: setting persistence endpoint.
- FE: `getDashboardPath()` in `frontend/src/app/role-routing.ts` + setting UI on AccountSettingsPage.

---

### F-3.8 — Sprint closeout: toggle flips + internal walk

**Acceptance criteria.**

1. Confirm 3 toggles flipped to default ON: `proposalNudge`, `dashboard.approvalQueue`, `dashboard.timeToFill`.
2. Playwright internal walk: PM Lucas + RM Sophia + Director Noah + dual-role Emma each see their new surface; capture 1 screenshot per persona.
3. Update `docs/planning/current-state.md` with F-3 outcome.
4. Write `memory/project-sprint-f-3-closed.md`.

---

## Cross-sprint constraints

- **CI/CD rule:** every PR pre-merge green + post-merge `build-and-stage` green + staging `/api/health/deep` `ready` before declaring story done.
- **No new packages** unless from the approved list in CLAUDE.md §4.
- **No raw colors** outside `frontend/src/styles/` — use design tokens.
- **No mock data** in app code; if a dashboard tile needs data, the seed must populate it.
- **`data-jtbd` attribute** on every new KPI tile.
- **Test alongside implementation** — never leave the suite red.

## Out of scope for F-3 (deferred)

- C1-EMP-CASE Employee "Report an issue" (deferred to F-4 per user decision 2026-05-12 — JSM dependency).
- Multi-tenant scoping work — stays Cat-2.
- Any RBAC redesign — that's F-5.

## Sprint metrics

- 8 PRs merged + post-merge staging green
- 7 new business-process surfaces shipped + 1 closeout PR
- 3 flags flipped OFF → ON
- 0 regressions in existing UAT 23-scenario walk
