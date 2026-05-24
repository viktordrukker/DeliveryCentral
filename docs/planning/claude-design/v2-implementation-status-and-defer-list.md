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

The morning's shipping (Phases A/B/D/E, PRs #273–#330) addressed the **visual frame + 10-item lean sidebar**. It did NOT address the architectural shifts the master plan + canvas demand. Per-sprint reality:

| Spine sprint | Description | Status | Notes |
|---|---|---|---|
| **S1** — Design System Regeneration (2w) | New tokens + atoms + grammars + Playwright re-verify | **70% done** | Atoms (#273–#286) + tokens (#303) shipped. Missing: Ladle stories refresh, Playwright `--update-snapshots` pass, ds-conformance re-baseline |
| **S2** — Lean Staffing Foundation (2w) | `ProjectPosition` aggregate + dual-write + skeleton pages | **0%** | None of S2-1 through S2-8 has shipped. Models don't exist. |
| **S2.5** (amendment) — Timeline editable + JQL first-class + StaffingDeskTab | DS upgrades for the staffing planner | **0%** | Pre-req for Sprint 5 contract phase per amendment §1 |
| **S3** — Project Pulse + PM Flow (2w) | Pulse query + Pulse page + 3-tab consolidation + Create Wizard | **~30%** | Phase D1 (#304) shipped Pulse panel cosmetics. NO tab consolidation (still 7 tabs). NO Create Project wizard refresh. NO Pulse query service. |
| **S4** — Operational Budgeting + Approvals (2w) | EVM auto + multi-currency ON + fiscal ON + unified `/admin/approvals` | **~10%** | `/approvals` cross-domain queue UI shipped (#284, #298) but driven by manual data. NO `EvmComputationService`, currency/fiscal flags still OFF, NO BudgetApproval auto-create. |
| **S5** — People Hub + Lean Staffing Contract (2w) | Bulk ops + HR queue aggregator + legacy model drop | **~30%** | Frontend tabbed shell (#302), bench (#299), profile (#300), HR cards (#296/#297) shipped. NO bulk endpoints, NO contract-phase migration (legacy models still primary). |
| **EW** (amendment) — Employee Workspace lean | `Calendar` + `BalanceMeter` DS primitives + `/me?tab=leave` + leave transaction loop + leave notifications | **~30%** | `/me` workspace shell shipped (Phase 4a-era). Calendar + BalanceMeter primitives NOT shipped. Gaps 20b-10 (no leave notifications) + 20c-05 (balance never updated in-transaction) still open. |

**Net: ~25% of the spine's work is shipped.** The remaining ~75% is real build work (BE + FE + migrations), not soak/flag-flip.

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
| `/` (legacy Workload Overview) | Workload Overview | D | ? |
| `/dashboard/employee` | Employee Dashboard | D | ? |
| `/dashboard/manager` | Manager Dashboard | D | ? |
| `/dashboard/exec` | Exec Dashboard | D | ? |
| `/dashboard/planned-vs-actual` | Planned vs Actual | D (Reports umbrella covers it) | ? |
| `/dashboards/portfolio-radiator` | Portfolio Radiator | D (Director dashboard covers it) | ? |
| `/dashboard/project-manager` | PM Dashboard | D (Pulse + Approvals cover the JTBDs) | ? |
| `/dashboard/resource-manager` | RM Dashboard | D (Bench + Distribution Studio cover) | ? |
| `/dashboard/hr` | HR Dashboard | D (HR Queue covers) | ? |
| `/dashboard/delivery-manager` | Delivery Mgr Dashboard | D (Portfolio + Approvals cover) | ? |

### 3.2 Admin sub-routes (currently `obsoleteInV2`)

Master plan says: **fold these into Admin tabs OR delete**. Canvas `page-admin-setup.jsx` is the canonical Admin surface with tabs for Integrations / Governance / Config / People Config / Feature Flags.

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/admin/audit` | Business Audit | K (compliance must-keep) | ? |
| `/admin/notifications` | Notification Templates | D (admin tab) | ? |
| `/admin/integrations` + `/registry` | Integrations & Adapter Registry | K (admin tab — operationally needed) | ? |
| `/admin/monitoring` | Health/Readiness | K (SRE) | ? |
| `/admin/organization-config` | Reporting Cadence + Thresholds | K (admin tab) | ? |
| `/admin/radiator-thresholds` | Portfolio Radiator Config | D (16-axis radiator simplified per master plan §3.1) | ? |
| `/admin/period-locks` | Period Locks | K (finance close requirement) | ? |
| `/admin/setup` | Setup Wizard re-run | K (admin tab) | ? |
| `/admin/feature-flags` | Feature Flags | K (admin tab) | ? |
| `/admin/people/import` | Bulk CSV Import | K (HR workflow) | ? |
| `/admin/vendors` | Vendor Management | D unless customer asks | ? |
| `/admin/webhooks` | Webhook Subscriptions | K (integrations) | ? |
| `/admin/hris` | HRIS Sync (BambooHR/Workday) | K (integrations) | ? |
| `/admin/access-policies` | ABAC Policy Editor | K (security) | ? |
| `/admin/responsibility-matrix` | Approver Role Matrix | D (unified approvals cover the need) | ? |
| `/admin/rate-cards` | Bill Rate Config | K (Theme 4 dep — cost-rate input for EVM) | ? |
| `/admin/help` | Help Article Authoring | D unless customer asks | ? |
| `/metadata-admin` | Dictionary/Metadata Editor | K (HR data admin) | ? |

### 3.3 Reports umbrella tabs (E3 already collapsed)

All 7 are now tabs under `/reports?section=...`. Legacy URLs still deep-link.

| Route | Tab | Suggested | User decision |
|---|---|---|---|
| `/reports/time` | Time | K (deep-link works) | ? |
| `/reports/capitalisation` | CAPEX | K | ? |
| `/reports/export` | Export | K | ? |
| `/reports/utilization` | Utilization | K | ? |
| `/reports/builder` | Builder | K (or D if no customer is using the custom-report-builder) | ? |
| `/exceptions` | Exceptions | K (deep-link) | ? |
| `/work-evidence` | Evidence | K (deep-link) | ? |

### 3.4 Workforce sub-routes (legacy people surfaces)

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/org` | Organization hierarchy | K (visualisation, low maintenance) | ? |
| `/workload` | Workload Matrix | D (Director dashboard covers) | ? |
| `/workload/planning` | Workload Planning | D (Distribution Studio covers) | ? |

### 3.5 Staffing / Time addons (will mostly disappear in S5 contract phase)

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/assignments` | Assignments list | **D in S5-7** (the model itself dies) | ? |
| `/assignments/queue` | Approval Queue | **D in S5-7** | ? |
| `/resource-pools` | Named pools | D unless RM workflow needs (per master plan §3.5 — move to `/admin/resource-pools` tab) | ? |
| `/staffing-requests` | Request list | **D in S5-7** (StaffingRequest model dies) | ? |
| `/staffing-requests/new` | Create staffing request | **D in S5-7** (replaced by "+ New position" on project page) | ? |
| `/staffing-board` | Drag-drop board | D (Distribution Studio covers; or keep as Staffing Desk tab) | ? |
| `/my-time` | Time portal | D (`/me?tab=time` covers per Employee Workspace amendment) | ? |
| `/leave` standalone | Time off | D (`/me?tab=leave` covers; redirect needed) | ? |
| `/timesheets` standalone | Weekly entry | D (`/me?tab=time` covers) | ? |
| `/timesheets/approval` | Timesheet approval | D (becomes `/time-management?tab=timesheets`) | ? |

### 3.6 Other

| Route | Title | Suggested | User decision |
|---|---|---|---|
| `/integrations` | User-facing integrations | D (already redirects to `/admin?section=integrations`) | ? |
| `/help` + `/help/:slug` | Help Center | K (flag-gated per bank per master plan §3.1) | ? |
| `/teams` | Teams | **? — not in DS canvas.** Master plan §3.5 says "sunset → People Directory filter." But Phase E retained `/teams` in v2 sidebar. **Reconcile:** delete `/teams` or build a canvas mock for it | ? |
| `/time-management` | Time Management | **K — refactor not delete.** Per Employee Workspace amendment §3.3 this is the flagship manager-side surface with Timesheets + Leave tabs. Currently `obsoleteInV2: true` (Phase E hid it from sidebar). **Reconcile:** re-add to v2 sidebar OR redirect from `/approvals?source=timesheet`/`?source=leave` | ? |
| `/staffing-desk` | Staffing Desk | **K — refactor not delete.** Per staffing-desk amendment, this is a flagship feature with `?view=board` + `?view=planner`. Currently `obsoleteInV2: true`. **Reconcile:** re-add to v2 sidebar OR route via `/approvals` + `/projects/:id/positions` per master plan §3.1 | ? |

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
