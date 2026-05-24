# V2 — Implementation Status & Defer List

**Created:** 2026-05-24 (rewrite after user pushback that earlier plan was treating canvas as re-skin)
**Spine plan:** `docs/planning/claude-design/lean-simplification-initiative.md` (5 sprints × 2 weeks, ~10 weeks)
**Amendments:** `lean-simplification-staffing-desk-amendment.md` · `lean-simplification-employee-workspace-amendment.md`
**Scope decisions (user 2026-05-24):**
- Master lean-simplification plan IS the spine
- Theme 2 (Position aggregate + legacy drop) — **FULL**
- Theme 4 (Operational budgeting + EVM auto + currency + fiscal + unified approvals) — **IN**
- Out of scope: addons/features beyond canvas

---

## §1 — Calibration: what shipped vs what the spine demands

The morning's shipping (Phases A/B/D/E, PRs #273–#330) addressed the **visual frame + 10-item lean sidebar**. **BA validation 2026-05-25 found the spine has ALSO shipped substantial BE work that this doc previously missed.** Per-sprint reality after the 2026-05-25 correction:

| Spine sprint | Description | Status | Notes |
|---|---|---|---|
| **S1** — Design System Regeneration (2w) | New tokens + atoms + grammars + Playwright re-verify | **~85% done** | Atoms (#273–#286) + tokens (#303) shipped. `Calendar.tsx` + `BalanceMeter.tsx` also in `frontend/src/components/ds/`. Missing: Ladle stories refresh, Playwright `--update-snapshots` pass, ds-conformance re-baseline |
| **S2** — Lean Staffing Foundation (2w) | `ProjectPosition` aggregate + dual-write + skeleton pages | **~60%** ⚠️ | **`src/modules/project-positions/` IS shipped** with 7 endpoints + state machine + `project-position-mirror.service.ts` (dual-write). Backfill script + bench skeleton missing. 21 legacy callsites still on `ProjectAssignment`. |
| **S2.5** (amendment) — Timeline editable + JQL first-class + StaffingDeskTab | DS upgrades for the staffing planner | **0%** | Pre-req for Sprint 5 contract phase per amendment §1 |
| **S3** — Project Pulse + PM Flow (2w) | Pulse query + Pulse page + 3-tab consolidation + Create Wizard | **~30%** | Phase D1 (#304) shipped Pulse panel cosmetics. NO tab consolidation (still 7 tabs). NO Create Project wizard refresh. NO Pulse query service. |
| **S4** — Operational Budgeting + Approvals (2w) | EVM auto + multi-currency ON + fiscal ON + unified `/admin/approvals` | **~30%** ⚠️ | **`EvmComputationService` IS shipped** (`src/modules/financial-governance/application/evm-computation.service.ts:84`) — just not wired to cron / rollup / Radiator. `/approvals` cross-domain queue UI shipped. `BudgetApproval` model + `budget-approval-auto-trigger.service.ts` exist but listener not installed. Currency / fiscal flags still default OFF. |
| **S5** — People Hub + Lean Staffing Contract (2w) | Bulk ops + HR queue aggregator + legacy model drop | **~30%** | Frontend tabbed shell (#302), bench (#299), profile (#300), HR cards (#296/#297) shipped. **`close-project.service.ts` workspend service is shipped** but no UX surfaces it. NO bulk endpoints, NO contract-phase migration. |
| **EW** (amendment) — Employee Workspace lean | `Calendar` + `BalanceMeter` DS primitives + `/me?tab=leave` + leave transaction loop + leave notifications | **~40%** ⚠️ | `/me` workspace shell shipped. **`Calendar` + `BalanceMeter` primitives ARE shipped.** **20c-05 LeaveBalance bug closed by hot-patch PR #332 (2026-05-25).** Gap 20b-10 (no leave notifications) still open. Capacity reservation in planner still open. |

**Net: ~45% of the spine's work is shipped (revised from 25% per 2026-05-25 BA audit).** The remaining ~55% is real build work concentrated in:

1. **F4 leave loop closeout** — notifications + policy + capacity reservation (gap 20b-10 + EW S5-E1..E4 + S5-E8). LeaveBalance side-effect bug closed by hot-patch.
2. **F1 PM flow** — Pulse aggregator + 3-tab consolidation + Create Wizard (S3-1 / S3-5 / S3-6).
3. **F6 EVM wiring** — install cron, wire rollup, flip currency/fiscal flags, install BudgetApproval auto-trigger, build MoneyTab (S4-1..S4-7).
4. **F2 contract phase** — migrate 21 callsites + delete legacy `ProjectAssignment` / `StaffingRequest` / `Slate*` models (S5-6 + S5-7).
5. **Staffing-desk amendment** — Timeline editable + JQL first-class + Distribution Studio retarget to `ProjectPosition` (S2.5 + amendment S5).

---

## §2 — Outstanding work mapped onto the spine

What follows is the outstanding-work view organized by spine sprint. Each row is a story from the spine plan — keep it as the reference, no need to re-author here. Stories already shipped are crossed through.

### S1 closeout (remaining: ~3 days)

| Story | What's left |
|---|---|
| S1-4 | Refresh Ladle stories for the new atoms (atoms exist; stories may be stale) |
| S1-5 | Re-baseline `scripts/check-ds-conformance.cjs` to the new DS — current baseline may still allow legacy classes that should now be hard-blocked |
| S1-6 | Playwright `--update-snapshots` pass to lock visual regression baseline against the new DS |

### S2 — Lean Staffing Foundation (full sprint, ~2 weeks)

All 8 stories S2-1 → S2-8 are outstanding. This is the **architectural pivot** — without it, the canvas is unreachable. Spine plan has the full story decomposition; key BE deliverables:

- `ProjectPosition` + `ProjectPositionCandidate` + `ProjectPositionFillHistory` Prisma models + forward-only migration
- `position-fill-status.ts` value object (7-state lifecycle) + transitions matrix
- `ProjectPositionService` + `TransitionProjectPositionFillService` + `SuggestFillsService`
- `project-positions.controller.ts` (~10 endpoints replacing `assignments.controller.ts`'s 24)
- `backfill-project-positions.ts` script (idempotent, against it-company seed)
- Dual-write hook (legacy assignment write → also writes new model)
- `project-position.fill.*` outbox event family + dual-listen in notification translator
- FE: `/projects/:id/positions` + `/people/bench` skeletons reading new endpoints

### S2.5 amendment — Timeline + JQL + Tabs (additive, ~1 week)

| Story | Output |
|---|---|
| Timeline editable mode (`editable`, `editMode`, `snapTo`, `onSegmentChange*`) | Additive props; all 14 existing callsites unchanged |
| Timeline `groupBy` swimlanes | Pre-req for Distribution Studio planner row layout |
| Timeline `heatBand` overlay | Coverage/cost heatmap layers per amendment |
| JQL field registry + autocomplete + validation | Promotes tokenizer/parser prototype to first-class |
| `StaffingDeskTab` Prisma model + endpoints | Persistent saved tabs (public/private) |
| `DS Calendar` primitive | Pre-req for `/me?tab=leave` redesign |
| `DS BalanceMeter` primitive | Pre-req for `/me?tab=leave` leave-balance UI |

### S3 — Project Pulse + PM Flow (mostly outstanding)

| Story | Status |
|---|---|
| S3-1 `ProjectPulseQueryService` aggregator endpoint | **NOT DONE** — Pulse page reads scattered endpoints today |
| S3-2 `ProjectPulsePage.tsx` Decision Dashboard | Partial — Phase D1 cosmetic only; needs real aggregator wiring |
| S3-3 `PlanTab.tsx` (Positions + Milestones + Schedule) | **NOT DONE** |
| S3-4 `MoneyTab.tsx` (skeleton; wires up in S4) | Partial — Phase D2 cosmetic |
| S3-5 Tab consolidation in `ProjectDetailPage.tsx` (7 → 3) | **NOT DONE** — biggest UX win, still legacy |
| S3-6 `CreateProjectWizard.tsx` (3-step with starter positions) | **NOT DONE** |
| S3-7 Activation approvals surface in `/admin/approvals` | **NOT DONE** |
| S3-8 External-link tiles on Pulse | **NOT DONE** |
| S3-9 BA docs (`jira-pulse-bridge.md` + `external-links-pattern.md`) | **NOT DONE** |

### S4 — Operational Budgeting + Approvals (all outstanding)

All 9 stories S4-1 → S4-9 outstanding. Key BE work:

- `EvmComputationService` (actualCost / earnedValue / plannedValue auto-compute)
- Multi-currency flag ON + `FxRateService.consolidate()` wired into rollups
- Fiscal calendar flag ON + `FiscalPeriodResolverService` wired into Money tab
- `BudgetApproval.kind` enum + auto-create on variance > X%
- Unified `/admin/approvals` aggregator (5 sources)
- `MoneyTab.tsx` (planned vs actual, variance drill, forecast)
- `docs/runbooks/budget-eom-close.md`

### S5 — People Hub + Contract Phase (~30% shipped, mostly contract phase left)

Frontend mostly done; **backend contract-phase migration is the critical remaining work**:

| Story | Status |
|---|---|
| S5-1 `PeopleDirectoryPage.tsx` | Shipped (#302) |
| S5-2 `PeopleProfilePage.tsx` composed | Shipped (#300) |
| S5-3 `PeopleHrQueuePage.tsx` | Partial (HR cards rail #296/#297; full queue aggregator pending) |
| S5-4 Bulk endpoints (`/api/people/bulk/*`) | **NOT DONE** |
| S5-5 Sunset routes (`/teams` etc.) | Partial — see §3 defer list |
| S5-6 Migrate 21 callsites of `ProjectAssignment` to `ProjectPosition.activeFill` | **NOT DONE** (depends on S2) |
| S5-7 `20260720_lean_staffing_contract` migration — drops legacy models | **NOT DONE** (depends on S2 + S5-6) |
| S5-8 Delete `ds-legacy/` + legacy CSS classes | **NOT DONE** |
| S5-9 Ratchet `check-deprecated-assignment-import.cjs` to 0 | **NOT DONE** |
| S5-10 Update `current-state.md` + `MASTER_TRACKER.md` + rename `canonical-staffing-workflow.md` → `lean-staffing-workflow.md` | **NOT DONE** |

### Employee Workspace amendment closeout (~1 week)

| Story | Status |
|---|---|
| `Calendar` + `BalanceMeter` primitives (in S2.5) | NOT DONE |
| `/me?tab=leave` redesign with Calendar + BalanceMeter + preview API | NOT DONE |
| Leave approve/reject/cancel inside `$transaction` updating LeaveBalance (closes 20c-05) | NOT DONE |
| Leave events to outbox + notification templates (closes 20b-10) | NOT DONE |
| `LeaveCalculatorService` + `LeavePolicyService` + `CapacityProfileBuilder` extraction | NOT DONE |
| Capacity reservation when leave is approved (planner sees the booking) | NOT DONE |

---

## §3 — Defer list (routes / surfaces NOT in canvas)

Per user direction: mark each `K` (keep reachable, no canvas refresh), `D` (delete in cleanup), or `?` (needs discussion). Phase E already hid most of these from the v2 sidebar via `obsoleteInV2: true` — the question now is **what to delete in the eventual S5-7 + S5-10 cleanup pass.**

### 3.1 Legacy dashboards (all redirected by E5)

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/` (legacy Workload Overview) | Workload Overview | D | D |
| `/dashboard/employee` | Employee Dashboard | D | D |
| `/dashboard/manager` | Manager Dashboard | D | D |
| `/dashboard/exec` | Exec Dashboard | D | D |
| `/dashboard/planned-vs-actual` | Planned vs Actual | D (Reports umbrella covers it) | K |
| `/dashboards/portfolio-radiator` | Portfolio Radiator | D (Director dashboard covers it) | D |
| `/dashboard/project-manager` | PM Dashboard | D (Pulse + Approvals cover the JTBDs) | D |
| `/dashboard/resource-manager` | RM Dashboard | D (Bench + Distribution Studio cover) | D |
| `/dashboard/hr` | HR Dashboard | D (HR Queue covers) | D |
| `/dashboard/delivery-manager` | Delivery Mgr Dashboard | D (Portfolio + Approvals cover) | D |

### 3.2 Admin sub-routes (currently `obsoleteInV2`)

Master plan says: **fold these into Admin tabs OR delete**. Canvas `page-admin-setup.jsx` is the canonical Admin surface with tabs for Integrations / Governance / Config / People Config / Feature Flags.

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/admin/audit` | Business Audit | K (compliance must-keep) | K |
| `/admin/notifications` | Notification Templates | D (admin tab) | D |
| `/admin/integrations` + `/registry` | Integrations & Adapter Registry | K (admin tab — operationally needed) | L |
| `/admin/monitoring` | Health/Readiness | K (SRE) | K |
| `/admin/organization-config` | Reporting Cadence + Thresholds | K (admin tab) | K |
| `/admin/radiator-thresholds` | Portfolio Radiator Config | D (16-axis radiator simplified per master plan §3.1) | D |
| `/admin/period-locks` | Period Locks | K (finance close requirement) | K |
| `/admin/setup` | Setup Wizard re-run | K (admin tab) | K |
| `/admin/feature-flags` | Feature Flags | K (admin tab) | K |
| `/admin/people/import` | Bulk CSV Import | K (HR workflow) | K |
| `/admin/vendors` | Vendor Management | D unless customer asks | K |
| `/admin/webhooks` | Webhook Subscriptions | K (integrations) | K |
| `/admin/hris` | HRIS Sync (BambooHR/Workday) | K (integrations) | D |
| `/admin/access-policies` | ABAC Policy Editor | K (security) | K |
| `/admin/responsibility-matrix` | Approver Role Matrix | D (unified approvals cover the need) | D |
| `/admin/rate-cards` | Bill Rate Config | K (Theme 4 dep — cost-rate input for EVM) | K |
| `/admin/help` | Help Article Authoring | D unless customer asks | D |
| `/metadata-admin` | Dictionary/Metadata Editor | K (HR data admin) | K |

### 3.3 Reports umbrella tabs (E3 already collapsed)

All 7 are now tabs under `/reports?section=...`. Legacy URLs still deep-link.

| Route | Tab | Suggested | User decision |
|---|---|---|---|
| `/reports/time` | Time | K (deep-link works) | K |
| `/reports/capitalisation` | CAPEX | K | K |
| `/reports/export` | Export | K | K |
| `/reports/utilization` | Utilization | K | D |
| `/reports/builder` | Builder | K (or D if no customer is using the custom-report-builder) | D |
| `/exceptions` | Exceptions | K (deep-link) | D |
| `/work-evidence` | Evidence | K (deep-link) | D |

### 3.4 Workforce sub-routes (legacy people surfaces)

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/org` | Organization hierarchy | K (visualisation, low maintenance) | K |
| `/workload` | Workload Matrix | D (Director dashboard covers) | D |
| `/workload/planning` | Workload Planning | D (Distribution Studio covers) | D |

### 3.5 Staffing / Time addons (will mostly disappear in S5 contract phase)

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/assignments` | Assignments list | **D in S5-7** (the model itself dies) | D |
| `/assignments/queue` | Approval Queue | **D in S5-7** | D |
| `/resource-pools` | Named pools | D unless RM workflow needs (per master plan §3.5 — move to `/admin/resource-pools` tab) | D |
| `/staffing-requests` | Request list | **D in S5-7** (StaffingRequest model dies) | D |
| `/staffing-requests/new` | Create staffing request | **D in S5-7** (replaced by "+ New position" on project page) | D |
| `/staffing-board` | Drag-drop board | D (Distribution Studio covers; or keep as Staffing Desk tab) | D |
| `/my-time` | Time portal | D (`/meDtab=time` covers per Employee Workspace amendment) | D |
| `/leave` standalone | Time off | D (`/meDtab=leave` covers; redirect needed) | D |
| `/timesheets` standalone | Weekly entry | D (`/meDtab=time` covers) | D |
| `/timesheets/approval` | Timesheet approval | D (becomes `/time-managementDtab=timesheets`) | D |

### 3.6 Other

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/integrations` | User-facing integrations | D (already redirects to `/admin?section=integrations`) | D |
| `/help` + `/help/:slug` | Help Center | K (flag-gated per bank per master plan §3.1) | K |
| `/teams` | Teams | **? — not in DS canvas.** Master plan §3.5 says "sunset → People Directory filter." But Phase E retained `/teams` in v2 sidebar. **Reconcile:** delete `/teams` or build a canvas mock for it | D |
| `/time-management` | Time Management | **K — refactor not delete.** Per Employee Workspace amendment §3.3 this is the flagship manager-side surface with Timesheets + Leave tabs. Currently `obsoleteInV2: true` (Phase E hid it from sidebar). **Reconcile:** re-add to v2 sidebar OR redirect from `/approvals?source=timesheet`/`?source=leave` | K |
| `/staffing-desk` | Staffing Desk | **K — refactor not delete.** Per staffing-desk amendment, this is a flagship feature with `?view=board` + `?view=planner`. Currently `obsoleteInV2: true`. **Reconcile:** re-add to v2 sidebar OR route via `/approvals` + `/projects/:id/positions` per master plan §3.1 | K |

**Two reconciliation questions emerge:** the canvas removed `/staffing-desk` and `/time-management` from the master sidebar (10 items), but amendments call them "flagship features." Either Phase E was too aggressive, or amendments need to fold these into other surfaces. Both need user decision.

---

## §4 — Recommended sequencing (concrete next actions)

The spine plan calls for 5 sprints sequentially. **Recommended adjustments given today's shipping state:**

### Week 1 — S1 closeout + S2.5 amendment start (parallel)
- S1-4 / S1-5 / S1-6 closeout (Ladle, conformance ratchet, Playwright snapshot baseline) — ~3 days
- S2.5 — start Timeline editable/groupBy/heatBand additions + Calendar + BalanceMeter atoms — ~3 days
- Both can run in parallel (different files)

### Weeks 2–3 — S2 Lean Staffing Foundation
- All 8 stories. BE-heavy. Dual-write mode means the existing app keeps working while the new aggregate accumulates data.
- **Acceptance gate:** new endpoints work against backfilled data; old `/assignments/*` endpoints unchanged; legacy E2E still green.

### Weeks 4–5 — S3 PM Flow
- Pulse aggregator + page consolidation (7 tabs → 3) + Create Wizard. FE-heavy.
- **Acceptance gate:** ProjectDetailPage default = Pulse; the 3 PM JTBDs execute in ≤3 clicks.

### Week 6 — Employee Workspace amendment closeout
- `/me?tab=leave` with Calendar + BalanceMeter + balance-in-transaction + leave events.
- Closes 20b-10 and 20c-05.

### Weeks 7–8 — S4 Operational Budgeting
- EVM auto + flag flips + unified approvals queue.
- **Acceptance gate:** EVM populated on it-company seed for all 40 projects; multi-currency reconciles to within 0.01 of single-currency.

### Weeks 9–10 — S5 People Hub + Contract Phase
- Bulk endpoints + HR queue aggregator + the **legacy model drop migration**.
- This is the cleanup that finally retires `ProjectAssignment` / `StaffingRequest` / etc.
- **Acceptance gate:** legacy assignment models gone; ratchet at 0; post-merge build-and-stage green.

### Week 11 — Soak + cutover
- The 2-week soak window from my prior (wrong) plan still applies — just now it follows a ~10-week build window, not zero.
- Playwright visual regression suite (built in S1-6) + manual click-through across 5 roles.
- Flip `dsRefresh` default ON in prod.

### Week 12 — Cleanup
- C1.1 — delete legacy frame (SidebarNav.tsx, TopHeader.tsx, HomeRedirect's `else` branch).
- C1.2 — delete legacy per-role dashboards (per §3.1 D markers).
- C1.3 — delete deferred admin routes (per §3.2 D markers).

**Total: ~12 weeks of focused work**, not "soak + flip."

---

## §5 — Reconciliation decisions (LOCKED 2026-05-24)

**Operating principle (user 2026-05-24):** _Amendments are part of the plan and **override** the master plan where they conflict._

| # | Question | Decision | Effect |
|---|---|---|---|
| 1 | `/teams` keep or sunset? | **Sunset** — fold into People Directory filter | `/teams` becomes `/people?team=<id>`. Drops from v2 sidebar. Workforce: 4→3 items. |
| 2 | `/staffing-desk` promote or fold? | **Promote** — Staffing Desk is the killer feature, per amendment | Re-added to v2 sidebar in Workspace group. Workspace: 4→5 items. |
| 3 | `/time-management` promote or fold? | **Fold** — surface as `/approvals?source=timesheet|leave` | Stays `obsoleteInV2`. No sidebar change. |
| 4 | Distribution Studio scope? | **Full** — 5 strategies + 3-tier solver + scenarios + heatmap layers | Drives the S2.5 amendment scope. Lean "Suggest fills" panel still ships as the **Position detail** quick-pick affordance, NOT as a Distribution Studio replacement. |

**Net v2 sidebar after applying #1 + #2:** still **10 items**, regrouped as 5/3/2 (was 4/4/2):

| Workspace | Workforce | Operations |
|---|---|---|
| Home (`/me`) | People | Admin |
| Projects | Bench | Settings |
| Approvals | HR Queue (`/cases`) | |
| Reports | | |
| Staffing Desk (`/staffing-desk`) | | |

**Implication for §3 defer list:** the suggested column stands unless the user explicitly overrides specific rows.

---

## §6 — What this means for the work I started today

Phases A/B/D/E are NOT wasted — they're foundational chrome that the master plan's S1 + S3 + S5 rely on. But:

- **My morning summary "the redesign is essentially complete" was wrong.** It's ~25% done.
- **My v2-operational-cutover plan was wrong.** Deleted. This document supersedes it.
- **The next session should start S1 closeout + S2.5 in parallel**, not C0 flag-flip prep.

The visual regression suite + soak window from the prior plan still apply — they just become the **last 2 weeks**, not the next 2 weeks.

---

## §7 — BA validation 2026-05-25 (post-spine read)

A deep BA-lens validation was run on 2026-05-25 against the spine plan + 2 amendments + 12 main business flows (F1–F12 from `persona-jtbds.md`). The audit re-read the actual shipped code paths (not just docs). Three categories of finding:

### 7.1 — Corrected shipping reality

§1 above already reflects the corrected percentages (~45%, not ~25%). The previously-missed shipped pieces:

- `src/modules/project-positions/` (S2 mostly done): aggregate + 7 endpoints + state machine + dual-write mirror
- `src/modules/financial-governance/application/evm-computation.service.ts` (S4 partial): EVM calc exists, wiring missing
- `frontend/src/components/ds/Calendar.tsx` + `BalanceMeter.tsx` (S2.5 partial): primitives shipped
- `close-project.service.ts` workspend emit (S5 partial): backend done, no UX surface
- The shipped `/approvals` cross-domain queue (B3) covers F5 read but not Law-7 inline-approve

### 7.2 — Live production bug (P0) — CLOSED 2026-05-25

**Gap 20c-05** — `LeaveRequestsService.{create,approve,reject}` never invoked `LeaveBalanceService`. Result: `LeaveBalance.used` + `pending` were perpetually 0 in production for every tenant using leave.

**Hot-patched in PR #332** (`fix(20c-05)`). LeaveBalance side-effects now wired on all three paths. Atomicity (Prisma `$transaction`) deferred to EW S5-E5 because the port-based repository pattern doesn't compose with transactions without a wider refactor. Net delta: "balance NEVER updated" → "balance almost always updated; reconciliable on retry." Gap 20b-10 (notifications) still open and closes in EW S5-E6.

### 7.3 — Top 5 plan-amendment gaps (ranked by operational risk)

| Rank | Gap | Effect if ignored | Plan amendment |
|---|---|---|---|
| 1 | **S4-6 ships "list-of-links" not inspector drawer** | Law 7 (one-screen approval) broken on the canvas's centerpiece. Every approver persona feels it. | Rewrite S4-6 acceptance to require an inspector drawer with inline approve/reject per source kind |
| 2 | **HR Queue aggregates skill-review + onboarding tasks that don't exist as models** | `PeopleHrQueuePage` ships as a misnamed leave-only queue | Add `S5-3a`: create `SkillReviewPrompt` + `OnboardingTask` models + producers |
| 3 | **PM "assign a team" not in any story** (PM JTBD #4) | PMs still click N times to onboard sub-team to project | Add to S5-4: `POST /api/people/bulk/assign-to-project` (fans out into N position fills) |
| 4 | **Multi-currency flag flip (S4-3) has no admin UI to set base currency** | `FxRateService.consolidate()` runtime error or silent no-op on flag flip | Add to S4-3: tiny admin tab in `/admin/settings` for base currency + FX provider |
| 5 | **External-link tiles (S3-8) ship without a setter** | Pulse tab tiles render empty; Jira/Confluence handoff stays manual | Add to S3-5 or S3-8: Project Settings → External Links CRUD |

### 7.4 — Lower-rank gaps (track but don't block kickoff)

- **G-B** — Project closeout UX refresh missing (workspend service shipped, no canvas-aligned surface)
- **G-E** — Effective-dated org-unit move history (RM JTBD #3) — bulk endpoint in S5-4 doesn't address dating
- **G-I** — Locked-period UX in redesigned TimesheetPage (S5-H1 acceptance must include read-only mode)
- **G-J** — ITSM outbound webhook (`docs/integrations/itsm-outbound-webhook.md` is doc-ware; no producer story)
- **G-K** — JQL public-tab RBAC test (staffing-desk amendment §5.4) — must be explicit S5-C1 acceptance
- **G-L** — Planner ↔ leave capacity-invalidation race — must be explicit S5-E8 sub-task

### 7.5 — BA-recommended sequencing adjustment

Insert two tiny amendments **before Sprint 3 kickoff** (~3 days inside existing Sprint 4 + 5 windows, no calendar slip):

1. **Amend S4-6 acceptance** — inspector drawer with inline approve/reject (closes Risk #1)
2. **Add story S5-3a** — `SkillReviewPrompt` + `OnboardingTask` models + producers (closes Risk #2)
3. **Add to S4-3** — base-currency admin tab (closes Risk #4)

Defer Risk #3 (team-assign) as explicit follow-on; document on tracker.

**Sprint 5 is the riskiest sprint** — the contract-phase migration (S5-7) + 21-callsite cutover (S5-6) are load-bearing for the entire lean-staffing promise. The `verify-projectassignment-callsites.ts` CI script from staffing-desk amendment §4.2 must gate.

---

## §8 — Marker legend

| Marker | Meaning |
|---|---|
| `K` | Keep reachable (no canvas refresh; deep-link still works) |
| `D` | Delete entirely in cleanup phase (C1) |
| `L` | Later — decision deferred (treat as `K` for now; revisit before C1) |
| `?` | Needs discussion |
