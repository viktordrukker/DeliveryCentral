# DeliveryCentral — Lean Simplification Initiative

**Plan id:** `now-it-is-essential-kind-candy`
**Drafted:** 2026-05-23
**Pacing:** Staged — 5 sprints × 1–2 weeks each (~10 weeks total)
**Scope owner:** PM persona signs off all 5 themes up front; Architect + UX + Dev Lead deliver per sprint.

---

## 0. Context

DeliveryCentral has shipped 11 sprints (F-2..F-11) plus Phases CSW / WO / DS / DM since the bank-IT pivot of 2026-05-10. The platform is operationally rich (37 backend modules, 106 Prisma models, 7 platform roles, 4 integration adapters) and **fully standardized** on the DS-7 design system (0 conformance violations).

But that richness is now the problem:

- **Staffing has accreted ceremony.** 10 assignment statuses, slate + candidate + approval + SLA stages, separate StaffingRequest entity, separate WorkforcePlanner Distribution Studio. Three models conceptually overlap (StaffingRequest = demand; ProjectAssignment = supply; AssignmentProposalSlate = proposed match). The PM/RM mental model isn't this — they think "Position on a project; Person fills it; that fill has a lifecycle."
- **Project management is structurally complete but conceptually scattered.** 16-axis Radiator, 7 detail-page tabs, Milestones + Change Requests + Risks + Workstreams + RolePlans + VendorEngagements + Retrospectives + Budget + Lifecycle — but no single "what's the state of this project right now" surface that a non-PM exec can act on.
- **Budgeting is schema-rich, runtime-stub.** ProjectBudget with 5 EVM columns exists, but EV/AC/PV are manually seeded; FxRate + FiscalCalendar are flag-OFF; BudgetApproval workflow ships only the schema and one CTA.
- **People management is shipped but lacks a clean home for everyday HR work.** Person model is mature; EmployeeDetailsPage works; but lifecycle events, skills, cost rates, leave/timesheet, and release flows are scattered across 6+ routes.
- **The DS is mature but visually generic.** DS-7 closed at 0 violations with 18 atoms / 95 tokens / 8 grammars, but the visual language is "competent enterprise" — not a differentiating brand. Bank-IT customers will pay for a clean, modern, opinionated visual identity.

This plan simplifies all five surfaces under a single guiding principle: **fewer concepts, fewer clicks, more truth.**

The architectural pivot at the heart of it: **Assignment is no longer an entity. It is an aggregate** over the edge `Project → Position → Person`. Project has Positions (the demand). Each Position has at most one active Person fill with a lifecycle (draft / open / proposed / booked / onboarding / assigned / on-hold / released). Bench = a Person with no active fill. StaffingRequest collapses into Position. AssignmentProposalSlate collapses into "candidates considered for this Position."

---

## 1. Goals & Non-Goals

### Goals (5 themes)

| # | Theme | Outcome |
|---|---|---|
| 1 | **Design system regeneration (Claude Design)** | Fresh visual language + atoms + page templates handed off by Claude Design and implemented across the app |
| 2 | **Lean staffing flow** | Project → Position → Person aggregate; collapse StaffingRequest + ProjectAssignment + Slate into one model with a 7-state lifecycle |
| 3 | **Project summary + lean PM flow** | Single "Project Pulse" surface that gives any role the state of a project in 5 seconds; consolidate 7 tabs to 3 |
| 4 | **Operational budgeting** | Auto-compute EV/AC/PV; multi-currency + fiscal calendar ON; expanded approval workflow; new budget workspace UI |
| 5 | **People management** | Single "People Hub" combining directory + 360 + lifecycle + skills + cost + time/leave in a coherent grammar |

### Non-goals

- **No new third-party integrations** — Jira / Confluence / M365 / LDAP / OIDC / Radius / HRIS adapters stay as-is (Cat-1 stack is shipped). Build OUT integration UX (clean handoff surfaces) but do not chase new connectors this initiative.
- **No JSM Cloud** unless explicitly demanded (currently deferred).
- **No multi-tenant activation** — single-tenant per bank stays. `flag.tenancy.multiTenant.enabled=false`.
- **No mobile app** — responsive web only.
- **No AI features in the product surface** beyond what's in the LLM scaffold (F-4.1).
- **No replacement of Jira / Confluence / ServiceNow** — wire to them at clean handoff boundaries.

---

## 2. The Architectural Shift — Assignment as Aggregate

### Current model (what's there)

```
StaffingRequest (demand)        ProjectAssignment (supply, 10 states)
   │  status: DRAFT/OPEN/             status: DRAFT/CREATED/PROPOSED/
   │  IN_REVIEW/FULFILLED/             IN_REVIEW/REJECTED/BOOKED/
   │  CANCELLED                        ONBOARDING/ASSIGNED/ON_HOLD/
   │  ┌─ proposal slate ─┐             COMPLETED/CANCELLED
   │  │ candidates ranked │
   └──┤ scored, decided  ├──► fulfilled by → ProjectAssignment row
      └──────────────────┘
```

Three models, two lifecycles, two state machines. PMs/RMs ask "who's on what?" — the answer requires three joins.

### Target model (what we're building)

```
Project ──has── ProjectPosition ──filled by── Person
                    │
                    │ aggregate lifecycle (single state machine):
                    │
                    ▼
            Position.fillStatus:
              DRAFT       — PM is shaping the position, not open yet
              OPEN        — accepting candidates (was: StaffingRequest OPEN)
              PROPOSED    — a Person is named on this Position (was: Slate pick / ProjectAssignment PROPOSED)
              BOOKED      — Person confirmed, allocation + dates pinned (was: BOOKED)
              ONBOARDING  — Person starting (was: ONBOARDING)
              ASSIGNED    — Person actively working (was: ASSIGNED)
              ON_HOLD     — paused (was: ON_HOLD)
              RELEASED    — Person off this Position (was: COMPLETED / CANCELLED terminal merge)

            Position has zero/one active Person at a time.
            Position has many historical fills (audit trail).
```

**Bench is derived:** `Person` is on the bench iff no `ProjectPosition` has them as the active fill with allocationPercent > 0 on today's date.

**A "release" is just a state transition** on the Position (ASSIGNED → RELEASED), which leaves the Person without an active Position, i.e. on the bench.

**A "transfer from project A to project B" is two transitions:** Position A's fill → RELEASED; Position B's fill → BOOKED (or ASSIGNED if immediate). Both audit-logged.

### What this collapses

| Today (3 models, 15 statuses) | Tomorrow (1 model, 8 statuses) |
|---|---|
| `StaffingRequest` + 5 statuses | merged into `ProjectPosition` |
| `StaffingRequestProposalSlate` + 4 statuses | merged into `ProjectPosition` (each position has candidates) |
| `StaffingRequestProposalCandidate` + 4 decisions | retained as `ProjectPositionCandidate` (the only sub-entity) |
| `StaffingRequestFulfilment` | dropped — fulfilment IS the fillStatus transition |
| `ProjectAssignment` + 10 statuses + 21+ columns | merged into `ProjectPosition.activeFill` + `ProjectPositionFillHistory` (immutable audit) |
| `AssignmentApproval` (separate model) | merged into `ProjectPositionFillHistory.approval` (JSON snapshot) |
| `AssignmentHistory` | merged into `ProjectPositionFillHistory` |
| `PersonReleaseRequest` + `PersonReleaseApproval` | dropped — RELEASED is just a state transition (HR/RM/PM can do it, audit-logged) |

