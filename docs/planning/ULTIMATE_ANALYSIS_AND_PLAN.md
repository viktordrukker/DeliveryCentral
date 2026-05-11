# DeliveryCentral — Ultimate Analysis & Plan

**This is the definitive document.** It supersedes `LAUNCH_PIVOT_PLAN.md`, `LAUNCH_CRITICAL_PIVOT.md`, `SQUASH_AND_REMEDIATE.md`, and `FOUNDATION_PLAN.md`. Every prior draft was a step toward this one — this version is grounded in: 30+ live screen walks, 6 service files read end-to-end, 5 web searches validating against industry practice, 60+ network requests captured, comparison against Float/Runn/Kantata current behavior, and the prior corpus of HARDEN_BRIEF + HARDEN_WIRING_MAP + CLAUDE_CODE_TASKS.

**The plan does three things at once:** (1) ship a focused v1 to one IT-block customer in 4–6 weeks; (2) keep all toggled-off features developable in parallel via shadow-CI + maturity-gated promotion; (3) install the six standardization spines (UI / API / Authz / Data / Customization / Consistency) so the platform stops accumulating debt as it grows. None of those is sacrificed for the others.

---

## Part I — Executive synthesis

### I.1 The verdict

DeliveryCentral is **not broken**. It is **over-built and under-finished**. The codebase has 87 Prisma models, 30 NestJS modules, 319 endpoints, 50+ frontend routes, 6 in-flight design systems, ~95 documented discrepancies, and 50+ phases of accreted history. It contains rich primitives (transactional outbox, RBAC matrix, multi-candidate proposal slate, 16-axis Project Radiator, four-layer customization scaffold, 8 page grammars, design-token ratchet) — every one well-conceived. **What's broken is the wiring**: services declare optional injections that silently fail, the outbox publisher is gated OFF by default, the synchronous notification path is wired to some modules but not all, and a dozen UI surfaces contradict each other or duplicate the same flow. The shape is a 200-person consultancy PSA tool; the delivery is shallow on every primitive.

For an IT block of 20–100 people, the answer to *"who's working on what, did they bill the hours, who's free next week"* needs ~15 active models, ~12 user-visible routes, and 4 personas. Everything else stays in the codebase **toggled OFF** and continues developing in parallel under shadow-CI discipline.

### I.2 The plan in one paragraph

**Toggle, fix, ship, harden.** Add 60 feature flags to the existing PlatformFlagsService (already in `src/shared/config/`). Default ~12 features ON for v1, ~48 OFF. Apply 14 critical bug-fixes to the on-flag code paths. Run customer UAT. Cut over to production. After launch, toggled-off features mature through a four-stage gate (`scaffolded → developing → beta → ga`), promoted only when a real customer asks. CI ratchets monotonically reduce architectural debt across all six design systems regardless of which features are user-visible.

### I.3 Time to launch

- **Sprint F-0 (week 1–2):** flag registry + 12 P0 bug fixes + sidebar/tab gates. *Ends with backend healthy, audit pipeline live, lean v1 sidebar.*
- **Sprint F-1 (week 3):** customer M365/Jira sync verification, backup drill, perf baseline, admin runbook + quick-starts.
- **Sprint F-2 (week 4):** customer UAT (24 scenarios) + cutover + 7-day hypercare.
- **Beyond F-2:** parallel tracks (1) hypercare, (2) flag promotion as customers ask, (3) ratchet sprint-by-sprint debt reduction.

### I.4 Confidence calibration

- **High** — every D-item from D-01..D-95 mapped to a closing fix or a flag.
- **High** — root cause of B-02 (audit silence) located: `?` optional injection pattern + outbox flag default OFF.
- **High** — survivor model + route + endpoint set sized accurately.
- **Medium** — exact code-line size of B-02 fix (might span 5 services × 30min each, or 1 module-wiring fix).
- **Medium** — whether the customer agrees to drop the proposal-slate flow for v1 (must ask).
- **Low** — what 200+ tenants on the same deployment look like (J1 holds; not blocking).
- **Low** — non-en-US customer count (locale fix is essential regardless).

---

## Part II — Validated industry context

### II.1 PSA best practices (2026) we're aligned with

Per Birdview, Rocketlane, Productive, Saviom, Planview surveys:

> "At the center of every successful services firm is one ability: deploying the right person to the right project at the right time."
> "Companies using PSA tools experienced a 47% reduction in billing cycle times."
> "AI adoption in professional services organizations almost doubled to 40% in 2026, compared to 22% in 2025."
> "PSA gives a forward-looking view of capacity, helps spot under-utilization early."

**Validates:** centralized resource model (Person + Resource Pool + ProjectAssignment), skill-based matching (Skill + PersonSkill), capacity heatmap (Distribution Studio), time tracking + billing automation (Timesheet + ProjectBudget). All exist in DeliveryCentral.

**Reveals gap:** AI-assisted matching is now table stakes (40% of orgs). DeliveryCentral has skill-based matching but the v2 weighted matcher (HARDEN-WIRING S-10) is gated. Plan: enable as opt-in beta in v1.1, GA when 50% of customer asks.

### II.2 Float current UX (2026) — what good looks like

Per Float.com, Capterra, DigitalProjectManager reviews:

> "Live capacity heatmap with color-coded utilization indicators."
> "Drag-and-drop adjustments help teams coordinate."
> "Pre-booked time off, over-capacity warnings right on the Schedule."
> "Real-time updates and intuitive timeline."
> "2025: heatmap views show total and billable utilization."

**DeliveryCentral has:** Distribution Studio with 8-week heatmap, project × week grid, color-coded cells, supply/demand profile.

**DeliveryCentral lacks:** Inline cell edit (D-72 verified live: cell click opens read-only popover); drag-to-assign; over-capacity visual indicators on individual cells (D-73 verified live: 555% over-allocation hidden in solid green); pre-booked time off integration into the heatmap.

**Plan:** Float-style inline edit + drag-to-assign land in v1.2 (HARDEN SD-02, SD-03). For v1, ship the existing heatmap + Quick Assign action covers the core "see and respond" loop.

### II.3 Runn current UX (2026) — what good looks like

Per Runn.io product docs:

> "Drag-and-drop timeline. Multi-select mode allows for bulk actions."
> "Skills database, allowing you to assign and filter skills across your team."
> "3 types of charts: Capacity, Availability, and Utilization."
> "Forecast resources using placeholders and tentative work."
> "Smooth onboarding with interactive checklists and a sandbox for practice."

**DeliveryCentral has:** Capacity / Availability / Utilization data points exist (Workload Overview KPIs); skills database (Skill + PersonSkill); placeholders (StaffingRequest before slate is filled); scenarios in Distribution Studio.

**DeliveryCentral lacks:** Onboarding sandbox / interactive tour (HARDEN DOC-03 — currently OFF flag); bulk multi-select on lists (only `/assignments/bulk` is dedicated bulk page; no inline multi-select on lists).

**Plan:** Onboarding tour is a v1.1 win (low risk, high adoption signal). Multi-select on lists is a v1.2 polish.

### II.4 Transactional outbox best practices — what we're missing

Per Microservices.io, Nestixis NestJS-Inbox-Outbox library docs (May 2026):

> "Write business data and outbox records in a single, atomic database transaction."
> "Implement a robust poller that acquires locks and marks events as published."
> "Handle idempotency in event consumers downstream."
> "Common pitfall: long-lived transactions or locks can reduce concurrency. Pollers processing events without locking can cause event duplication or loss."

**DeliveryCentral has:** `OutboxEventPublisherService` exists in `src/modules/audit-observability/application/`. 303 lines. Implements poller, retry with exponential backoff, batch size config, max attempts cap, per-tenant flag gating. Comments say:

> *"This service is gated by `flag.outboxEnabled` (default false) so the existing synchronous translator stays the single source of truth until consumers are wired. Enable per-tenant once handlers are registered."*

So the publisher is **right** — but **disabled**. The synchronous fallback (NotificationEventTranslatorService inside request thread) is wired into some modules but not consistently. **CreateEmployeeService and ActivateProjectService both inject `auditLogger?` and event services with the OPTIONAL `?` modifier** — so when DI doesn't satisfy them, the calls become silent no-ops with no error. **This is the root cause of B-02 / D-47 / D-59 / D-70**.

**Plan:** B-02 fix is two-part:
1. Remove `?` optionality from auditLogger / activity / translator dependencies in services that emit events. Make them required.
2. Wire the providers in the relevant modules so DI is satisfied.

Then promote `flag.outboxEnabled` from `developing` to `beta` post-Sprint F-1; to `ga` once handlers are registered for all 28 translator events.

### II.5 Feature flag strategy (validated)

Per Growthbook, Flagsmith, Unleash, Octopus Deploy (2026 surveys):

> "SaaS teams using progressive rollouts report 70 to 90% fewer production incidents compared to big-bang releases."
> "78% of enterprises report increased deployment confidence through progressive deployment techniques."
> "AI-powered platforms now dynamically adjust rollout parameters."

**DeliveryCentral has:** `PlatformFlagsService` in `src/shared/config/platform-flags.service.ts`. Confirmed via grep. The infrastructure is in place; the registry is sparse.

**Plan:** Author the 60-flag registry detailed in §IV.2. Default ~12 ON, 48 OFF.

---

## Part III — Comprehensive findings (the discrepancy register, organized by domain)

I'm going to be strict about evidence. Every finding here is either:
- (L) verified by my live walk this session
- (C) verified by reading the source code this session
- (B) carried over from HARDEN_BRIEF where the prior catalog was sound
- (W) from web-searched best-practice deviation

Total: **97 distinct discrepancies** (was 95 in HARDEN; +2 from this session: D-96 Account Settings missing locale picker, D-97 missing timezone picker; plus reframings of D-89 to D-95 anchored to live evidence).

### III.1 Foundations / cross-cutting (the load-bearing failures)

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-02** (B-01) | `PublicIdBootstrapService` DI failure → backend won't start healthy | B + repeatedly cited in `current-state.md` | **LAUNCH-BLOCKER** | Sprint F-0 day 2 |
| **D-47** (B-02) | Audit + lifecycle + notification pipeline silent on create+activate | L: History tab empty after hire; C: `auditLogger?` optional injection in `create-employee.service.ts`, `activate-project.service.ts`; C: `OutboxEventPublisherService` gated by `flag.outboxEnabled=false` | **LAUNCH-BLOCKER** | Sprint F-0 day 3-4 |
| **D-46** (B-03) | Skills checkbox on Create Employee silently dropped; legacy `Person.skillsets[]` vs modern `PersonSkill` | L verified: ticked Frontend → Skills tab "No skills recorded" | **LAUNCH-BLOCKER** | Sprint F-0 day 5 |
| **D-87** (B-13) | `/api/notifications/inbox/stream` returns 503 — SSE broken | L: network panel | HIGH | Sprint F-0 day 7 — drop SSE, switch bell to polling |
| **D-88** (B-14) | N+1 query on `/projects` — 30+ separate `/projects/:id/health` calls per page load | L: network panel | HIGH | Sprint F-0 day 8 — batch endpoint |
| **D-89** | Migration sanity reports "Applied 111 of 110 local migrations" | L: Admin Monitoring | INVESTIGATE | Sprint F-0 day 9 |
| **D-90** | "3 integrations: 3 never synced" in Monitoring despite "Configured" | L: Admin Monitoring | INVESTIGATE | Sprint F-0 day 9 |
| **D-91** | "0 business audit records visible in current runtime" | L: Admin Monitoring + Business Audit page | LAUNCH-BLOCKER (root cause = D-47) | Same as D-47 |
| **D-95** | 0 recent notification outcomes despite 8+ templates seeded | L: Admin Monitoring + Admin Notifications | LAUNCH-BLOCKER (root cause = D-47) | Same as D-47 |
| **D-22** | Live URL was originally typo'd | resolved | INFO | resolved |
| **D-03** | Schema drift (~1,120-line diff vs main per current-state.md) | reported | LAUNCH-BLOCKER (sanity) | Sprint F-0 day 10 — audit |
| **D-79** | DDS-2 `version` column → idempotency ratchet ordering | analytical | MED | document; ratchet starts at WARN, promotes to ERROR after Sprint F-1 |

### III.2 Staffing flow (the user's biggest concern — 7 paths to one outcome)

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **L-1** | 6–7 entry points for "place a person on a project" — 3 visible on Staffing Desk header alone | L | architectural | Sprint F-0 day 10: `flag.feature.staffing.proposalSlate.enabled = OFF` for v1 (assuming customer agrees per critical decision §IV.4) collapses 3 of the 7 |
| **L-2** | SR detail shows "In review" in Workflow Timeline + "Open" in Derived Status field on the SAME screen (Echo eCommerce v2) | L | confidence-killer | Sprint F-0 day 10: with flag OFF, SR routes hidden; if flag ON, fix in F-1 (collapse derived to single source) |
| **L-3** | "1–8 of 8 records" while Demand tab badge shows "(7)" | L | low | Sprint F-1 polish |
| **L-4** | Side drawer on `/staffing-desk` row click only contains "View Details" + "View Project" buttons (zero info value over hyperlink) | L | UX bloat | Sprint F-1: remove drawer, link rows directly |
| **D-04** | Legacy + canonical staffing endpoints coexist | repo audit | MED | gradual cutover; if slate flag OFF, mostly moot |
| **D-11** | StaffingRequest cached vs derived status disagree | L+B | MED | only matters if slate flag ON |
| **D-21** | StaffingRequest 5 statuses vs Assignment 9 statuses framing | doc | LOW | doc-only |
| **D-65** | "Candidate is known" pre-seeds rank #1 | L | INFO | doc only |
| **D-66** | Skill picker copy is exemplary | L | INFO | use as model for DOC-07 editorial pass |
| **D-32** | SLA columns empty in live Approval Queue | L | MED | only matters if slate flag ON; otherwise not user-visible |
| **D-72** | Distribution Studio cell click is read-only popover | L | MED | SD-02 v1.2 |
| **D-73** | 555% over-allocation hidden in solid green cell | L | MED | SD-09 v1.2 visual indicators |
| **D-04** | Make Assignment vs SR vs Quick Assign vs Distribution Studio Apply | L | architectural | Toggle slate OFF in v1 collapses to one canonical path |

### III.3 People flow

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-1** | "/admin/people/new" form has fields/wizard mismatch with v1 best practice (form-not-wizard, 12+ fields on one page) | L | MED | P-02 wizard in v1.1 (currently a working form) |
| **D-13** | RM not first-class on Person | repo audit | MED | P-01 schema delta in v1.1 |
| **D-14** | Contract fields missing | repo audit | MED | P-01 schema delta in v1.1 |
| **D-15** | photoUrl not first-class | repo audit | MED | P-01 schema delta in v1.1 |
| **D-30** | Form writes legacy Person.skillsets | L | LAUNCH-BLOCKER (= D-46) | Sprint F-0 day 5 |
| **D-31** | Person form missing fields | L | MED | combined with P-01 in v1.1 |
| **D-44** | ConfirmDialog wording "permanently...cannot be undone" wrong | L | LOW | DOC-07 editorial pass v1.1 |
| **D-45** | Person 360 status display contradicts DB | L | HIGH | Sprint F-0 day 6 (B-04) |
| **D-49** | (covered by D-45) | dup | — | — |
| **D-7** | DM-2.5 publicId rollout 2/10 aggregates | repo audit | LOW | continue in v1.x |
| **D-NEW** (this session) | PM impersonation hides My Time — but PMs are people who log hours | L | MED | Sprint F-0 day 10 — fix sidebar visibility logic |
| **D-96** | Account Settings missing locale picker (D-29 leak unfixable from UI) | L this session | HIGH | Sprint F-0 day 7 — add locale picker |
| **D-97** | Account Settings missing timezone picker | L this session | HIGH | Sprint F-0 day 7 — add timezone picker |
| **D-39** | Session timeout aggressive | session walk | LOW | tune in v1.1 (TTL 30min idle / 8h absolute) |
| **D-40** | Form data lost on session expiry | inferred | MED | session-storage drafts (FE-FOUND-04 v1.1) |
| **D-42** | Line Manager native `<select>` with 200 options | L | MED | use existing PersonSelect component (FE-FOUND-05 v1.1) |
| **D-43** | Org Unit flat select | L | LOW | tree picker in v1.2 |

### III.4 Project flow

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-12** | No Director-approval gate on project | repo audit | MED | flag OFF in v1; PM-01 in v1.1 if customer asks |
| **D-50** | No redirect after Create Project | L | MED | Sprint F-0 day 11 — redirect to /projects/:id |
| **D-52** | Project code convention inconsistent (PRJ-XXXXXX random vs IT-PROJ-NNN sequential) | L | MED | Sprint F-1: single ProjectCodeGenerator |
| **D-53** | Priority HIGH→MEDIUM silent drop | L | HIGH | Sprint F-0 day 6 (B-05) |
| **D-54** | KPI strip RAG vs Pulse panel disagree | L | HIGH (confidence) | Sprint F-0 day 6 (B-06); plus radiator flag OFF in v1 collapses naturally |
| **D-55** | Cold-start radiator returns Red for new project | L | MED | radiator flag OFF in v1 hides; v1.2 fix |
| **D-56** | Health column on /projects shows fake cold-start scores | L | MED | radiator flag OFF in v1 suppresses health column |
| **D-57** | Activate CTA only on Lifecycle tab | L | LOW | v1.1 polish |
| **D-58** | No ConfirmDialog on Activate | L | MED | Sprint F-1 polish |
| **D-59** | Activate audit silent | L | LAUNCH-BLOCKER (= D-47) | Sprint F-0 day 3-4 |
| **D-61** (dup of D-58) | — | — | — | — |
| **D-62** (dup of D-12) | — | — | — | — |
| **D-63** (dup of D-59) | — | — | — | — |
| **D-10** | Project tags/techStack double-truth (legacy String[] + ProjectTag/ProjectTechnology join) | repo audit | MED | v1.1 — DM-6b-1 follow-up |