What we **don't** drop (data preservation):
- SLA tracking (slaStage / slaDueAt etc.) — moves onto `ProjectPosition`
- Billing rate pinning (`appliedRateCardEntryId` / `effectiveBillRate`) — moves onto `ProjectPositionFillHistory`
- Allocation percent + dates — move onto `ProjectPosition.activeFill`
- Skills + role + grade for matching — move onto `ProjectPosition`

### Migration approach

Expand-contract over Sprint 2 (lean staffing):
1. Add `ProjectPosition` + `ProjectPositionCandidate` + `ProjectPositionFillHistory` models alongside existing.
2. Backfill from `StaffingRequest` + `ProjectAssignment` + `AssignmentProposalSlate`.
3. Write to both during transition; reads switch to new model.
4. Drop legacy models in the contract phase of Sprint 5.

---

## 3. Persona Analysis

### 3.1 Product Manager (20+ yrs ERP / supply-demand / planning)

#### Pivot / carve-out (non-valuable items)

| Drop / De-emphasize | Reason |
|---|---|
| **JSM Cloud connector** | Deferred at F-4.6; banks usually use ServiceNow or in-house ITSM; wire later if a customer asks |
| **Pulse mood + heatmap** | Off-by-default per pivot decision; keep flag, don't surface in main nav |
| **Help Center** | Keep but flag-gate per bank (`flag.helpCenter.enabled`); don't invest in content this initiative |
| **WorkforcePlanner "Distribution Studio" 3-tier solver** | Powerful but mental-model-heavy; replace with a simpler "Suggest fills for open positions" panel inside Position detail (single-page, no scenarios) |
| **DimensionDetailModal (radiator override)** | 16-axis manual override is too granular; consolidate to 4-quadrant override only |
| **Slate / candidate ranking model as separate concept** | Collapses into Position+candidates |
| **PersonReleaseRequest / dual-approval offboarding** | Replaced by lean transition; HR audit retained via AuditLog + EmploymentEvent |

#### Essential features (Pareto — 80% of value)

**Theme 1 — Lean staffing (target the 80%):**
1. **Project Position list** per project (replaces Staffing Requests page) — Position table with role, skills, allocation, dates, fill status, candidate count, active fill name.
2. **One-click "Open this position"** from project create flow.
3. **Suggest fills panel** — for each Open Position, suggest 5 best candidates (skill match + availability + cost) inline, single click to propose.
4. **Position detail page** — full lifecycle of one position in one screen (current fill + history + candidates + approvals).
5. **Bench surface** — list of People with no active fill, with hire-date / skills / last release / suggested next positions.
6. **Move person between projects** — one action on Person 360 or Position detail.

**Theme 3 — Lean PM flow:**
1. **"Project Pulse" tab** as the default project tab — single screen with RAG quadrant scores (4, not 16) + open positions + budget variance + next milestone + open risks (top 3) + next decision needed.
2. **3-tab consolidation:** Pulse (default) | Plan (positions + milestones + schedule) | Money (budget + EVM + invoices). Other tabs (Risks / Workstreams / Vendors / Lifecycle / Retro) become drill-downs from Pulse, not top-level tabs.
3. **One-click activation** for a draft project with all required Positions defined.
4. **Auto-snapshot RAG weekly** (already partially shipped via ProjectRagSnapshot).

**Theme 4 — Operational budgeting:**
1. **Auto-compute EVM** — actualCost from approved timesheets × PersonCostRate; earnedValue from milestone weight × completion; plannedValue from baseline schedule.
2. **Budget workspace** — project Budget tab redone as Money tab with: planned vs actual chart, variance drill, forecast curve, top cost lines (vendor + people + capex), change requests.
3. **Multi-currency ON** — flip the flag, validate FxRate consumption, surface tenant base currency vs project currency.
4. **Fiscal calendar ON** — flip the flag, expose period rollups in Money tab.
5. **Approval expansion** — BudgetApproval covers initial budget + reforecast + change-request impact + capex/opex reclassification. Single approvals queue under `/admin/approvals`.

**Theme 5 — People Hub:**
1. **Single People page** with two surfaces:
   - **Directory** (search + filter + grid/list toggle) — replaces `/people` list
   - **Profile** (the 360) — Identity + Employment + Position history + Skills + Cost + Time/Leave summary + Activity timeline
2. **HR queue** under `/people/hr-queue` — pending leave approvals + onboarding tasks + offboarding tasks + skill review prompts
3. **Bulk operations** — bulk skill update, bulk leave-balance refresh, bulk org-membership move

**Theme — Time/Leave/Vacation (de-scoped from explicit theme, folded into People Hub):**
- Keep existing TimesheetWeek / LeaveRequest / OvertimePolicy schemas and flows.
- Surface them inside People Profile (summary) + a dedicated `/my-time` (employee self-service) and `/people/hr-queue` (approver).
- No structural changes this initiative.

#### Wire-to-not-replace integrations (the gap-bridging)

| External | Today's contract | Bridge to build |
|---|---|---|
| **Jira PPM** | Read-only project sync via `JiraProjectAdapter` | Add: pull Jira issue counts + sprint metrics into Project Pulse → "Delivery velocity" KPI. Don't import issues themselves. |
| **Jira / Confluence** | Not linked from project | Add: "External links" section on Project Pulse — paste Jira project key + Confluence space key, surface as click-through tiles. |
| **M365 directory** | Pulls users + manager hierarchy | Already wired (D-156); document the operator runbook for first-week reconciliation. |
| **M365 Outlook calendar** | Not wired | Add: read-only "calendar overlap" check for proposed assignments — surface conflicts via Outlook free-busy. (Stretch goal.) |
| **MS Teams** | Webhook channel exists | Add: "Open Position" + "Approval Needed" + "SLA Breach" notifications route to a project channel webhook (configured per project). |
| **LDAP** | Group → role mapping | Already wired (NEW C1-LDAP); document group convention for new banks. |
| **Servicedesk (generic ITSM webhook)** | None | Add: outbound webhook on `case.opened` + `case.completed` for downstream ticketing. |

---

### 3.2 Business / System Analyst (BABOK lens)

#### Process streamlining

For each theme, the BA pass surfaces dups + ambiguity + waste:

**Theme 2 — Staffing process today (15 steps RM→PM→Person→PM→RM→RM→Person):**
```
PM creates Project → PM creates StaffingRequest → RM sees Request → RM builds Slate → 
RM proposes candidates → PM picks one → PM transitions to BOOKED → RM transitions to ONBOARDING → 
RM transitions to ASSIGNED → ... → RM/PM transitions to COMPLETED → RM checks Person is on bench → 
PM closes StaffingRequest (sometimes auto, sometimes manual)
```

**Lean process (7 steps PM→RM→Person→PM):**
```
PM adds Position(s) to Project → RM/system suggests fills → 
RM proposes Person → PM books → Person onboards → Person assigned → 
PM releases (Person back to bench, automatic)
```
**8 manual steps removed** by collapsing models + auto-deriving bench + auto-closing positions on release.