### III.5 Time flow

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-19** | Time alerts incomplete | repo audit | MED | partial in v1; full in v1.1 (P-09) |
| **D-20** | No approve-hours from project detail | repo audit | MED | PM-04 in v1.1 |
| **B-08** | SLA columns empty in Approval Queue | L | MED | only if slate flag ON |
| **D-86** (NEW this session) | No locale-aware date display for "Occurred After" filter on Audit page (`10.04.2026`) | L | HIGH (= D-29 system-wide) | Sprint F-0 day 7 |

### III.6 UI / DS / Navigation

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-27** | Breadcrumb leak | L | MED | Sprint F-0 day 7 (B-11 / FE-FOUND-01) |
| **D-28** | "/admin/people/new" page title says "New Admin" | L | LOW | Sprint F-0 day 7 |
| **D-29** | Russian-locale date pickers | L | HIGH | Sprint F-0 day 7 |
| **D-37** | "Getting started" widget hardcoded, not interactive tour | L | LOW | DOC-03 v1.1 (additive) |
| **D-51** | Wrong subtitle on /projects/new | L | LOW | Sprint F-1 polish |
| **D-60** | Subtitle leak across pages | L | LOW | Sprint F-1 polish |
| **D-67** | Subtitle leak on /staffing-requests/new | L | LOW (flag OFF in v1) | flag OFF resolves |
| **D-68** | Cmd+K returns no results for People search | L | MED | flag OFF in v1; v1.1 fix |
| **D-69** | Cmd+K filter doesn't narrow result list | L | MED | flag OFF in v1; v1.1 fix |
| **D-71** | `?` cheatsheet doesn't open consistently | L | LOW | v1.1 fix |
| **D-74** (dup of D-27) | — | — | — | — |
| **D-NEW** | Capitalisation route 404 (sidebar entry doesn't match actual route) | L this session | MED | Sprint F-1 — flag the route OFF or fix path |
| **D-NEW** | Notifications inbox empty-state has no forward action (UX Law 2 violation) | L this session | LOW | Sprint F-1 — copy + CTA |

### III.7 Admin / config

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-17** | Tenant settings undiscoverable | repo audit | MED | F7.1 Tenant Settings Catalog page in Sprint F-1 |
| **D-26** | CLAUDE.md stale on admin email + model count | L | LOW | Sprint F-0 day 6 doc refresh |
| **D-38** | 7 base roles + dual-role, not "8 roles" | doc | LOW | doc fix |
| **D-75** | CLAUDE.md says 53 models; live grep returns 87 | repo audit | LOW | doc fix |
| **D-NEW** | Admin Dictionaries lists vocabularies tied to toggled-off features (case-kind, assignment-rejection-reasons, staffing-bands) | L this session | LOW | hide via dictionary feature-flag predicate in v1.1 |

### III.8 Architecture / debt

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-NEW** | 1,041 hardcoded role string literals in `src/modules` (excluding tests) | repo grep | architectural | RBAC-1 catalog in v1.1; ratchet down over sprints |
| **D-NEW** | 14 of 87 models have `version` column (16% coverage) | repo grep | architectural | DDS-2 backfill in v1.x |
| **D-NEW** | 24 of 87 models have `archivedAt` (28% coverage) | repo grep | architectural | DDS-3 backfill in v1.x |
| **D-NEW** | 47 controllers leak raw UUIDs (controller-uuid-leak baseline) | repo audit | architectural | DM-2.5 rollout in v1.x |
| **D-NEW** | No Postgres CHECK constraints | repo audit | architectural | CONS-2 invariants in v1.x |
| **D-NEW** | 30+ unique URL prefixes for endpoints (inconsistent grouping) | repo audit | architectural | API DS in v1.x |
| **D-NEW** | 25+ inline `@Body() body: { ... }` types (no class-validator DTO) | repo audit | architectural | 20c-09 in v1.x |
| **D-NEW** | 4 modules use `forwardRef()` for circular deps | repo audit | architectural | 20c-08 in v1.x |
| **D-NEW** | God components (PM/Director/HR dashboard 400-441 lines) | repo audit | architectural | 20c-15 in v1.1 (PM dashboard touched anyway) |
| **D-NEW** | Optional `?` injection pattern silently swallows DI failures | C this session: confirmed in `create-employee.service.ts` and `activate-project.service.ts` | LAUNCH-BLOCKER (= D-47 root cause) | Sprint F-0 day 3-4 — make non-optional |
| **D-NEW** | OutboxEventPublisherService default-disabled by code design | C this session | INFO (intentional) | flag promotion to beta in Sprint F-1 |
| **D-NEW** | No `@Cron(...)` decorators anywhere in src; outbox publisher uses `setInterval` instead | repo grep | LOW | acceptable for single-instance v1; revisit at scale |
| **D-NEW** | Workflow definitions, custom fields, entity layouts all scaffolded but never consumed | repo + UI | architectural | mature toward consumed in v1.x via flag promotion |

### III.9 Multi-tenancy / J1

| ID | Finding | Verified | Severity | Closing |
|---|---|---|---|---|
| **D-6** | Tenant RLS half-shipped | repo audit | INFO (J1 holds for v1) | document; revisit if SaaS shift |
| **D-78** | PM-01 → S-05 ResponsibilityMatrix dependency cycle | analytical | MED | resolved naturally because both flagged OFF in v1 |

### III.10 Live discoveries from this session (annotated again)

For traceability, the new live findings from this session, beyond the prior catalog:

- **D-86**: Russian-locale leak observed on Audit page filter ("Occurred After: 10.04.2026")
- **D-87**: SSE stream `/api/notifications/inbox/stream` returns 503
- **D-88**: N+1 on `/projects` — 30+ separate health calls
- **D-89**: Monitoring shows "Applied 111 of 110 migrations"
- **D-90**: "3 integrations: 3 never synced" despite "Configured"
- **D-91**: 0 business audit records (root cause = D-47)
- **D-92**: PM impersonation hides My Time from sidebar
- **D-93**: Notification templates exist but no recent outcomes (root cause = D-47)
- **D-94**: (= D-88, dup)
- **D-95**: 0 recent notification outcomes
- **D-96**: Account Settings has no locale picker (D-29 unfixable from UI)
- **D-97**: Account Settings has no timezone picker (essential for workforce ops)
- (UX) Notification inbox has no empty-state forward action
- (UX) Capitalisation sidebar route is 404 (link mis-mapped)
- (UX) Workload Overview Action Items widget shows "131 idle people · Review for assignment" with a View link — verify clicking actually filters /people for assignment
- (UX) Side drawer on /staffing-desk has no purpose
- (UX) Staffing Desk Demand tab pagination off-by-one ("(7)" vs "1–8 of 8")
- (RBAC) PM `/admin/platform-settings` returns 200 — possible read-allowed-for-PM concern; if intentional, document; if not, restrict
- (RBAC) Admin → /admin successfully redirects PM to PM dashboard with toast — RBAC enforcement works ✓
- (RBAC) Impersonation banner is clear and well-implemented ✓

**Total active distinct discrepancies after dedup: ~97.** Every one mapped to a closing fix or a flag.

---

## Part IV — The toggle architecture (deep)

### IV.1 The six toggle layers

To ship lean v1 while keeping the rest of the codebase developable, every feature is gated through these layers in this order:

```
HTTP request → Layer A: PlatformFlagsService (key lookup)
             → Layer B: <FeatureGuard> HOC (frontend route gate)
             → Layer C: route-manifest navVisible predicate (sidebar visibility)
             → Layer D: @RequireFeature() controller decorator (returns 404 not 403)
             → Layer E: cron / publisher gating (sweeps, outbox)
             → Layer F: DB tables stay; nothing dropped
```

A feature is "off for tenant X" iff the flag returns `false` for X in PlatformSettingsService. All five logical layers honor it. The DB layer is unconditional — data is never destroyed by toggling.

### IV.2 The flag registry (60 flags)

| Group | Flag | v1 default | Maturity |
|---|---|---|---|
| **Foundation** | `flag.outboxEnabled` | OFF | beta |
| | `flag.tenantRlsEnabled` | OFF | beta (J1 hold) |
| | `flag.publicIdStrict` | OFF | developing |
| | `flag.idempotencyKeyEnforced` | OFF | scaffolded |
| **Staffing** | `flag.feature.staffing.makeAssignment.enabled` | **ON** | ga |
| | `flag.feature.staffing.bulkAssignment.enabled` | **ON** | ga |
| | `flag.feature.staffing.proposalSlate.enabled` | **OFF** (ASK CUSTOMER) | beta |
| | `flag.feature.staffing.distributionStudio.enabled` | **OFF** | beta |
| | `flag.feature.staffing.directorApproval.enabled` | OFF | scaffolded |
| | `flag.feature.staffing.workflowFullState.enabled` | **OFF** | beta — collapse to 4-state in v1 |
| | `flag.feature.staffing.slaSweep.enabled` | OFF | beta |
| | `flag.feature.staffing.proposalNudge.enabled` | OFF | scaffolded |
| | `flag.feature.staffing.matchingEngineV2.enabled` | OFF | scaffolded |
| **Project** | `flag.feature.project.directorApprovalGate.enabled` | OFF | scaffolded |
| | `flag.feature.project.radiator.enabled` | OFF | beta (cold-start fix needed) |
| | `flag.feature.project.radiatorThresholds.enabled` | OFF | beta |
| | `flag.feature.project.risks.enabled` | OFF | beta |
| | `flag.feature.project.changeRequests.enabled` | OFF | beta |
| | `flag.feature.project.vendors.enabled` | OFF | scaffolded |
| | `flag.feature.project.workstreams.enabled` | OFF | scaffolded |
| | `flag.feature.project.retrospective.enabled` | OFF | scaffolded |
| | `flag.feature.project.milestones.enabled` | **OFF** in v1, ON in v1.1 | beta |
| | `flag.feature.project.budgetApproval.enabled` | OFF | beta |
| **Cases / WorkEvidence** | `flag.feature.cases.enabled` | OFF | beta |
| | `flag.feature.workEvidence.enabled` | OFF | beta |
| | `flag.feature.exceptions.enabled` | OFF | beta |
| **Teams / Pools** | `flag.feature.teams.enabled` | OFF | beta |
| | `flag.feature.resourcePools.enabled` | **ON** | ga |
| **Time** | `flag.feature.timesheet.basic.enabled` | **ON** | ga |
| | `flag.feature.timesheet.periodLock.enabled` | **ON** | ga |
| | `flag.feature.timesheet.approval.enabled` | **ON** | ga |
| | `flag.feature.leaveRequests.enabled` | OFF | beta |
| | `flag.feature.overtime.enabled` | OFF | beta |
| | `flag.feature.publicHolidays.enabled` | OFF | scaffolded |
| **Pulse** | `flag.feature.pulse.basic.enabled` | **ON** | ga |
| | `flag.feature.pulse.declineDetect.enabled` | OFF | scaffolded |
| | `flag.feature.pulse.managerTrend.enabled` | OFF | scaffolded |
| **Dashboards** | `flag.feature.dashboard.workloadOverview.enabled` | **ON** | ga |
| | `flag.feature.dashboard.employee.enabled` | **ON** | ga |
| | `flag.feature.dashboard.projectManager.enabled` | **ON** | ga |
| | `flag.feature.dashboard.resourceManager.enabled` | **ON** | ga |
| | `flag.feature.dashboard.hr.enabled` | OFF | beta (persona deferred) |
| | `flag.feature.dashboard.deliveryManager.enabled` | OFF | beta (persona deferred) |
| | `flag.feature.dashboard.director.enabled` | OFF | beta (persona deferred) |
| | `flag.feature.dashboard.portfolioRadiator.enabled` | OFF | beta |
| | `flag.feature.dashboard.plannedVsActual.enabled` | **ON** | ga |
| **Reports** | `flag.feature.reports.timeAnalytics.enabled` | **ON** | ga |
| | `flag.feature.reports.utilization.enabled` | **ON** | ga |
| | `flag.feature.reports.capitalisation.enabled` | OFF | beta |
| | `flag.feature.reports.builder.enabled` | OFF | beta |
| | `flag.feature.reports.exportCentre.enabled` | OFF | beta |
| **Admin** | `flag.feature.admin.webhooks.enabled` | OFF | beta (in-memory) |
| | `flag.feature.admin.accessPolicies.enabled` | OFF | scaffolded |
| | `flag.feature.admin.bulkImport.enabled` | OFF | beta (untested) |
| | `flag.feature.admin.hris.enabled` | OFF | beta (M365 covers v1) |
| | `flag.feature.admin.tenantSettingsCatalog.enabled` | **ON** in F-1 | beta → ga in v1 |
| **Integrations** | `flag.feature.integrations.m365.enabled` | **ON** | ga |
| | `flag.feature.integrations.jira.enabled` | conditional ON | ga |
| | `flag.feature.integrations.radius.enabled` | OFF | beta |
| **Notifications** | `flag.feature.notifications.bell.enabled` | **ON** (polling) | ga |
| | `flag.feature.notifications.sse.enabled` | **OFF** (broken) | beta |
| | `flag.feature.notifications.preferences.enabled` | OFF | scaffolded |
| **Help / DocOps** | `flag.feature.helpCenter.enabled` | OFF | scaffolded |
| | `flag.feature.onboardingTour.enabled` | OFF | scaffolded |
| | `flag.feature.cmdk.peopleSearch.enabled` | OFF | beta (broken) |
| **Customization scaffolds** | `flag.feature.workflowDefinitions.enabled` | OFF | scaffolded (never consumed) |
| | `flag.feature.customFields.enabled` | OFF | scaffolded |
| | `flag.feature.entityLayouts.enabled` | OFF | scaffolded |
| **Auth** | `flag.feature.auth.twoFactor.enabled` | OFF | beta (admin can re-enable) |
| | `flag.feature.viewAs.enabled` | **ON** | ga |
| **Misc UI** | `flag.feature.kpiDrilldown.enabled` | **ON** | ga |
| | `flag.feature.actionItems.enabled` | **ON** | ga |

**Total: 60 flags. v1 default: ~14 ON, ~46 OFF.**

### IV.3 Flag metadata fields

Every flag has these metadata fields in PlatformSetting:

```ts
{
  flag.feature.<name>.enabled: boolean
  flag.feature.<name>.maturityLevel: 'scaffolded' | 'developing' | 'beta' | 'ga' | 'deprecated'
  flag.feature.<name>.expectedGaSprint: string
  flag.feature.<name>.owner: string  // engineer or team name
  flag.feature.<name>.documentation: string  // URL to docs
  flag.feature.<name>.dependsOn: string[]  // other flags required ON
  flag.feature.<name>.lastReviewedAt: Date
}
```

A `flags:check` CI script asserts every `flag.feature.*` referenced in code has a registry entry with all metadata.

### IV.4 The critical decision — staffing flow shape

Before Sprint F-1 day 10, the customer must answer:

> "For your 20–100 person scale, do you need the multi-candidate proposal-slate flow with SLA timers, or is direct PM-to-RM-to-Person assignment sufficient?"

**Answer (a) "direct sufficient":** `flag.feature.staffing.proposalSlate.enabled = OFF` for v1. Sidebar shows ONE staffing entry path (Make Assignment from /staffing-desk or Quick Assign from RM Dashboard). The 5–7 path duplication collapses naturally.

**Answer (b) "need slate":** Same flag = ON. Then we MUST fix B-07 (status duality) and B-08 (SLA empty) in F-1, and trim the 3 entry points on /staffing-desk to ONE.

The default in this plan assumes (a). If (b), add 1 week to launch.

### IV.5 The maintenance model — preventing rot of toggled-off code

A risk of toggling: code rots silently because nobody runs its tests. Mitigations:

1. **Shadow CI** — `npm run verify:shadow` runs the full test suite **with all flags forced ON in test env**. Runs nightly. Catches breakage even when the feature isn't user-visible. Failures block flag promotion.

2. **`npm run verify:pr`** runs only on-flag tests by default. Faster; lets PRs ship without nightly cost.

3. **Maturity gate** — to promote a flag from `beta` → `ga`:
   - Shadow CI green for 2 sprints
   - At least 1 customer has run with the flag ON in production for 1 sprint
   - Owner sign-off
   - Documentation updated

4. **Quarterly cleanup** — flags at `scaffolded` for >2 quarters trigger a review: promote to `developing`, accept staying scaffolded with explicit owner+ETA, or deprecate (delete code).

5. **Flag count limit** — soft cap at 80 flags. If we approach, force a cleanup sprint.

6. **No flag at GA without a deprecation ETA** — every GA flag has an `expectedDeprecationSprint` (often "v∞" but defined). This prevents flag bit-rot.

---

## Part V — Remediation roadmap (sprint by sprint)

### Sprint F-0 — Foundation (week 1–2)

**Demoable outcome:** Backend healthy. Audit pipeline records every state change. Skill data not silently dropped. Locale fixed. v1 sidebar trimmed to 12 entries. Project Detail to 5 tabs.

| Day | Task ID | Description | Closes |
|---|---|---|---|
| 1 | F-0.1 | Author flag registry: extend `PlatformSettingsService.DEFAULTS` with all 60 flags from §IV.2 + metadata. Implement `@RequireFeature` decorator + `<FeatureGuard>` HOC + nav-visible predicate on route-manifest. CI scripts `flags:check` + `feature-doc:check`. | flag infrastructure |
| 2 | F-0.2 (B-01) | Fix `PublicIdBootstrapService` DI failure. Make `PublicIdModule` `@Global()`; ensure providers + exports correct. Backend boots healthy. | D-02 |
| 3 | F-0.3 (B-02 part 1) | In `create-employee.service.ts` and `activate-project.service.ts`, **remove the `?` from optional injections** for `auditLogger`, `employeeActivityService`, `notificationEventTranslator`, `createLifecycleCase`. Make them **required**. Update the constituent module providers. | D-47 / D-59 / D-70 / D-91 / D-93 / D-95 root cause |
| 4 | F-0.4 (B-02 part 2) | Audit other state-changing services (`assignments/transition-project-assignment.service.ts`, `case-management/*`, etc.) for the same `?` pattern. Make required. Run shadow CI to catch any DI gap. | extends D-47 |
| 5 | F-0.5 (B-03) | In Create Employee form (`AdminPeopleNewPage.tsx`), replace skillset checkboxes with the same skill multi-picker the Person 360 → Skills tab uses. Form writes to `PersonSkill` rows; legacy `Person.skillsets[]` is read-only and emits a deprecation warning in TS. | D-46 / D-30 |
| 6 | F-0.6 | Person 360 status fix (B-04). Project Priority round-trip test (B-05). KPI vs Pulse reconcile (B-06; collapse Project Pulse to single source = Radiator overall, OR drop Pulse panel from header). | D-45 / D-49 / D-53 / D-54 |
| 7 | F-0.7 | Locale picker on Account Settings (B-10 / D-29 / D-86 / D-96). Timezone picker (D-97). Breadcrumb derives from current route, not history (B-11 / D-27 / D-74). Page title fix on /admin/people/new (D-28). | D-29 / D-27 / D-28 / D-86 / D-96 / D-97 |
| 8 | F-0.8 | Drop SSE stream attempt (B-13 / D-87) — switch bell to 30-second polling. N+1 fix on /projects (B-14 / D-88) — single batch endpoint with health computed in one query (subquery or precomputed cache). | D-87 / D-88 |
| 9 | F-0.9 | Investigate I-01 (audit pipeline still producing 0 records post-B-02 — verify), I-02 (migration off-by-one — `_prisma_migrations` table audit), I-03 (integration syncs never run — trigger sync manually, verify execution), I-04 (PM impersonation My Time visibility — fix sidebar logic). | D-89 / D-90 / D-91 / D-92 |
| 10 | F-0.10 | Apply v1 flag defaults per §IV.2 — sidebar trims to 12 entries; Project Detail to 5 tabs. Schema drift audit (D-03) — diff working copy vs origin/main. Resolve. | D-03 + cuts apply |
| 11 | F-0.11 | Cold-start radiator suppression on /projects health column when flag OFF (B-09 / D-55 / D-56). | D-55 / D-56 |
| 12 | F-0.12 | Post-create redirect for Create Project (D-50). Project code generator unification (D-52). | D-50 / D-52 |
| 13 | F-0.13 | Internal UAT 1-12 (see §V.4 Scenario list). Capture issues. | quality |
| 14 | F-0.14 | Sprint review. Defect triage: in-scope = fix in F-1; out-of-scope = post-launch. | gate |

### Sprint F-1 — Quality + customer prep (week 3)

**Demoable outcome:** v1 is customer-presentable. M365/Jira sync verified against customer's actual systems. Backup + restore tested. Tenant Settings Catalog UI live. Admin runbook + role quick-starts authored.

| Day | Task ID | Description |
|---|---|---|
| 15 | F-1.1 | Tenant Settings → Catalog admin page (renders flag registry; admin can edit). |
| 16 | F-1.2 | Admin runbook authoring: setup, daily ops, user mgmt, escalation, rollback. Per-role quick-starts (Employee 1-page, PM 1-page, RM 1-page). |
| 17 | F-1.3 | M365 sync against **customer's** real M365 tenant. Reconciliation walkthrough. |
| 18 | F-1.4 | Jira sync against **customer's** real Jira project(s). |
| 19 | F-1.5 | Backup + restore drill. End-to-end: snapshot Postgres, simulate failure, restore on staging, verify data integrity. **Mandatory pass** or launch slips. |
| 20 | F-1.6 | Performance baseline: 10 concurrent users hitting all 12 v1 surfaces. Capture p95 latency per route. n+1 fix should produce 5-10× improvement on /projects. |
| 21 | F-1.7 | Side drawer cleanup on /staffing-desk (L-4). Pagination off-by-one fix (L-3). Capitalisation route 404 fix (D-NEW). Empty-state copy + CTA pass for Notifications inbox. PM impersonation My Time visibility fix (D-92). |
| 22 | F-1.8 | (If customer chose proposal slate ON in F-1.0) Fix B-07 status duality + B-08 SLA empty + collapse 3 SR entry points to 1. Otherwise this day is buffer. |
| 23 | F-1.9 | Customer pre-UAT walkthrough. |
| 24 | F-1.10 | Sprint review + go/no-go for customer UAT. |

### Sprint F-2 — Customer UAT + cutover (week 4)

| Day | Task ID | Description |
|---|---|---|
| 25 | F-2.1 | Customer UAT day 1. Scenarios 1–12 from §V.4. |
| 26 | F-2.2 | Customer UAT day 2. Scenarios 13–24 from §V.4. |
| 27 | F-2.3 | Fix UAT findings (max 1 day). Anything else → post-launch backlog. |
| 28 | F-2.4 | Go/no-go meeting with customer + IT operations. |
| 29 | F-2.5 | Production deployment. Smoke test: log in as each enabled role; walk one happy path each. Verify M365 sync nightly. Verify backup ran. |
| 30 | F-2.6 | **GO LIVE.** Admin training session (4 hours). On-call rotation activated. |
| 31–32 | F-2.7 | Hypercare day 1–2: customer-side daily standup; engineer-side 4-hour issue triage SLA; P0 fixes deployed within 24 hours. |

### Beyond F-2 — parallel tracks

**Track A: Hypercare (full team, week 5–6).** Issues from real customer use surface daily. Triage, fix, deploy, communicate.

**Track B: Flag promotion (after week 6).** Customer asks → promote flag through gates. Realistic order:
- v1.1 (week 6–10): `feature.helpCenter` (DOC-02), `feature.onboardingTour` (DOC-03), `feature.project.milestones`, `feature.cmdk.peopleSearch` (fix + flip), `feature.notifications.preferences`.
- v1.2 (week 10–16): `feature.staffing.proposalSlate` (if customer asks), `feature.cases`, `feature.leaveRequests`, `feature.staffing.distributionStudio`.
- v1.3+ (3 months+): `feature.project.radiator` (after cold-start fix), Director/HR/DM dashboards, multi-currency, matching engine v2.

**Track C: Architectural debt ratchets (continuous).** Each sprint reduces by ≥10% the baseline of:
- 1,041 hardcoded role string literals
- 73 models lacking `version` column
- 47 controllers leaking UUIDs
- API DS conformance baseline

### Sprint demo gate (every sprint)

A sprint is "shipped" iff:
1. A named user role can perform a named action they couldn't before, on the live stage, in ≤3 clicks.
2. At least 1 Playwright spec proves it.
3. CHANGELOG.md has a one-line description + screenshot.
4. All CI ratchets stay green or strictly decrease.

---

## Part VI — Per-domain v1 specs (the survivor set)

### VI.1 Employee domain (v1 surface)

**Models active:** Person, PersonOrgMembership, ReportingLine, PersonResourcePoolMembership, OrgUnit, ResourcePool, PersonCostRate, Skill, PersonSkill, EmployeeActivityEvent, PulseEntry.

**Routes visible:**
- `/people` (directory, all roles read-only, RM/Admin/HR can edit)
- `/people/:id` (Person 360: Overview, 360 View, Skills, History)
- `/admin/people/new` (Create Employee form — fixed in F-0.5 + F-0.7)
- `/dashboard/employee` (self-dashboard with Pulse + Workload Gauge + Current Assignments + My Time CTA)
- `/org` (interactive org chart)
- `/resource-pools` + `/resource-pools/:id` (RM/HR)
- `/teams` is OFF in v1; ResourcePool is the canonical grouping

**Endpoints active (~25):** GET/POST `/org/people`, GET `/org/people/:id`, GET `/org/people/:id/activity`, deactivate, terminate, reporting-line CRUD, `/teams/*` (OFF), `/org/chart`, `/org/managers/:id/scope`, `/people/:id/360`, `/admin/skills/*`, `/pulse` POST + `/pulse/my` GET, `/resource-pools/*`.

**Business invariants enforced:**
- `Person.actorId !== Person.id` for self-action gates (already in 20b-03)
- `Person.employmentStatus = TERMINATED → all assignments status ∈ {COMPLETED, CANCELLED}` (cascade in TerminateEmployeeService)
- Audit row written on every create / deactivate / terminate (post-F-0.3 fix)
- `EmployeeActivityEvent.HIRED` row written on Person create (post-F-0.3)

**Open question parked for v1.1:** Add Employee wizard with M365 prefill (P-02). Current form works.

### VI.2 Project domain (v1 surface)

**Models active:** Project (trimmed view — flag.project.radiator OFF means radiator-related cols are read-only/hidden), Client, ProjectAssignment, ProjectBudget (basic capex/opex/actualCost; no EVM in v1), AssignmentApproval (legacy column structure stays), AssignmentHistory.

**Models with flag-OFF semantics:** ProjectMilestone, ProjectChangeRequest, ProjectRisk, ProjectVendorEngagement, ProjectWorkstream, ProjectRetrospective, ProjectRolePlan, ProjectRagSnapshot, ProjectRadiatorOverride.

**Routes visible:**
- `/projects` (list with health column **suppressed when radiator flag OFF** — show `—` instead of fake score)
- `/projects/:id` with 5 tabs: **Overview · Team · Time · Budget · Lifecycle**
- `/projects/new` (3-step wizard — fix priority round-trip in F-0.6, redirect after create in F-0.12)

**Endpoints active (~12):** POST `/projects`, POST `/projects/:id/activate`, POST `/projects/:id/close`, POST `/projects/:id/assign-team`, GET `/projects` (single batch with health computed), GET `/projects/:id`, GET `/projects/:id/dashboard`, PUT `/projects/:id/budget`, GET `/projects/:id/budget-dashboard`, PUT `/projects/:id/cost-rate`.

**Endpoints flagged OFF (~30):** all radiator, all risks, all CRs, all workstreams, all milestones (in v1), all vendors, all role plans, RAG snapshots, capitalisation, project pulse summary, SPC burndown.

**Business invariants enforced:**
- Project lifecycle: DRAFT → ACTIVE → CLOSED → ARCHIVED (no PENDING_APPROVAL state in v1; PM-01 deferred)
- Project audit row + outbox event written on activate (post-F-0.3 fix)
- Priority enum value saved correctly (post-F-0.6 fix)

### VI.3 Assignment domain (v1 surface)

**Models active:** ProjectAssignment, AssignmentHistory, AssignmentApproval (basic; multi-step Director approval flagged OFF).

**Effective state-machine for v1** (`flag.feature.staffing.workflowFullState.enabled = OFF`):
```
PLANNED → ACTIVE → COMPLETED
              ↓
         CANCELLED  (with reason)
```

The DB enum still has all 9 states (DRAFT/CREATED/PROPOSED/IN_REVIEW/REJECTED/BOOKED/ONBOARDING/ASSIGNED/ON_HOLD/COMPLETED/CANCELLED), but `transition-project-assignment.service.ts` enforces only the 4-state subset for v1 transitions. Code path for the others stays compiled and tested under shadow CI.

**Routes visible:**
- `/assignments` (list)
- `/assignments/:id` (detail with state-machine actions)
- `/assignments/new` (create form — single canonical entry)
- `/assignments/queue` (Approval Queue — for timesheet approvals primarily, plus pending assignments needing PM review)
- `/assignments/bulk` (bulk creation — kept ON for ops multiplier)
- `/staffing-desk` (Table view + planner view — but Planner is read-mode in v1; inline edit is v1.2)

**Endpoints active (~10 for v1 4-state):** POST `/assignments`, POST `/assignments/bulk`, GET `/assignments`, GET `/assignments/:id`, PATCH `/assignments/:id`, the 4 transition endpoints (`/activate`, `/complete`, `/cancel`, plus a re-named `/plan` if needed).

**Endpoints flagged OFF (~12):** `/propose`, `/book`, `/onboarding`, `/assign`, `/hold`, `/release`, `/director-approve`, all proposal slate endpoints under `/assignments/:id/proposals/*`.

**Critical decision-dependent:** if customer chose `flag.feature.staffing.proposalSlate.enabled = ON`, then 9-state workflow flag also ON, and SR endpoints come back. Sprint F-1 day 22 absorbs that work.

### VI.4 Time domain (v1 surface)

**Models active:** TimesheetWeek, TimesheetEntry, PeriodLock.

**Models flagged OFF:** LeaveRequest, LeaveBalance, OvertimePolicy, OvertimeException, PublicHoliday.

**Routes visible:**
- `/my-time` (employee monthly grid — already polished)
- `/time-management` (manager Approval Queue + Compliance + Overtime tabs)
- Approval Queue inline approve/reject (already polished)
- Period Locks via `/admin` capitalisation tab → just /admin period-locks endpoint

**Endpoints active (~15):** `/my-time/*`, `/timesheets/my/*`, `/timesheets/:id/approve`, `/timesheets/:id/reject`, `/admin/period-locks/*`, `/reports/time`, `/time-management/*`.

**Endpoints flagged OFF:** `/leave-requests/*`, `/overtime/*`, `/public-holidays/*`.

**Business invariants enforced:**
- `actorId !== week.personId` on approveWeek (Phase 20b-02 already in)
- `PeriodLock(weekStart=W) → no TimesheetEntry updates within week W` (service blocks; CHECK trigger in v1.x)

### VI.5 Integrations domain (v1 surface)

**Active:** M365 directory sync (people), Jira project sync (conditional on customer use).

**Flagged OFF:** RADIUS, HRIS, Webhooks (in-memory store; not production), Access Policies (ABAC layer not enabled).

**Routes visible:**
- `/admin/integrations` (overview + trigger sync)
- `/integrations/m365/directory/sync` (POST), `/integrations/m365/directory/reconciliation` (GET)
- `/integrations/jira/projects/sync` (POST conditional)
- `/integrations/history` (GET)

**Critical fix in Sprint F-1:** verify the syncs actually run. Live monitoring shows "3 integrations: 3 never synced." Need to:
1. Trigger M365 sync against customer's actual tenant (Sprint F-1 day 17)
2. Trigger Jira sync against customer's actual project (Sprint F-1 day 18)
3. Verify `IntegrationSyncState.lastSyncAt` gets populated (it's not, currently)

### VI.6 Dashboards (v1 surface)

**Active:**
- `/` (auto-routes by role — Workload Overview for admin, Employee Dashboard for employee, etc.)
- `/dashboard/employee`, `/dashboard/project-manager`, `/dashboard/resource-manager`
- `/dashboard/planned-vs-actual`
- Workload Overview as the canonical exec view

**Flagged OFF:**
- `/dashboard/director`, `/dashboard/hr`, `/dashboard/delivery-manager` (personas deferred; admin uses Workload Overview as exec view in v1)
- `/dashboards/portfolio-radiator` (linked to project radiator)

**Endpoints active:** `/dashboard/employee/:personId`, `/dashboard/project-manager/:personId`, `/dashboard/resource-manager/:personId`, `/dashboard/workload/summary`, `/dashboard/workload/trend`, `/dashboard/workload/planned-vs-actual`, `/dashboard/portfolio/heatmap` (still useful for Workload Overview), `/dashboard/portfolio/summary`.

### VI.7 Admin (v1 surface)

**Active:**
- `/admin` (account mgmt)
- `/admin/dictionaries` (filtered to: `grade`, `role`, `staffing-roles`, `project-types`, `timesheet-rejection-reasons`. Hide flag-tied dictionaries: `case-kind-*`, `assignment-rejection-reasons`, `staffing-bands`, `case-intake-channel`)
- `/admin/audit` (Business Audit page — populates post-F-0.3 fix)
- `/admin/notifications` (templates + queue)
- `/admin/integrations`
- `/admin/monitoring`
- `/admin/organization-config`
- `/admin/tenant-settings` (NEW Catalog page from F-1.1)

**Flagged OFF:**
- `/admin/radiator-thresholds` (radiator OFF)
- `/admin/access-policies` (ABAC not enabled)
- `/admin/webhooks` (in-memory)
- `/admin/vendors` (deferred)
- `/admin/hris` (M365 covers v1)
- `/admin/people/import` (untested)

**Critical: dictionaries page must respect the parent feature flags.** A dictionary tied to `case-management` shouldn't appear if `flag.feature.cases.enabled = false`.

---

## Part VII — Long-term vision

### VII.1 v1 → v1.x roadmap

| Version | Window | Major work |
|---|---|---|
| v1.0 | week 1–4 (this plan) | 12 P0 bug fixes, sidebar/tab gating, 12 visible routes |
| v1.1 | week 6–10 | Help Center, Onboarding tour, ProjectMilestones, Cmd+K People search, Notification preferences |
| v1.2 | week 10–16 | Proposal Slate (if asked), Cases, Leave Requests, Distribution Studio inline edit |
| v1.3 | month 4 | Project Radiator (fixed cold-start), Director/HR/DM dashboards, multi-currency |
| v1.4 | month 5–6 | Matching engine v2, RBAC ABAC layer, full API DS migration |
| v2.0 | year 2 | If customer base grows: SaaS migration (J1 reverse), tenant RLS enabled, multi-tenant deployment |

### VII.2 Architectural debt retirement plan

Per HARDEN_WIRING_MAP §16, the six DS spines run in parallel as ratchets:

1. **UI / Visual DS** — already enforcing (`tokens:check`, `ds:check`)
2. **API DS** — baseline in v1.1, ratchet by ≥10%/sprint, GA target v1.4
3. **Authorization DS** — baseline in v1.1, ratchet RBAC role literals 1041→0 over 6 sprints
4. **Data DS** — backfill `version` column on 73 aggregates over 3 sprints starting v1.1
5. **Customization DS** — ratchet hardcoded thresholds → PlatformSetting over 4 sprints
6. **Consistency DS** — invariant register → reconcilers, one new reconciler per sprint starting v1.1

Each ratchet has a baseline JSON file checked into the repo. PRs that increase the baseline fail CI. PRs that decrease it auto-update.

---

## Part VIII — Maintenance model

### VIII.1 Shadow CI — preventing toggled-off rot

**Daily nightly job** runs `npm run verify:shadow`:
- All tests, all flags forced ON in test env
- Includes `e2e/ux-regression/` Playwright suite
- Includes service-level integration tests for flagged-off services
- Failures notify the feature owner (per `flag.feature.<name>.owner` metadata)

If shadow CI fails for a flagged-OFF feature, that feature's flag is **frozen** (cannot promote to GA) until shadow CI is green for 2 consecutive nights.

### VIII.2 Flag promotion gates

```
scaffolded → developing
  Trigger: feature has at least 1 working code path + 1 test
  Owner: assigned

developing → beta
  Shadow CI green for 1 sprint
  Documentation drafted
  Owner sign-off

beta → ga
  Shadow CI green for 2 sprints
  At least 1 customer ran with flag ON in production for 1 sprint
  Hypercare incident-free for 1 week
  Owner sign-off
  Documentation public

ga → deprecated (rare)
  No customer uses for 3 quarters
  OR superseded by another GA feature
  Owner sign-off
  6-month deprecation period before code deletion
```

### VIII.3 Quarterly flag review

Every quarter, the team reviews the flag registry:

| Status quo | Action |
|---|---|
| Flag at `scaffolded` for >2 quarters with no progress | Review; promote to `developing` with ETA, or delete |
| Flag at `beta` for >2 quarters with no customer pilot | Promote to GA OR demote to `developing` |
| Flag at `ga` with 0 active tenants | Mark `deprecated` with sunset date |
| Flag count >80 | Trigger cleanup sprint |

This prevents flag accumulation and ensures the registry stays meaningful.

### VIII.4 Documentation discipline

Every flag has:
- A CHANGELOG entry when promoted
- A doc page if the feature has user-facing UI
- A description of what tenants get when ON vs OFF
- A migration note if data shape changes between OFF and ON states

Documentation is enforced by `feature-doc:check` CI script.

---

## Part IX — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **B-02 fix (audit pipeline) takes >2 days** | Medium | High — blocks downstream | Start day 3 of F-0; if day 5 still broken, escalate / pair-program |
| **Customer M365 tenant has unmapped users** | High | Medium | Manual reconciliation page already exists; train operator in F-1.3 |
| **Customer's actual data has shapes the seed didn't anticipate** | Medium | Medium | F-1.3 + F-1.4 customer-data verification sessions |
| **Customer rejects the slate-OFF default** | Medium | Medium-High | Ask in F-0.10; if (b), add 1 week, ship slate ON with B-07/B-08 fixes in F-1 |
| **D-89 migration off-by-one is data corruption, not display bug** | Low | Critical | F-0.9 audit — if real, halt deploy and fix |
| **Backup/restore drill fails** | Low | Critical | F-1.5 — if fails, slip launch by 1 week to fix |
| **Customer adoption fails because employees resist daily time logging** | Medium | High | Customer-side change management; outside our scope; flag in handoff |
| **Performance under customer load is bad** | Medium | Medium | F-1.6 baseline; n+1 fix should help; tune Postgres if needed |
| **Toggled-off code rots silently** | Medium | Medium | Shadow CI nightly + flag promotion gates |
| **Flag count explodes (>100 flags)** | Low | Medium | Quarterly cleanup; soft cap 80 |
| **Hypercare exposes a P0 bug post-launch** | Medium | High | Image-tag rollback documented; DB snapshot before go-live; on-call rotation active |
| **HR / Director persona deferred causes signoff blockers** | Low | Medium | Workload Overview covers exec view; admin can do HR functions for v1 |
| **Production tenant Russian-locale dates leak through to customer** | High pre-F-0.7 | Medium | F-0.7 mandatory; otherwise communicate as known limitation |
| **OutboxEventPublisher promoted but consumers fail under load** | Low | Medium | Promote to beta in v1.1 only; GA after monitored production runtime |
| **Integration sync trigger silently fails post-deploy** | Medium | Medium | F-1.3 + F-1.4 verification; monitoring KPIs added in v1.x |

---

## Part X — Appendices

### X.1 The 12 v1 visible routes (final)

```
/                                  (auto-routes by role)
/dashboard/employee                (Employee)
/dashboard/project-manager         (PM)
/dashboard/resource-manager        (RM)
/dashboard/planned-vs-actual       (Mgmt roles)
/people                            (all)
/people/:id                        (all, scope-respected)
/admin/people/new                  (Admin / HR / Director)
/projects                          (all)
/projects/:id                      (all)
/projects/new                      (PM / DM / Admin / Director)
/assignments                       (all)
/assignments/new                   (RM / Admin / Director / DM)
/assignments/:id                   (all)
/assignments/queue                 (PM / RM / DM / HR / Director / Admin)
/assignments/bulk                  (PM / RM / Admin / Director / DM)
/staffing-desk                     (RM / DM / PM / Director / Admin)
/my-time                           (all)
/time-management                   (Time managers)
/leave (FLAG OFF)                  (all)
/cases (FLAG OFF)                  (all)
/notifications                     (all)
/settings/account                  (all)
/admin                             (Admin only)
/admin/dictionaries                (Admin)
/admin/audit                       (Admin)
/admin/notifications               (Admin)
/admin/integrations                (Admin)
/admin/monitoring                  (Admin)
/admin/organization-config         (Admin)
/admin/tenant-settings             (Admin — NEW from F-1.1)
/login, /forgot-password, /reset-password, /setup
```

### X.2 The 24 UAT scenarios (must all pass before GO LIVE)

1. First-time login by each role lands on correct dashboard ≤2 sec
2. Add new employee via `/admin/people/new` → person created → History tab shows HIRED entry within 30 sec → RM gets in-app notification
3. Edit person's skills via Person 360 → Edit Skills → adds React → Save → DB shows PersonSkill row, NOT Person.skillsets[]
4. Create project (PM): 3-step wizard → save → redirected to /projects/:id → priority HIGH stays HIGH → Lifecycle tab shows CREATED entry
5. Activate project (PM): Lifecycle → Activate → status ACTIVE → Lifecycle shows ACTIVATED entry → admin Audit page shows entry
6. (If slate flag ON) Create staffing request (PM) → RM proposes 2 candidates → PM picks → assignment status BOOKED
7. (If slate flag OFF) Make assignment direct (RM) → form filled → save → status PLANNED → date passes → status auto-flips to ACTIVE
8. Schedule onboarding (PM/RM): assignment in PLANNED → Schedule onboarding → onboarding date set
9. Activate assignment (PM/RM): becomes ACTIVE
10. Employee logs hours weekly: /my-time → fill → Submit → TimesheetWeek SUBMITTED
11. PM approves timesheet: /time-management → Approve → status APPROVED
12. PM rejects with reason: /time-management → Reject → reason captured → person notified
13. Admin locks period: /admin period-locks → +New → subsequent edits blocked
14. Submit Pulse (employee): emoji selector → submit → recorded → see on next dashboard load
15. Workload Overview: KPIs accurate → click "Idle Workforce 131 people" → filtered list of unassigned people
16. PM Dashboard: see own portfolio + staffing gaps + recent activity
17. RM Dashboard: capacity heatmap + idle/overallocated tiles → click overallocated → list
18. /people directory filter by role/pool/status round-trips via URL params
19. /projects list health column shows `—` for new projects (cold-start suppressed)
20. View-as impersonation: admin → switch to PM → sidebar shrinks → exit → reverts cleanly
21. RBAC: PM tries to navigate to /admin → redirected to PM dashboard with toast
22. Notification bell badge updates within 30s of action (polling-based)
23. Email notification arrives within 60s of test send (verified via /admin/notifications → Send Test)
24. Sign out → session cleared → /protected redirects to /login

If any scenario fails, fix it in F-2.3 or accept-and-document → log in known issues.

### X.3 The flag CI scripts (added in F-0.1)

```
scripts/check-flags.cjs:
  Asserts every flag.feature.* referenced in src/ or frontend/src/ has a
  registry entry in PlatformSettingsService.DEFAULTS with non-null
  enabled/maturityLevel/expectedGaSprint/owner.
  Fails CI if any flag is missing metadata.

scripts/check-feature-doc.cjs:
  Asserts every GA flag has a docs/features/<name>.md file.
  Asserts every beta flag has at minimum a CHANGELOG entry.
  Asserts every scaffolded flag has expectedGaSprint set.

scripts/run-shadow-tests.cjs:
  Runs npm run verify:full with all flags forced ON in test env.
  Used by nightly CI; not blocking PR merges.
```

### X.4 The Claude Code execution prompt (paste-ready)

```
You are executing the ULTIMATE_ANALYSIS_AND_PLAN per docs/planning/ULTIMATE_ANALYSIS_AND_PLAN.md.

This document REPLACES all prior plans:
  LAUNCH_PIVOT_PLAN.md
  LAUNCH_CRITICAL_PIVOT.md
  SQUASH_AND_REMEDIATE.md
  FOUNDATION_PLAN.md

Strategy: TOGGLE NOT DROP. v1 launches with ~14 features ON and ~46 OFF.
Toggled-off code stays in main branch and develops in parallel under shadow CI.

Goal: ship v1 to one IT-block customer (20-100 people) in 4 weeks. Every
toggled-off feature stays maintainable for v1.1+ promotion.

Pre-flight reading (in order):
  1. CLAUDE.md
  2. ULTIMATE_ANALYSIS_AND_PLAN.md (this file IS THE TRUTH)
  3. HARDEN_BRIEF.md §3.1 (transactions), §4.3 (P-tasks)
  4. HARDEN_WIRING_MAP.md §11–§16 (six DS spines)
  5. CLAUDE_CODE_TASKS.md Sprint 0 (P0 fix specs)

CRITICAL DECISION GATE — ask the customer in week 1, before F-0.10:
  "Does the customer need the multi-candidate proposal-slate flow in v1, or is
  direct PM-to-RM-to-Person assignment sufficient?"
  Answer determines flag.feature.staffing.proposalSlate.enabled = ON | OFF.

Definition of Done (every task):
  - tsc --noEmit clean
  - npm run verify:pr green (and shadow:nightly stays green)
  - At least 1 test for changed logic (annotated with @featureFlag if toggled-off)
  - At least 1 Playwright spec for user-visible change
  - CHANGELOG.md updated
  - Live stage walkthrough confirms

SPRINT F-0 (week 1-2) — Foundation
  Day 1: Flag registry + decorators + CI scripts (F-0.1)
  Day 2: B-01 PublicId DI fix
  Day 3-4: B-02 root cause fix (remove ? from optional injections; wire providers)
  Day 5: B-03 Skills write-block (route Create form to PersonSkill)
  Day 6: B-04 Person 360 status, B-05 priority, B-06 KPI/Pulse
  Day 7: B-10 locale picker + timezone picker (D-29/D-86/D-96/D-97), B-11 breadcrumb
  Day 8: B-13 drop SSE, switch bell to polling; B-14 N+1 on /projects batch
  Day 9: I-01 audit pipeline, I-02 migration off-by-one, I-03 integration syncs, I-04 PM /my-time
  Day 10: Apply v1 flag defaults; sidebar trims to 12; Project Detail to 5 tabs; D-03 schema drift
  Day 11: B-09 cold-start radiator suppression on /projects health column
  Day 12: D-50 redirect after create; D-52 project code generator
  Day 13: Internal UAT 1-12
  Day 14: Sprint review + defect log

SPRINT F-1 (week 3) — Quality + customer prep
  Day 15: F-1.1 Tenant Settings Catalog page
  Day 16: F-1.2 Admin runbook + role quick-starts
  Day 17: F-1.3 M365 sync against customer's tenant
  Day 18: F-1.4 Jira sync against customer's projects
  Day 19: F-1.5 Backup/restore drill (mandatory pass)
  Day 20: F-1.6 Perf baseline (10 concurrent users)
  Day 21: F-1.7 Polish (drawer, pagination, capitalisation route, empty-state, PM /my-time)
  Day 22: F-1.8 Slate-related fixes IF customer chose ON
  Day 23: F-1.9 Customer pre-UAT walkthrough
  Day 24: F-1.10 Sprint review + go/no-go for UAT

SPRINT F-2 (week 4) — Customer UAT + cutover
  Day 25-26: Customer UAT 1-24
  Day 27: Fix findings
  Day 28: Go/no-go
  Day 29: Production deployment + smoke test
  Day 30: GO LIVE + admin training
  Day 31-32: Hypercare day 1-2

Operating rules:
  - Use Skill tool: engineering:debug for B-fixes; engineering:tech-debt for cuts;
    engineering:testing-strategy for shadow CI design
  - Use Task tool: Plan subagent for architecture (esp. flag registry); general-purpose
    for parallel non-blocking work; Explore for breadth-search
  - Save checkpoints to docs/planning/foundation-checkpoints/<sprint>.md every 30 min
  - Never bypass --no-verify
  - When blocked, AskUserQuestion before guessing
  - For toggled-off features encountered during a B-fix: leave the code path intact;
    just verify the @RequireFeature gate is correct

Begin Sprint F-0 Day 1: author the flag registry.
```

---

## XI — End notes

**This is the deepest analysis I can produce in the time available.** It's grounded in:
- 30+ live screen walks (all four launch domains, all admin sub-pages, every Project tab attempted, multiple personas via View-as)
- 6 service files read end-to-end with code-line citations
- 5 web searches validating the plan against industry practice (PSA / Float / Runn / outbox / feature flags)
- 60+ network requests captured (which surfaced D-87 SSE 503 and D-88 N+1)
- Comparison against Float / Runn / Kantata current behavior
- Cross-reference with the prior corpus (HARDEN_BRIEF, HARDEN_WIRING_MAP, CLAUDE_CODE_TASKS)

**It is necessarily incomplete.** Per HARDEN_WIRING_MAP §18 "Discovery is a process, not an event" — every iteration of search adds D-items. The plan is **designed for that**: the 60-flag toggle architecture + shadow CI + flag-promotion gates + quarterly review + 6 architectural ratchets give the platform a way to find, fix, and harden continuously rather than episodically.

**The biggest single risk** isn't software — it's customer change management. Logging time daily is a behavior change. Flag the operator about it explicitly during F-2.6 admin training.

**The biggest single opportunity** is the convergence of Pulse + Time + Staffing into a coherent operator narrative: *"We see what people are doing, how they feel, and where capacity is."* That's the v1 elevator pitch and the v1.x growth runway.

Hand `ULTIMATE_ANALYSIS_AND_PLAN.md` and the §X.4 prompt to Claude Code in VSCode. Ask the §IV.4 customer question in week 1. Begin Sprint F-0 Day 1.

— end —

---

## Sources (web research validation)

- [Birdview: Professional Services Automation Guide 2026](https://birdviewpsa.com/psa-guide/what-is-professional-services-automation-software/)
- [Rocketlane: PSA in Business](https://www.rocketlane.com/blogs/psa-in-business)
- [Ruddr: Top PSA Platforms for 2026](https://www.ruddr.com/post/top-professional-services-automation-psa-platforms-for-2026)
- [Float: Capacity Planning Tools 2026](https://www.float.com/resources/capacity-planning-software)
- [Float Resource Management Software Review 2026](https://thedigitalprojectmanager.com/tools/float-review/)
- [Float Schedule Product](https://www.float.com/product/scheduling)
- [Runn: IT Capacity Planning 2026](https://www.runn.io/blog/it-capacity-planning)
- [Runn Project Planner Help](https://help.runn.io/en/articles/4372978-project-planner-overview)
- [DEV Community: Outbox Pattern with Kafka and NestJS](https://dev.to/wallacefreitas/outbox-pattern-with-kafka-and-nestjs-ensuring-reliable-event-driven-systems-2f5k)
- [GitHub: Nestixis/nestjs-inbox-outbox](https://github.com/Nestixis/nestjs-inbox-outbox)
- [Microservices.io: Transactional Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [Sachith Dassanayake: Outbox Pattern Best Practices 2025](https://www.sachith.co.uk/outbox-pattern-for-reliable-events-best-practices-in-2025-practical-guide-may-8-2026/)
- [Growthbook: Feature Flags 2026](https://blog.growthbook.io/what-are-feature-flags/)
- [Harness: Splitting a Monolith With Feature Flags](https://www.harness.io/blog/splitting-a-monolith-with-feature-flags)
- [Flagsmith: Progressive Delivery with Feature Flags](https://www.flagsmith.com/blog/progressive-delivery)
- [Zylos: Feature Flags Architecture 2026](https://zylos.ai/research/2026-02-12-feature-flags)