**Theme 3 — PM project setup today (8 screens):**
- Create Project → Activation Approval queue → Activate → Add Workstreams → Add Roles to Workstreams → Define Risks → Schedule Milestones → Open Staffing Requests
**Lean (3 screens):**
- Create Project (with starter Positions + milestones in the wizard) → Activation → Auto-track
- Reuse existing `ProjectActivationApproval` flow but pre-fill positions + milestones from a template chosen at creation.

**Theme 4 — Budget approval today (manual, schema-only):**
- BudgetApproval rows exist but no review queue UI, no auto-trigger
**Lean:**
- Auto-create BudgetApproval row on any ProjectBudget mutation > X% variance from baseline
- `/admin/approvals` single queue (combines budget + assignment + leave + onboarding-case approvals)
- Approver sees full context inline (one-screen approval per UX Law 7).

#### Data model changes

(Detailed in Architect section §3.3 below; BA's view here is *what* changes, not *how*.)

| Change type | Models affected | Reason |
|---|---|---|
| **NEW models** | `ProjectPosition`, `ProjectPositionCandidate`, `ProjectPositionFillHistory` | Aggregate the staffing lifecycle |
| **DROPPED models** (in Sprint 5 contract phase) | `StaffingRequest`, `StaffingRequestProposalSlate`, `StaffingRequestProposalCandidate`, `StaffingRequestFulfilment`, `PersonReleaseRequest`, `PersonReleaseApproval` | Replaced by lean aggregate |
| **REPURPOSED** | `ProjectAssignment` | Demoted to a view / read model over `ProjectPosition.activeFill`; eventual drop after Sprint 5 |
| **EXTENDED** | `ProjectBudget` (auto-compute hooks), `BudgetApproval` (broader scope), `ProjectMilestone` (weight for EV calc) | Operational budgeting |
| **PROMOTED** | `Position` (orgUnit-bound today) → kept as-is; new `ProjectPosition` is parallel (project-bound) | Avoid term collision |

#### Integration / external API documents (BA deliverables)

| Doc to author | Purpose |
|---|---|
| `docs/integrations/jira-pulse-bridge.md` | Pull issue counts + sprint velocity for "Delivery velocity" KPI |
| `docs/integrations/external-links-pattern.md` | Convention for `ProjectExternalLink` (Jira project key + Confluence space key + Teams channel webhook + Jira board) |
| `docs/integrations/m365-outlook-freebusy.md` | Read-only calendar overlap check (stretch) |
| `docs/integrations/teams-channel-webhook-routing.md` | Per-project Teams channel notification mapping |
| `docs/integrations/itsm-outbound-webhook.md` | Generic case-opened / case-completed outbound webhook contract |
| `docs/api/openapi-snapshot-2026-Q3.yaml` | Snapshot of `/api/docs` Swagger after lean refactor (for external partner integrations) |

#### Ambiguity + complexity audit (BA's surfacing pass)

| Ambiguous today | Lean resolution |
|---|---|
| Is bench a Person property, a query, or a model? | A query: `Person.activeFills.count() == 0` on date |
| What's the difference between StaffingRequest.headcountFulfilled and ProjectAssignment.count()? | Same number; collapses into `ProjectPosition.activeFill IS NOT NULL` |
| When does an assignment "end"? RELEASED vs COMPLETED vs CANCELLED? | Single RELEASED terminal state; the *reason* + the Position's final state are audit fields |
| Why are there 4 SLA stages on assignment but only 3 stages of staffing flow? | SLA collapses to two: open-too-long, fill-pending-too-long |
| Why does PersonReleaseRequest exist alongside Assignment ON_HOLD/COMPLETED? | Doesn't — RELEASED transition does the same thing audit-wise |

---

### 3.3 Solutions / Software Architect (ERP)

#### Current architecture (relevant subset)

- **Backend:** NestJS modular monolith, 37 modules. Identity-access guards (`@RequireRoles` + `@AllowSelfScope` + `@ReadAction`).
- **DB:** Postgres 16, 106 Prisma models. Hash-chained AuditLog. DM-7.5 RLS scaffolding (single-tenant per install).
- **Frontend:** React + Vite, 30 route trees, DS-7 at 0 violations.
- **Outbox:** DM-7 DomainEvent + OutboxEvent + producers (D-142 flag ON since F-6.5).

#### Solution details per theme

**Theme 1 — Design system regeneration**

| Aspect | Decision |
|---|---|
| Replacement strategy | Greenfield DS at `frontend/src/components/ds/` — current 18 components retained as `frontend/src/components/ds-legacy/` for the migration window |
| Tokens | New `frontend/src/styles/design-tokens.ts` (full replace). Light/dark/system mode + responsive scale preserved; visual language regenerated |
| Migration | Page-by-page swap over Sprints 1-5. Phase 18 grammars persist as *layout contracts*; the visual fill is new |
| Conformance ratchet | `scripts/check-ds-conformance.cjs` re-baselined to the new DS atoms. Old `.button` / `.field` / `.kpi-strip` CSS classes baseline-allowed during transition, then deleted in Sprint 5 |
| UX contracts | All 24 contracts re-verified against new DS; Playwright regression suite stays green throughout |
| Risk | Visual regression on 50+ pages — mitigate with screenshot diffing in CI (`playwright --update-snapshots` per sprint) |

**Theme 2 — Lean staffing (Position-as-aggregate)**

| Aspect | Decision |
|---|---|
| New models | See §2 + §3.2; expand in Sprint 2, contract in Sprint 5 |
| Service refactor | `src/modules/staffing-requests/` → `src/modules/project-positions/`. New `ProjectPositionService` + `TransitionProjectPositionFillService`. Old assignments module kept until contract phase. |
| Controller refactor | `assignments.controller.ts` 24 endpoints → `project-positions.controller.ts` ~10 endpoints (`GET /positions`, `POST /positions`, `POST /positions/:id/transition`, `POST /positions/:id/candidates`, `GET /people/bench`, etc.) |
| State machine | `src/modules/project-positions/domain/position-fill-status.ts` — single value object + transitions matrix. Replaces `ASSIGNMENT_STATUS_TRANSITIONS`. |
| Backward-compat read API | Keep `GET /assignments/*` returning a view over `ProjectPosition.activeFill` until Sprint 5; mark as deprecated in Swagger |
| Migration scripts | `prisma/migrations/20260601_lean_staffing_expand/` (forward-only) + companion `prisma/scripts/backfill-project-positions.ts` |
| Outbox events | New `project-position.fill.*` event family; old `assignment.*` events stay during transition, removed in Sprint 5 |

**Theme 3 — Project Pulse + lean PM flow**

| Aspect | Decision |
|---|---|
| New page | `frontend/src/routes/projects/ProjectPulsePage.tsx` (replaces default tab on ProjectDetailPage) |
| Backend support | New `ProjectPulseQueryService` aggregates: RAG scores, open positions count, budget variance, next milestone, top 3 risks, suggested next decision. Single endpoint `GET /api/projects/:id/pulse` |
| Tab consolidation | Remove tabs from ProjectDetailPage; replace with 3-tab grammar (Pulse / Plan / Money) |
| Quadrant rollup | Existing 16-axis Radiator scoring stays as compute engine; UI surfaces 4 quadrant scores |
| External-link tiles | `ProjectExternalLink` already supports multi-provider; add `kind` enum (`jira` / `confluence` / `teams` / `gantt`) + render as tiles on Pulse |

**Theme 4 — Operational budgeting**

| Aspect | Decision |
|---|---|
| EVM auto-compute | New `EvmComputationService` in `src/modules/financial-governance/application/`. Runs on cron (nightly) + on-demand. Recomputes from approved timesheets + milestone completion. |
| Currency consolidation | Flip `flag.feature.financial.multiCurrency.enabled` ON in Sprint 4. Wire `FxRateService.consolidate()` into all currency-aware reads (budget rollups, person cost rates, vendor invoices). |
| Fiscal calendar | Flip `flag.feature.financial.fiscalCalendar.entity.enabled` ON in Sprint 4. Wire `FiscalPeriodResolverService` into Money tab + monthly rollup APIs. |
| BudgetApproval scope expansion | Add `kind` enum (`INITIAL_BUDGET` / `REFORECAST` / `CHANGE_REQUEST` / `RECLASSIFICATION`). Auto-create approval row on mutation > X% variance (configurable per project). |
| Unified approvals queue | New `/admin/approvals` page + `GET /api/approvals` aggregating BudgetApproval + ProjectActivationApproval + Position.PROPOSED + LeaveRequest + onboarding-case approvals. |
| Money tab | `frontend/src/routes/projects/MoneyTab.tsx` — planned vs actual + variance drill + forecast curve + top cost lines + change requests inline. |

**Theme 5 — People Hub**

| Aspect | Decision |
|---|---|
| New routes | `/people` (directory), `/people/:id` (profile), `/people/hr-queue` (approvals + tasks) |
| Profile composition | Compose existing PersonSkillsTab + Person360Tab + PersonActivityFeed in a new shell; add Position History + Cost Rate timeline + Time/Leave summary |
| Bulk operations | New `POST /api/people/bulk` endpoints (skill update, leave-balance refresh, org-membership move). Audit-logged. |
| HR queue | Aggregate over leave-approval + onboarding-case + offboarding-case + skill-review-prompts |
| Org chart | Keep `/org` route as-is; link from People Hub |
| Sunset routes | `/teams` (low use), `/resource-pools` (move admin to `/admin/resource-pools`), `/time-management` (move to `/admin/time-policies`) |

#### Dependency + wiring audit

| Concern | Status today | Lean state |
|---|---|---|
| `assignment-workload` module | Alias re-export of `assignments.module.ts` | Drop alias in Sprint 5 |
| Cross-module imports of `ProjectAssignment` | 21 callsites across dashboards/reports/timesheets | Replace with `ProjectPosition.activeFill` read; ratchet at `scripts/check-deprecated-assignment-import.cjs` (NEW guardrail) |
| `WorkforcePlanner.tsx` (the Distribution Studio) | 3-tier solver + scenarios | Simplify to "Suggest fills for this Position" panel inside Position detail page; deprecate scenario UI |
| `StaffingRequestDetailPage` | Recently migrated to DS-5 (PR #220) | Replace with `ProjectPositionDetailPage`; redirect old URLs |
| `EmployeeDetailsPlaceholderPage` | 5 tabs | Move tabs into `PeopleProfilePage` shell; keep redirect 1 release |
| Outbox event versioning | `assignment.*` events have downstream consumers (notifications + radiator + RM dashboard) | New `project-position.fill.*` events; mappers in `notification-event-translator.service.ts` cover both during transition |

#### Deployment + hardware + system requirements

(Single-tenant per-bank install; bank-IT framing.)

| Component | Min | Recommended | Notes |
|---|---|---|---|
| **Backend container** | 1 vCPU / 2 GB RAM | 2 vCPU / 4 GB RAM | Increased from baseline (was 1 GB) due to EVM cron + outbox publisher under load |
| **Frontend container** | 0.5 vCPU / 512 MB RAM | 1 vCPU / 1 GB RAM | Static SPA + Vite preview at edge |
| **Postgres 16** | 1 vCPU / 1 GB RAM / 20 GB SSD | 2 vCPU / 4 GB RAM / 100 GB SSD | EVM history + audit chain grow linearly with org size; expect ~50MB/month per 500-person org |
| **Redis** (cache + outbox cursor) | 256 MB RAM | 512 MB RAM | Optional but recommended for outbox publisher backoff state |
| **OS / runtime** | Docker 24+ / linux x86_64 | Same | WSL2 supported for dev only |
| **TLS** | Reverse proxy (Caddy / Traefik / nginx) | Caddy preferred | Auto-renew via ACME; staging at `deliverit-test.agentic.uz` runs this shape |
| **Backups** | Daily pg_dump + WAL | Hourly snapshot + 30-day retention | Bank-IT typically demands PITR; D-167 v1 redact-payload covers right-to-erasure |
| **Outbound network** | Smtp + Teams webhook + LDAP + M365 Graph + Jira REST + (optional) OIDC IdP | Same | Document allowed egress in `docs/runbooks/network-allowlist.md` |
| **Inbound network** | HTTPS on chosen domain + setup token first boot | Same | OIDC callback URL whitelist |

#### Sign-off

The Architect signs off the lean staffing aggregate IF:
- Migration is forward-only with backfill scripts proven on the it-company seed (200 persons, 40 projects, 5-year history)
- Read backward-compat (`GET /assignments`) preserved for 1 release
- Notification event consumers updated to dual-listen during transition
- The deprecation ratchet (`scripts/check-deprecated-assignment-import.cjs`) blocks new callers
- The 80%-coverage E2E test (Playwright) — full staffing happy path + 3 edge cases — passes against the new model end-to-end

---

### 3.4 UX / UI Designer

#### Universal UX rules (enforced — per `CLAUDE.md` UX Laws)

- **3-click rule** for every core action (approve / assign / submit / resolve).
- **No dead-end screens** — every page has at least one forward action.
- **No context loss after actions** — stay on the working surface, toast next-action.
- **Action-data adjacency** — action button within 200px of the row.
- **Filter persistence via URL** — back nav restores filtered view.
- **One-screen approval** — all approval context visible without scrolling.
- **Every KPI is a clickable drilldown.**
- **Workspace continuity** — remember last tab / scroll / sort.

#### UX gaps (today's friction, fixed in this initiative)

| Gap | Fix |
|---|---|
| Staffing flow requires 3 separate pages (`/staffing-requests`, `/staffing-desk`, `/assignments`) | Single `/projects/:id/positions` and `/people/bench` |
| Project state requires switching between 7 tabs | Single Pulse tab |
| Approving anything requires going to a specific page (`/cases/:id` for case approve, project Budget tab for budget approve, etc.) | Single `/admin/approvals` queue |
| Person profile data is split across 5 tabs (Overview / History / Skills / 360 / Activity) | Composed in one scrollable Profile shell |
| Budget data is invisible until you click into a specific project's Budget tab | Money tab on Pulse + portfolio Money rollup |
| Distribution Studio requires 5 strategies + 3-tier solver knowledge to use | "Suggest fills" inline panel — 1 button, top-5 list, click to propose |
| Setting up a new project requires 5 screens | Single Create Project wizard with starter Positions + milestones |

#### Best UX practices applied (researched references)

(Citations omitted; pulled from common enterprise SaaS UX patterns: Linear, Notion, Float, Kantata, Float, Asana for cross-functional approval queues. ChartIQ / Highcharts patterns for variance dashboards. Atlassian Confluence for external-link tiles. Workday for People Hub tabs.)

- **One screen, one job** — Pulse, Plan, Money each answer one PM question
- **Approve-in-place** — never bounce to another page to act
- **Inline suggestions** > separate Studio — present 5 candidates beside the position, not in a planner screen
- **Progressive disclosure** — top-level KPI → drill into table → drill into row → action
- **Skeleton states everywhere** — DS already has `<LoadingState variant="skeleton">`
- **Empty state with forward action** — every empty list has a "Create" CTA

#### Design system handoff — Claude Design prompt

(Full prompt in §4. The Claude Design call should be run by the user at `claude.ai/design`; the handoff bundle gets implemented in Sprint 1.)

#### Per-theme UX deliverables

| Theme | Screens to design (Claude Design) |
|---|---|
| **Lean staffing** | Project Positions list, Position detail, Bench page, Suggest-fills inline panel, Transfer-between-projects modal |
| **PM flow** | Project Pulse, Plan tab, Money tab, Create-Project wizard, Activation queue |
| **Budgeting** | Money tab (planned vs actual, variance drill, forecast), Approval queue, Budget change request form |
| **People Hub** | Directory, Profile, HR Queue, Bulk operations modal |
| **DS atoms (new visual language)** | Button, Input, Select, Checkbox, Switch, Modal, Drawer, Popover, Tabs, Table, DataView, KPI card, Quadrant card, Timeline, Sparkline, EmptyState, ErrorState, LoadingState, ConfirmDialog, ToastStack |
| **Page grammars** | Decision Dashboard (refreshed), List-Detail Workflow (refreshed), Detail Surface (refreshed for Project Pulse), Create Wizard (NEW), Approval Queue (NEW), Profile Surface (refreshed for People), Settings (refreshed for /admin) |

---

### 3.5 Dev Team Lead — sprint decomposition

5 sprints × 1-2 weeks each. Each sprint = 1 PR per story (per `feedback-ci-green-before-merge` strict rule). PRs auto-merge when CI green (per `feedback-auto-merge-when-green`). Each story ≤ 1 day of work where possible.

#### Sprint 1 — Design System Regeneration (2 weeks)

**Goal:** Claude Design handoff bundle implemented as new DS atoms + tokens; old DS retained as `ds-legacy`.

| Story | Output | Effort |
|---|---|---|
| **S1-1** Run Claude Design with brief from §4. Capture handoff bundle to `/tmp/dc-design-bundle/`. | tokens.css + components + mockups + asset pack | 1-2 days (user runs Claude Design) |
| **S1-2** Add new tokens at `frontend/src/styles/design-tokens.ts` (full replace; current saved as `.legacy.ts`) | New tokens shipped, MUI theme regenerated | 0.5 day |
| **S1-3** Build new atoms in `frontend/src/components/ds/` (override existing files); current saved as `ds-legacy/` | Button / Input / Select / Checkbox / Switch / Modal / Drawer / Popover / Tabs / Table / DataView / KPI / Sparkline / Empty / Error / Loading / ConfirmDialog / Toast | 3-4 days |
| **S1-4** New page grammars at `docs/planning/phase18-page-grammars.md` (refresh) + per-grammar Ladle stories | 8 grammars × 2 stories each | 1 day |
| **S1-5** Re-baseline `scripts/check-ds-conformance.cjs` to new DS; old classes allowed in legacy baseline | Conformance ratchet updated | 0.5 day |
| **S1-6** Re-verify all 24 UX contracts on new DS via Playwright `--update-snapshots`; review diffs | 193 regression tests stay green | 1-2 days |

**Sprint 1 acceptance:** `npm --prefix frontend run test` green; `npm run ds:check` green; Ladle (`npm run ladle`) shows new atoms; 1 sample page (DashboardPage) renders on new DS as canary.

---

#### Sprint 2 — Lean Staffing Foundation (2 weeks)

**Goal:** New ProjectPosition aggregate (expand phase); old models still primary.

| Story | Output | Effort |
|---|---|---|
| **S2-1** Add `ProjectPosition` + `ProjectPositionCandidate` + `ProjectPositionFillHistory` to schema + migration `20260601_lean_staffing_expand` | Models live in dev | 0.5 day |
| **S2-2** Domain: `position-fill-status.ts` value object + transitions matrix + entity helpers (`fillPosition()`, `transitionFill()`, `releaseFill()`) | Tests pass for matrix + helpers | 1 day |
| **S2-3** Services: `project-position.service.ts` (CRUD) + `transition-project-position-fill.service.ts` (state machine) + `suggest-fills.service.ts` (port of solver, simplified to single Position) | Unit tests | 2 days |
| **S2-4** Controllers: `project-positions.controller.ts` with `GET /positions`, `POST /positions`, `GET /positions/:id`, `POST /positions/:id/transition`, `POST /positions/:id/candidates`, `GET /people/bench` | Endpoints in Swagger | 1 day |
| **S2-5** Backfill script `prisma/scripts/backfill-project-positions.ts` — fills new tables from existing StaffingRequest + ProjectAssignment + Slate. Idempotent. | Backfill runs clean on it-company seed | 1 day |
| **S2-6** Dual-write hook: every existing assignment / staffing-request write also writes the new model (transitional adapter) | Integration tests cover both models | 1 day |
| **S2-7** Outbox events: `project-position.fill.*` family + dual-listen in notification translator | Event flows tested | 0.5 day |
| **S2-8** Frontend skeleton: `/projects/:id/positions` route + `/people/bench` route (read-only, fed by new endpoints) | Pages render | 1 day |

**Sprint 2 acceptance:** New endpoints work against backfilled data; old endpoints unchanged; e2e staffing test (legacy path) still green.

---

#### Sprint 3 — Project Pulse + PM Flow Lean (2 weeks)

**Goal:** Single Project Pulse tab + 3-tab consolidation + create-project wizard.

| Story | Output | Effort |
|---|---|---|
| **S3-1** `ProjectPulseQueryService` aggregates 4-quadrant RAG + positions + budget variance + milestones + top risks + next decision | `GET /api/projects/:id/pulse` | 1 day |
| **S3-2** `ProjectPulsePage.tsx` — Decision Dashboard grammar, KPI strip, quadrant cards, position table, decisions panel | Page renders | 1.5 days |
| **S3-3** `PlanTab.tsx` — Positions + Milestones + Schedule (replaces Milestones / Risks / Change Requests / Workstreams tabs as drilldowns) | Tab renders | 1.5 days |
| **S3-4** `MoneyTab.tsx` (skeleton — wires up in Sprint 4) | Stub | 0.5 day |
| **S3-5** Tab consolidation in `ProjectDetailPage.tsx` — Pulse / Plan / Money; legacy tabs redirect (Milestones → Plan, etc.) | Routes update | 0.5 day |
| **S3-6** `CreateProjectWizard.tsx` — 3-step wizard (Identity → Positions + Milestones template → Activation) | Wizard renders | 1.5 days |
| **S3-7** `ProjectActivationApproval` queue surfaces in unified `/admin/approvals` (skeleton) | Approval row visible | 0.5 day |
| **S3-8** External-link tiles on Pulse — pull `ProjectExternalLink` rows, render Jira / Confluence / Teams / Gantt tiles | Tiles render | 0.5 day |
| **S3-9** `docs/integrations/jira-pulse-bridge.md` + `docs/integrations/external-links-pattern.md` (BA deliverables) | Docs landed | 0.5 day |

**Sprint 3 acceptance:** ProjectDetailPage default tab is Pulse; PM JTBDs 1, 2, 3 (per persona doc) execute in ≤ 3 clicks from `/dashboard/manager`.

---

#### Sprint 4 — Operational Budgeting + Approvals (2 weeks)

**Goal:** EVM auto-compute + multi-currency + fiscal calendar ON + unified approvals.

| Story | Output | Effort |
|---|---|---|
| **S4-1** `EvmComputationService` — actualCost from approved TimesheetEntry × PersonCostRate; earnedValue from milestone weight × completion; plannedValue from baseline schedule | Service + nightly cron + on-demand endpoint | 2 days |
| **S4-2** Wire EVM into ProjectBudget rollup + ProjectRadiator Budget quadrant | Quadrant reflects real EVM | 0.5 day |
| **S4-3** Flip `flag.feature.financial.multiCurrency.enabled=true` + wire `FxRateService.consolidate()` into all rollup endpoints | Consolidated rollups | 1 day |
| **S4-4** Flip `flag.feature.financial.fiscalCalendar.entity.enabled=true` + wire `FiscalPeriodResolverService` into Money tab | Period rollups visible | 0.5 day |
| **S4-5** `BudgetApproval.kind` enum + auto-create on mutation > X% variance (configurable per project via PlatformSetting) | Approval rows auto-created in test | 1 day |
| **S4-6** Unified `/admin/approvals` aggregator: BudgetApproval + ProjectActivationApproval + Position.PROPOSED + LeaveRequest + onboarding-case approvals | Single queue page | 1 day |
| **S4-7** `MoneyTab.tsx` — planned vs actual chart, variance drill, forecast curve, top cost lines, change requests inline | Tab renders | 1.5 days |
| **S4-8** Money portfolio rollup at `/dashboard/portfolio?view=money` | Rollup page | 0.5 day |
| **S4-9** Operator runbook `docs/runbooks/budget-eom-close.md` — month-end variance review + reforecast trigger | Doc landed | 0.5 day |

**Sprint 4 acceptance:** EVM populated on the it-company seed for all 40 projects; `/admin/approvals` lists at least one row from each source; multi-currency totals reconcile to within 0.01 of single-currency baseline (FxRate validation).

---

#### Sprint 5 — People Hub + Lean Staffing Contract Phase (2 weeks)

**Goal:** People Hub shipped; legacy staffing models dropped.

| Story | Output | Effort |
|---|---|---|
| **S5-1** `PeopleDirectoryPage.tsx` (replaces `/people` list) — DS DataView with filter + grid/list toggle | Page renders | 1 day |
| **S5-2** `PeopleProfilePage.tsx` (composes existing tabs into one scrollable shell) — Identity + Employment + Position history + Skills + Cost + Time/Leave summary + Activity | Page renders | 1.5 days |
| **S5-3** `PeopleHrQueuePage.tsx` — leave approvals + onboarding tasks + offboarding tasks + skill reviews | Page renders | 1 day |
| **S5-4** Bulk endpoints `POST /api/people/bulk/skill-update`, `/api/people/bulk/leave-balance-refresh`, `/api/people/bulk/org-membership-move` | Endpoints + UI bulk-action modal | 1 day |
| **S5-5** Sunset routes: `/teams` → People Directory filter; `/resource-pools` → `/admin/resource-pools`; `/time-management` → `/admin/time-policies` | Redirects in place | 0.5 day |
| **S5-6** Migrate read consumers of `ProjectAssignment` (21 callsites) to `ProjectPosition.activeFill` view | Callsites updated | 1.5 days |
| **S5-7** Contract-phase migration `20260720_lean_staffing_contract` — drops `StaffingRequest`, `StaffingRequestProposalSlate`, `StaffingRequestProposalCandidate`, `StaffingRequestFulfilment`, `PersonReleaseRequest`, `PersonReleaseApproval`, `ProjectAssignment`, `AssignmentApproval`, `AssignmentHistory`, `AssignmentProposalSlate`, `AssignmentProposalCandidate` — after backfill verified | Schema lean | 1 day |
| **S5-8** Delete `frontend/src/components/ds-legacy/` + legacy CSS classes from `global.css` | Cleanup PR | 0.5 day |
| **S5-9** Ratchet `scripts/check-deprecated-assignment-import.cjs` → 0 baseline | Guardrail locked | 0.5 day |
| **S5-10** Update `docs/planning/current-state.md` + `docs/planning/MASTER_TRACKER.md` + `docs/planning/canonical-staffing-workflow.md` (rename → `lean-staffing-workflow.md`) | Docs aligned | 0.5 day |

**Sprint 5 acceptance:** Legacy assignment models gone; lean E2E test green; CI green-before-merge + post-merge build-and-stage green; `/api/health/deep` returns `ready` on staging.

---

## 4. Claude Design — Brief + Prompt for Handoff Bundle

### Where the user runs this
Open `claude.ai/design`. Start a new project. Title: "DeliveryCentral — Lean Bank-IT Workforce Platform". Upload the codebase scan + the brief below + this plan file as attachments.

### Brief (paste into the brief field)

```
Project: DeliveryCentral
Domain: bank-IT workforce supply-demand platform (single-tenant per-bank install)
Audience: 7 platform roles — employee, project_manager, resource_manager, delivery_manager, director, hr_manager, admin
Tone: Senior, confident, fact-led. Calm. Spreadsheet-density-when-needed; magazine-spread-when-summarizing.
Pages serve customers running 200–2,000 person IT delivery teams.

Brand language:
- Primary accent: deep, trusted blue (current: #114b7a). Open to a refresh — prefer "boring fintech" over "consumer SaaS playful".
- Light + dark mode equal-quality.
- Tabular numbers everywhere; financial alignment matters.
- Status semantics fixed: green = healthy, amber = warning, red = danger, dark red = critical, neutral grey = pending, info cyan = informational.
- WCAG 2.2 AA mandatory.
- Touch targets ≥ 44px on coarse pointer / below md breakpoint.
- Reduced-motion friendly.

Visual references:
- Linear (calm density)
- Workday (workforce surface grammar)
- Float (heatmap-centric allocation)
- ChartIQ / TradingView (variance / forecast charts)
- Atlassian Confluence (external-link tiles)

Anti-patterns:
- No glassmorphism, no purple-to-blue gradients, no Notion blobs.
- No marquee logo bars, no parallax, no floating chat widgets.
- No emoji except status tone dots.
- No animation longer than 250ms.
- No more than 2 fonts (serif allowed only for marketing slides, not in-app).
- No icon-only buttons without aria-label.

Output requested:
1. Tokens (CSS custom properties) — colors (light+dark, status, chart 8-tone), typography scale (h1/h2/h3/body/compact/code), spacing 4px-grid 10-step, radius (sm/md/lg/control/card), shadows (card/dropdown/modal), breakpoints (sm/md/lg).
2. Atoms (React JSX-shape + ARIA + states):
   Button (primary/secondary/tertiary/danger/ghost; sm/md/lg; loading; disabled; with icon),
   IconButton, Link (polymorphic), Input (text/email/password/number/date),
   Textarea, Select (native + searchable), Combobox, Checkbox, Radio, Switch,
   Spinner, Skeleton, Badge, Chip, Avatar, AvatarStack, KbdKey, Divider, Kbd.
3. Molecules:
   FormField (label + hint + error + required), SearchInput,
   DatePicker, DateRangePicker, NumericInput (with currency + locale),
   FilterBar, Pagination, ToastStack, BreadcrumbTrail, TabBar (horizontal + sticky variants).
4. Surfaces:
   Modal (sm/md/lg/xl/fullscreen-on-mobile), Drawer (left/right + width tiers),
   Popover (with collision-aware placement), MenuPopover (arrow keys), Sheet (bottom-anchored),
   ConfirmDialog (default + danger tone), FormModal (sticky footer + dirty-prompt).
5. Data primitives:
   Table (default/compact/embedded; sticky header; virtualization at 200+ rows),
   DataView (client + server modes; filter row; sort; pagination; bulk actions; row actions),
   DescriptionList, KPI card, KpiStrip, QuadrantCard (4-panel score),
   Sparkline, MiniBar, Donut, Sankey-lite, VarianceBar.
6. State primitives:
   EmptyState (with forward action), ErrorState, LoadingState (skeleton/spinner/full-page),
   FeedbackState (success / warning / info / critical banners).
7. Layout primitives:
   PageContainer, PageHeader (title + breadcrumb + actions),
   SectionCard (compact + standard + emphasized + collapsible),
   DetailLayout (header + tabs + body + sidebar slot),
   DashboardLayout (title bar + KPI strip + hero + action section + secondary grid + freshness footer),
   ListLayout (filter bar + DataView + pagination),
   FormPageLayout (sections + sticky submit bar),
   AnalysisLayout (date range + KPI summary + primary chart + detail table + export),
   AdminControlLayout (section cards + explicit-save audit),
   AuthShell (centered card + form + next-step links).
8. Page templates (mockups for):
   - "Project Pulse" (the headline dashboard for one project): 4-quadrant RAG cards + open positions table + budget variance KPI + next milestone + top 3 risks + next decision panel + external-link tiles + activity timeline.
   - "Project Plan" (positions + milestones + schedule): horizontal Gantt + positions table grouped by workstream.
   - "Project Money" (budget + EVM + invoices): planned vs actual chart + variance drill table + forecast curve + top cost lines + change requests + approvals.
   - "Bench" (people without active position): table + filter + bulk-action toolbar + suggest-fill inline panel.
   - "Position Detail" (one position aggregate): summary card + current fill block + candidates panel + history timeline + suggested-fills inline.
   - "People Directory" (workforce list): DataView + filter + grid/list toggle + bulk-action toolbar.
   - "People Profile" (composed Person 360): identity + employment + position history + skills + cost rates + time/leave summary + activity.
   - "HR Queue" (operational approvals for HR): tabbed approval list + inline approve/reject.
   - "Approvals Queue" (cross-domain): unified list (budget + activation + position-proposal + leave + case approvals) + filter by source + one-screen-approval modal.
   - "Decision Dashboard" (per-role: PM / RM / DM / Director / HR / Employee): KPI strip + hero chart + action table + secondary cards.
   - "Create Project Wizard" (3-step): Identity → Positions + Milestones template → Activation.
   - "Auth Form" (login + 2FA + password reset).
   - "Setup Wizard" (8-step install: preflight → migrations → tenant → admin → integrations → monitoring → seed → complete).
   - "Admin Settings" (platform settings + role presets + integrations registry).
9. Schemas (JSON shapes for each KPI card, table column, filter type) — used by Claude Code to wire to the API.
10. Asset pack: 24 SVG icons (nav + action + status + integration brand marks: Jira / Confluence / Teams / M365 / LDAP), 1 favicon, 1 login-page hero illustration.

Constraints:
- All atoms exportable as React TSX with TypeScript props.
- All page templates exportable as TSX scaffolds (not just mockups).
- Tokens exportable as both CSS custom properties and a TS object for MUI theming.
- Mockups shown in light + dark + sm/md/lg breakpoints.
- Mark every interactive surface with target user role (per the 7-role list).

Deliverable: handoff bundle for Claude Code, downloaded as a folder + an HTML preview + a PDF spec.
```

### Files to also upload alongside the brief
- This plan file (`now-it-is-essential-kind-candy.md`)
- `frontend/src/styles/design-tokens.ts` (existing tokens as input)
- `docs/planning/phase18-page-grammars.md` (existing grammars as input)
- `docs/planning/persona-jtbds.md` (the 8-persona JTBDs)
- `docs/planning/UX_OPERATING_SYSTEM_v2.md` (UX OS reference)
- `.claude/rules/ux-laws.md` (the 10 enforced UX laws)
- Screenshots of 3 existing pages: DashboardPage (canonical), ProjectDetailPage (to redesign), StaffingDeskPage (to retire)

### Handoff bundle expected contents (validate before Sprint 1 starts)
- `tokens.css` + `tokens.ts`
- `components/` — atoms + molecules + surfaces + data + state + layout primitives as TSX
- `pages/` — page-template TSX scaffolds for the 14 mockups listed above
- `schemas/` — JSON descriptors per KPI card / table column / filter type
- `assets/` — SVG icon pack + login illustration + favicon
- `preview.html` — single-file browseable preview of all components + pages
- `spec.pdf` — design spec for review

---

## 5. Verification (end-to-end)

### Sprint-by-sprint
| Sprint | Smoke test command | Acceptance |
|---|---|---|
| 1 | `npm --prefix frontend run test` + `npm run ds:check` + `npm run ladle` | All tests green, ratchet baseline updated to new DS, Ladle shows new atoms |
| 2 | `docker compose exec backend npx ts-node prisma/scripts/backfill-project-positions.ts` then `curl /api/projects/:id/positions` | Backfill runs clean, new endpoints return data |
| 3 | Manual: visit `https://deliverit-test.agentic.uz/projects/:id` → confirm Pulse default tab + 3-tab grammar; PM JTBD 1, 2, 3 in ≤ 3 clicks each | UX-regression specs green |
| 4 | `curl /api/projects/:id/budget` (should return real EVM); visit `/admin/approvals` | At least 5 approval rows from 3+ sources; multi-currency totals reconcile |
| 5 | Full Playwright suite + `/api/health/deep` (assert ready) + `gh pr checks` green on the contract-phase PR | Lean E2E green; legacy models dropped; build-and-stage on main green |

### Cross-cutting checks per PR
- `node node_modules/typescript/bin/tsc --project tsconfig.build.json --noEmit` (BE)
- `npm --prefix frontend run test` (FE)
- `npm run schema:check` (DM-3 conventions)
- `npm run publicid:check` (UUID leak guardrail)
- `npm run migrations:check` (DM-R-4 classification)
- `npm run enum:check` (DM-R-6 single-step renames)
- `npm run roles:check` (literal-array baseline)
- `npm run fk-indexes:check` (FK index coverage)
- `npm run ds:check` (DS conformance, post-S1-5 re-baseline)
- New: `npm run lean-staffing:check` (S2-9) — scans for deprecated `ProjectAssignment` imports outside the legacy read view

### Staging deploy validation per merged PR
- Auto-deploy via `build-and-stage` workflow on main
- Assert `curl https://deliverit-test.agentic.uz/api/health/deep | jq .status` returns `"ready"`
- Visual regression: Playwright screenshot diffs (per Sprint 1 baseline)

---

## 6. Critical Files

### Schema + backend
- `prisma/schema.prisma` — add `ProjectPosition` + `ProjectPositionCandidate` + `ProjectPositionFillHistory` (Sprint 2); drop legacy staffing models (Sprint 5)
- `prisma/migrations/20260601_lean_staffing_expand/migration.sql` — NEW (Sprint 2)
- `prisma/migrations/20260720_lean_staffing_contract/migration.sql` — NEW (Sprint 5)
- `prisma/scripts/backfill-project-positions.ts` — NEW (Sprint 2)
- `src/modules/project-positions/` — NEW module replacing `staffing-requests/` + parts of `assignments/` + `staffing-desk/`
  - `domain/position-fill-status.ts`
  - `application/project-position.service.ts`
  - `application/transition-project-position-fill.service.ts`
  - `application/suggest-fills.service.ts`
  - `presentation/project-positions.controller.ts`
- `src/modules/financial-governance/application/evm-computation.service.ts` — NEW (Sprint 4)
- `src/modules/financial-governance/application/budget-approval-auto-trigger.service.ts` — NEW (Sprint 4)
- `src/modules/admin/presentation/approvals.controller.ts` — NEW unified queue (Sprint 4)
- `src/modules/project-registry/application/project-pulse-query.service.ts` — NEW (Sprint 3)

### Frontend
- `frontend/src/styles/design-tokens.ts` — REPLACE (Sprint 1); save current as `.legacy.ts`
- `frontend/src/components/ds/` — REPLACE with new atoms; old saved as `ds-legacy/`
- `frontend/src/components/ds-legacy/` — NEW dir (Sprint 1) for old atoms during transition, deleted Sprint 5
- `frontend/src/routes/projects/ProjectDetailPage.tsx` — Tab consolidation (Sprint 3)
- `frontend/src/routes/projects/ProjectPulsePage.tsx` — NEW (Sprint 3)
- `frontend/src/routes/projects/PlanTab.tsx` — NEW (Sprint 3)
- `frontend/src/routes/projects/MoneyTab.tsx` — NEW (Sprint 3 skeleton, Sprint 4 wired)
- `frontend/src/routes/projects/CreateProjectWizard.tsx` — NEW (Sprint 3)
- `frontend/src/routes/projects/PositionsListPage.tsx` — NEW (Sprint 2)
- `frontend/src/routes/projects/PositionDetailPage.tsx` — NEW (Sprint 2)
- `frontend/src/routes/people/PeopleDirectoryPage.tsx` — NEW (Sprint 5, replaces existing)
- `frontend/src/routes/people/PeopleProfilePage.tsx` — NEW (Sprint 5)
- `frontend/src/routes/people/PeopleHrQueuePage.tsx` — NEW (Sprint 5)
- `frontend/src/routes/people/BenchPage.tsx` — NEW (Sprint 2)
- `frontend/src/routes/admin/ApprovalsQueuePage.tsx` — NEW (Sprint 4)

### Guardrails + config
- `scripts/check-ds-conformance.cjs` + `scripts/ds-conformance-baseline.json` — RE-BASELINE (Sprint 1)
- `scripts/check-deprecated-assignment-import.cjs` — NEW guardrail (Sprint 2)
- `scripts/check-lean-staffing.cjs` — NEW (Sprint 2)
- `.env.example` — add `flag.feature.financial.multiCurrency.enabled=false` + `flag.feature.financial.fiscalCalendar.entity.enabled=false` (flip to true via env in Sprint 4)

### Documentation
- `docs/planning/MASTER_TRACKER.md` — NEW Sprint S1..S5 section (Sprint 1 add, update per sprint)
- `docs/planning/current-state.md` — updated per sprint
- `docs/planning/canonical-staffing-workflow.md` → rename to `lean-staffing-workflow.md` (Sprint 5)
- `docs/planning/phase18-page-grammars.md` — refreshed grammar shapes for new DS (Sprint 1)
- `docs/features/project-pulse.md` — NEW (Sprint 3)
- `docs/features/operational-budgeting.md` — NEW (Sprint 4)
- `docs/features/lean-staffing-aggregate.md` — NEW (Sprint 2)
- `docs/features/people-hub.md` — NEW (Sprint 5)
- `docs/integrations/jira-pulse-bridge.md` — NEW (Sprint 3)
- `docs/integrations/external-links-pattern.md` — NEW (Sprint 3)
- `docs/integrations/teams-channel-webhook-routing.md` — NEW (Sprint 3)
- `docs/integrations/itsm-outbound-webhook.md` — NEW (Sprint 4)
- `docs/integrations/m365-outlook-freebusy.md` — NEW if stretch goal lands
- `docs/runbooks/budget-eom-close.md` — NEW (Sprint 4)
- `docs/runbooks/network-allowlist.md` — NEW (Sprint 1, supports Architect's deployment requirements)
- `docs/api/openapi-snapshot-2026-Q3.yaml` — NEW snapshot (Sprint 5)

### Memory companions
- New memory `project-lean-simplification-2026-Q3.md` index — link this plan + per-sprint progress notes as the sprints land

---

## 7. Risks + Mitigations

| Risk | Mitigation |
|---|---|
| Claude Design handoff doesn't produce production-ready React TSX | Brief asks explicitly for TSX exports; if it's mockup-only, S1-3 budget grows by 2-3 days for manual TSX authoring from mockups |
| Backfill from existing staffing data misses edge cases | Idempotent backfill + dual-write during transition + Playwright e2e against backfilled data before contract phase |
| EVM auto-compute disagrees with manually-seeded data on existing projects | Sprint 4 includes parity check: for each existing ProjectBudget, compute EVM with new service and warn if diff > 5% (operator review before flipping cron on per project) |
| Multi-currency / fiscal-calendar flip breaks existing reports | Both flags default OFF in dev; flip ON in Sprint 4 staging only; merge to prod ON only after parity check |
| Visual regression on 50+ pages from DS replacement | Playwright screenshot diffs in CI; per-PR review of diffs; sprint 1 canary page (DashboardPage) catches systemic issues |
| Cross-module imports of legacy ProjectAssignment in 21 callsites take longer than Sprint 5 budget | Migration scripted via codemod where possible; if budget exceeds, contract migration delayed by 1 week (acceptable per pacing) |
| Stakeholders forget that old `/staffing-requests` URL is gone | Routing redirects in place for 1 release; deprecation banner on legacy detail page during Sprint 2-4 |

---

## 8. Sign-offs required before kickoff

| Persona | Sign-off | Evidence |
|---|---|---|
| PM | All 5 themes scoped + Pareto features identified + integrations strategy approved | §3.1 |
| BA | Process changes documented + data model changes mapped + integration docs queued | §3.2 |
| Architect | Aggregate model accepted + dependency audit understood + deployment requirements achievable | §3.3 |
| UX | Claude Design brief reviewed + handoff structure agreed + per-theme deliverables enumerated | §3.4 + §4 |
| Dev Lead | 5-sprint decomposition feasible + CI gate strategy understood + ratchet additions accepted | §3.5 |

When all 5 personas sign off (you, the user, in one go), kickoff = run Claude Design with the §4 brief and begin Sprint 1.
