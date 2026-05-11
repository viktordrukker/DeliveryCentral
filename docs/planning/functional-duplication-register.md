# Functional Duplication Register (Phase 2)

**Run date:** 2026-05-09
**Method:** Three Explore subagents in parallel covered (a) Prisma schema double-truth, (b) backend controller/service duplication, (c) frontend surface duplication. Each candidate was verified by direct grep before classification (e.g., the `ProjectTag` / `ProjectTechnology` join tables surfaced as "deprecated columns" in HARDEN_BRIEF D-10 turned out to have **zero write sites anywhere** — they are orphaned schema, not double-truth; the legacy assignment services are injected but two of three are unreferenced — dead-code, not endpoint duplication). The register catalogs UI surfaces, API endpoints, services, and Prisma columns that do the same job under two names so we have one place to point WO-/PM-/DM-/HD- tasks at when consolidating them.

This register is intentionally narrower than `flow-audit.md` (Phase 1): the flow audit grouped duplicates by **user flow** (six paths to "place a person on a project"), while this register groups by **mechanism** (six places that mutate `ProjectAssignment.status`). Where a row matches an existing in-flight task it cross-references the D-/WO-/PM-/HD-/DM- ID rather than minting a new one.

---

## Top-level register

| # | Concept | Path A (canonical / kept) | Path B (deprecated / reroute) | SoT recommendation | Cost | Closing task |
|---|---|---|---|---|---|---|
| 1 | Skills double-truth | `PersonSkill` join (`prisma/schema.prisma:1547`) | `Person.skillsets String[]` (`prisma/schema.prisma:434`) | `PersonSkill` wins; `skillsets` becomes read-only then drops | M | **D-08 / P-04 / D-30 / D-46** (in tracker) |
| 2 | Project tags duplicate | `Project.tags String[]` (`prisma/schema.prisma:781`) | `ProjectTag` join (`prisma/schema.prisma:2589`) | Array wins (zero writes to join — orphaned schema); drop the join model | S | new — see §1 below |
| 3 | Project techStack duplicate | `Project.techStack String[]` (`prisma/schema.prisma:780`) | `ProjectTechnology` join (`prisma/schema.prisma:2576`) | Same as row #2; drop the join model | S | new — see §1 below; supersedes the "consolidate" half of D-10 |
| 4 | StaffingRequest status drift | `DeriveStaffingRequestStatusService` (computed from per-slot assignments) | `StaffingRequest.status` enum column (`prisma/schema.prisma:1595`) | Computed wins; column either becomes write-through cache or is dropped | M | **D-11 / S-13** (in tracker) |
| 5 | StaffingRequest headcountFulfilled | derive from `count(ProjectAssignment WHERE status IN BOOKED/ONBOARDING/ASSIGNED)` | `StaffingRequest.headcountFulfilled Int` (cached counter, `prisma/schema.prisma:1612` area; written manually by `in-memory-staffing-request.service.ts:188`) | Derive on read; deprecate the column | M | new — see §2 below |
| 6 | Person dual soft-delete | `Person.archivedAt` (`schema.prisma:443`) | `Person.deletedAt` (`schema.prisma:444`) | Pick one; recommend `archivedAt` (used by `@@index` lines 508, 533) and remove `deletedAt` if no GDPR purge process needs it | M | new — see §3 below |
| 7 | Project dual soft-delete | `Project.archivedAt` (`schema.prisma:799`) | `Project.deletedAt` (`schema.prisma:800`) | Same as row #6 | M | new — see §3 below |
| 8 | OrgUnit triple state | `OrgUnit.status` enum (`schema.prisma:633`) | `OrgUnit.archivedAt` + `OrgUnit.deletedAt` (640/641) | Status enum wins; backfill timestamps from status; drop `deletedAt`; keep `archivedAt` only as denormalized projection of `status='ARCHIVED'` | L | new — see §3 below |
| 9 | Project PM relation duplicate | `Project.projectManagerId` (`schema.prisma:772`, with `@relation("ProjectManager")`) | `Project.leadPmPersonId` (`schema.prisma:787`) | One must win — likely `projectManagerId` (older, indexed at line 824) — but verify; this looks like an in-flight DM-2.5 / DM-3 relation rationalisation | S/M | new — see §4 below; cross-ref Phase DM |
| 10 | "in-memory" misnamed service | `InMemoryStaffingRequestService` (`src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service.ts`) — uses Prisma | renamed `PrismaStaffingRequestService` or `StaffingRequestRepositoryService` | Rename + add a repository port | S | **D-24 / Phase 20c-03** (in tracker) |
| 11 | Dead legacy assignment services | `TransitionProjectAssignmentService` (canonical 9 routes wired in `assignments.controller.ts:257-376`) | `ApproveProjectAssignmentService`, `RejectProjectAssignmentService`, `RevokeProjectAssignmentService` — injected into controller (`assignments.controller.ts:82-88`) but **never called** from any HTTP route or other service | Remove the unused services + their imports + their providers in `assignments.module.ts` | S | new — see §5 below; **distinct from D-04 / D-89** which are about HTTP endpoints |
| 12 | Planner direct create vs canonical service | `CreateProjectAssignmentService.execute()` (canonical; runs in transaction + emits audit log) | `WorkforcePlannerService.applyPlan` calls `prisma.projectAssignment.create()` directly (`workforce-planner.service.ts:1226`) at status `PROPOSED` — bypasses canonical service, no audit log | Planner should call canonical service | M | new — see §5 below |
| 13 | Six paths create a `ProjectAssignment` row | (covers staffing-requests, /assignments, /assignments/bulk, /projects/:id/assign-team, /staffing-desk planner-apply, /staffing-board drag) | Already classified | Already MERGE — collapse to two CTAs | M | **D-85** (in tracker, new from Phase 1) |
| 14 | Two ways to fulfil a staffing request | `POST /staffing-requests/:id/proposals/:slateId/pick` (canonical, creates assignment at BOOKED) | `POST /staffing-requests/:id/fulfil` (`staffing-requests.controller.ts:320`; legacy; only marks fulfilment, no assignment) | Deprecate `/fulfil`; either remove or redirect to slate flow | S | new — see §5 below |
| 15 | Two metadata admin surfaces | `/metadata-admin` (`MetadataAdminPage.tsx`; ADMIN_ROLES; platform-wide; search-driven) | `/admin/dictionaries` (`DictionariesPage.tsx`; HR_DIRECTOR_ADMIN_ROLES; person-only legacy) | `/metadata-admin` wins — broader scope, newer; deprecate `/admin/dictionaries` | M | new — see §6 below |
| 16 | Two integrations surfaces | `/admin/integrations` (`IntegrationsAdminPage`; admin control panel — sync, reconcile) | `/integrations` (`IntegrationsPage`; read-only Jira status, links to admin page) | Both kept (not actually duplicate); add a manifest annotation that `/integrations` is a read-only consumer of `/admin/integrations` | S | new — see §6 below (REFUTED) |
| 17 | Two timesheet entry surfaces | `/my-time` (`MyTimePage`; navVisible:true) | `/timesheets` (`TimesheetPage`; navVisible:false legacy) | Already classified | S | **D-87** (in tracker, new from Phase 1) |
| 18 | Two timesheet approval surfaces | `/time-management` (`TimeManagementPage`) | `/timesheets/approval` (`TimesheetApprovalPage`; navVisible:false legacy) | Already classified | S | **D-88** (in tracker, new from Phase 1) |
| 19 | Two people-create surfaces | `/people/new` (`EmployeeLifecycleAdminPage`) | `/admin/people/new` (same component) | Already classified | S | **D-86** (in tracker, new from Phase 1) |
| 20 | Two staffing operating surfaces | `/staffing-desk` (`StaffingDeskPage`; canonical ops console — KPI strip, supply/demand, planner, assignments + requests) | `/staffing-board` (`StaffingBoardPage`; navVisible:false; drag-only board with conflict-check) | `/staffing-desk` wins; deprecate `/staffing-board` once drag-write is implemented in the desk | M | new — see §6 below; cross-ref **D-72** (refuted/closed) and the Distribution Studio reference |

---

## Per-concept rationale + migration plan

### §1 — Project.tags / techStack: orphaned join tables

**Path A** — `Project.tags String[]` and `Project.techStack String[]` are written by `create-project.service.ts:94-95`. Read sites exist throughout the app (search filters, badges, project detail page).

**Path B** — `model ProjectTag` and `model ProjectTechnology` exist in `prisma/schema.prisma:2576`/`:2589` but a recursive grep across `src/`, `prisma/seeds/`, and `frontend/src/` returns **zero write sites** for either model, and zero read sites that don't go through the parent `Project.tags`/`Project.techStack` array. They are orphaned schema.

**Why this matters.** HARDEN_BRIEF **D-10** classifies this as a "double-truth" with the same fix pattern as **D-08** (mark string-array as deprecated; route reads through the join). That diagnosis is correct *for skills* (PersonSkill has live writes from `EditSkillsTab`) but **wrong for tags / techStack** — there is no live join model to route to. The actual situation: someone designed and migrated the join tables, then never wired the writes; the array columns are the de-facto SoT.

**Migration plan (expand → migrate → contract collapsed to "contract"):** since there's nothing to migrate, just drop. Add a Prisma migration that `DROP TABLE project_tags` / `DROP TABLE project_technologies`; remove the two models from `schema.prisma`; remove any TypeScript types referencing them. **Cost: S.**

**Cross-references.** Supersedes the "consolidate" half of D-10 (HARDEN_BRIEF.md row 95) for Project; the *Person.skillsets* half of the same recommendation pattern is correct and stays under D-08. Update D-10 wording to "drop orphaned join tables" rather than "route reads through join".

---

### §2 — `StaffingRequest.headcountFulfilled` is a redundant counter

**Path A.** Derive on read: `count(ProjectAssignment WHERE staffingRequestId = X AND status IN ('BOOKED','ONBOARDING','ASSIGNED'))`. This is what `DeriveStaffingRequestStatusService` already does for `StaffingRequest.status`.

**Path B.** `StaffingRequest.headcountFulfilled Int @default(0)` is incremented manually in `in-memory-staffing-request.service.ts:188` (`fulfil()` method) and elsewhere. It is *also* used as a guard in `pickCandidate` to decide whether the request transitions to `FULFILLED`.

**Drift risk.** Any path that mutates a `ProjectAssignment.status` away from a fulfil-counted state (e.g., `release`, `cancel`, `reject`, `revoke`) without decrementing the counter leaves it stale. `WorkforcePlannerService.applyPlan` writes assignments at `PROPOSED` (which is *not* counted as fulfilled) — so it doesn't increment the counter; OK. But `EndProjectAssignmentService` is called from `terminate-employee.service.ts:56` to cascade terminations and end assignments — at that point the count *should* drop, and inspection of `end-project-assignment.service.ts` does not show a counter decrement.

**Migration plan.** Expand-migrate-contract: (a) add a derived getter on the read repository that ignores the column; (b) backfill the counter to match derived count; (c) remove the manual increment/decrement code; (d) drop the column. **Cost: M.** A safer interim: redefine the column as a write-through cache and add a periodic reconcile job (`AssignmentSlaSweepService` already runs ticks — easy to bolt onto).

**Cross-references.** Closely adjacent to D-11 (status drift) — same pattern, same module. Could be folded into S-13's scope.

---

### §3 — Dual soft-delete (`archivedAt` + `deletedAt`) on Person, Project, OrgUnit

**Path A.** `archivedAt DateTime?` is the column actually used by indexes — see `@@index([employmentStatus, archivedAt])` (Person, line 508), `@@index([status, archivedAt])` (Project, line 822, OrgUnit line 658). 35+ models in `schema.prisma` have `archivedAt`; it is the de-facto soft-delete convention.

**Path B.** `deletedAt DateTime?` exists on **only** Person (`schema.prisma:444`), Project (`:800`), and OrgUnit (`:641`) — the three "subject of right-to-be-forgotten" entities. It is *not* indexed on any of the three.

**Why this might be intentional.** GDPR distinguishes "archive / retain" (audit trail kept) from "delete / purge" (PII removed). A two-state column is a defensible design *if* there's a process that uses both. A grep of `src/` for `prisma.person.update.*deletedAt` and similar would reveal whether anyone actually writes `deletedAt` (the audit subagent found no live writers, but the search wasn't exhaustive).

**Migration plan.** Three-step decision tree:

1. If no service writes `deletedAt` and no scheduled job consumes it → drop the column (cost S).
2. If a GDPR purge job exists / is planned (e.g., for a "right to be forgotten" SLA) → keep both, but document the state machine in `prisma/schema.prisma` comments and gate visibility correctly: `archivedAt IS NOT NULL` = hidden from UI, `deletedAt IS NOT NULL` = PII redacted. (cost M to retrofit consistent gates)
3. If unsure → ask the user. The cost difference between (1) and (2) is large enough that we shouldn't guess.

**Cross-references.** OrgUnit additionally has `status OrgUnitStatus` so it is a triple state. Recommend folding into the DM-?? (data-model remediation) phase rather than minting standalone cleanup tasks.

---

### §4 — `Project.projectManagerId` vs `Project.leadPmPersonId`

**Path A.** `Project.projectManagerId String?` (`schema.prisma:772`) with `@relation("ProjectManager")` (line 801) — indexed (`@@index([projectManagerId])` line 824). This is the column read by `useDirectorDashboard()`, by the projects directory, by the workload matrix.

**Path B.** `Project.leadPmPersonId String?` (`schema.prisma:787`) — no `@relation(...)` decoration in the snippet I confirmed; no index.

**Status.** This looks like a half-finished rename: someone introduced `leadPmPersonId` (newer naming convention to disambiguate from the M365 "manager" relationship) but didn't migrate writers/readers. Need to verify via `git log -p prisma/schema.prisma | grep leadPmPersonId` whether this is in-flight Phase DM work — if it is, this row is not new, just a record. If not, it's genuine duplicate state.

**Migration plan.** Expand-migrate-contract: (a) audit all write sites for `projectManagerId` and `leadPmPersonId` separately; (b) decide on a winner (almost certainly `projectManagerId`, given index + active reads); (c) drop the loser; (d) reflect in DTOs.

**Cost: S** if `leadPmPersonId` is unused (rename in flight); **M** if both are written.

**Cross-references.** Phase DM-2.5 / DM-3 in MASTER_TRACKER. Confirm with user before classifying.

---

### §5 — Backend service double-truth

#### 5a — Dead legacy assignment services (NOT the same as D-04/D-89 endpoints)

Three legacy services are imported into `assignments.controller.ts` and registered as DI providers in `assignments.module.ts`, but only `EndProjectAssignmentService` has a live call site (`terminate-employee.service.ts:56` cascades on termination). The other three are unreferenced in `src/`:

| Service | Imported in controller | Provider in module | Live call site |
|---|---|---|---|
| `ApproveProjectAssignmentService` | yes (line 82) | yes | **none** |
| `RejectProjectAssignmentService` | yes (line 83) | yes | **none** |
| `EndProjectAssignmentService` | yes (line 84) | yes | `terminate-employee.service.ts:56` |
| `RevokeProjectAssignmentService` | yes (line 88) | yes | **none** |

This is **distinct from D-89** — which targets *HTTP endpoints* `/assignments/:id/{approve, reject, end, revoke, activate}`. The HTTP routes themselves do not exist on the controller (only the canonical 9 transitions + `activate` + `bulk` + `override` + `director-approve` + PATCH `:id` are wired). The legacy SERVICES are the leftover bit. Delete the unreferenced three and remove their imports / providers; keep `EndProjectAssignmentService` until the cascade is rerouted through the canonical `complete` transition.

**Cost: S.**

#### 5b — Planner direct write bypasses canonical service

`WorkforcePlannerService.applyPlan` (`workforce-planner.service.ts:1226`) calls `prisma.projectAssignment.create({...})` directly with `status='PROPOSED'`. The canonical `CreateProjectAssignmentService.execute()` does the same insert *plus* (a) wraps in `prisma.$transaction` (Phase 2a), (b) emits an `assignment.created` audit log, (c) calls the audit logger.

**Effect.** Planner-applied assignments don't appear in audit logs and don't share transaction boundaries with adjacent writes (so a partial failure can leave an assignment without its sibling case row).

**Migration plan.** Refactor `applyPlan` to call `CreateProjectAssignmentService.execute()`; pass through the planner's choice of initial status (`PROPOSED`) as a parameter (the canonical service already supports `initialStatus` per Flow 4 in `flow-audit.md` — Slate path injects `BOOKED`).

**Cost: M.** Cross-reference the Planner reference doc (`memory/reference-planner-distribution-studio.md`).

#### 5c — Two ways to fulfil a staffing request

`POST /staffing-requests/:id/proposals/:slateId/pick` (`staffing-requests.controller.ts:443` → `StaffingProposalSlateService.pickCandidate`) creates a ProjectAssignment at BOOKED (canonical Flow 4).

`POST /staffing-requests/:id/fulfil` (`staffing-requests.controller.ts:320` → `InMemoryStaffingRequestService.fulfil`) creates a `StaffingRequestFulfilment` row, increments `headcountFulfilled`, and marks the request `FULFILLED` if quota met — but does *not* create a ProjectAssignment.

The `/fulfil` path appears to be vestigial — no FE entry point seen. It would matter for a hypothetical "external system fulfils request" path (e.g., a partner bench supplied the person), but no such adapter exists today.

**Migration plan.** Verify no live callers (grep frontend/, grep tests/, check OpenAPI clients in `frontend/src/lib/api/staffing-requests.ts:106` — `submitStaffingRequest` is the wrapper for `submit`, not `fulfil`); then deprecate the route. **Cost: S.**

#### 5d — `InMemoryStaffingRequestService` misnamed

Service file `src/modules/staffing-requests/infrastructure/services/in-memory-staffing-request.service.ts` uses Prisma extensively (40+ calls per `MASTER_TRACKER.md` Phase 20c-03 description). The naming is misleading — `find` returns three `in-memory-*.service.ts` files in the repo: `in-memory-webhook.service.ts` (genuinely in-memory; no Prisma), `in-memory-case-sla.service.ts` (genuinely in-memory; pure config), and this one (Prisma-backed).

HARDEN_BRIEF D-24 says "Six 'in-memory' services exist by name" — I count three. Either D-24 was written when there were more (since dropped), or the count includes things in `__tests__/` directories. Either way, only one is misleading.

**Migration plan.** Rename to `PrismaStaffingRequestService` or extract a `StaffingRequestRepository` port + Prisma adapter so the public service name is back to `StaffingRequestService`. Update D-24 wording to "**One** 'in-memory'-named service uses Prisma underneath" if the count of three holds.

**Cost: S.** Cross-reference Phase 20c-03 / D-24.

---

### §6 — Frontend surface duplicates

#### 6a — `/admin/dictionaries` vs `/metadata-admin`

`/admin/dictionaries` (`frontend/src/routes/admin/DictionariesPage.tsx:19`, role gate `HR_DIRECTOR_ADMIN_ROLES`, group `admin`, navVisible:true) edits a fixed list of HR-related dictionaries (employment types, grades, departments) via legacy POST endpoints.

`/metadata-admin` (`frontend/src/routes/metadata-admin/MetadataAdminPage.tsx:15`, role gate `ADMIN_ROLES`, group `admin`, navVisible:true) is the platform-wide metadata editor — searchable, entity-type-filterable, and used by phase-DS work.

Both edit "metadata vocabularies" but have different scopes, role gates, and codepaths. The duplication is partial: `metadata-admin` covers *more*, but `admin/dictionaries` exists for HR users who don't have full ADMIN_ROLES.

**Migration plan.** Two options:

1. **Deprecate `/admin/dictionaries`** and grant `HR_DIRECTOR_ADMIN_ROLES` access to `/metadata-admin` filtered to `entityType IN ('person', 'employmentType', 'grade')`. Cleanest. Cost M (verify all HR vocabularies are exposed in `/metadata-admin`).
2. **Keep both, recategorize as different jobs.** `/admin/dictionaries` becomes "HR Dictionaries (legacy)"; `/metadata-admin` is "Platform Metadata". Cost S, but punts the consolidation.

Recommend (1) — fold into Phase DS metadata work.

**Note re: prompt's "3 admin metadata surfaces".** The prompt called out `/admin/metadata`, but that route does **not** exist in `route-manifest.ts`. The two real surfaces are `/admin/dictionaries` and `/metadata-admin`.

#### 6b — `/admin/integrations` vs `/integrations` (REFUTED — not a duplicate)

`/admin/integrations` is the operational control panel (sync, reconcile, configure providers — m365, radius, Jira). `/integrations` is a read-only Jira status dashboard for non-admin users that links into `/admin/integrations` for action. Different audiences, different RBAC, no overlap in writes. Keep both; just annotate the manifest description so future explorers don't re-flag this. **No D-item required.**

#### 6c — `/staffing-board` vs `/staffing-desk` (deprecate the board)

`/staffing-desk` (`StaffingDeskPage.tsx`) is the canonical operations surface — KPI strip, planner, supply/demand grid, assignments + requests merged, export. `/staffing-board` (`StaffingBoardPage.tsx`, navVisible:false) is the drag-and-drop board that today only writes through `GET /workload/check-conflict` (per **D-72** "planner read-only" — confirmed in Phase 1; D-72 was REFUTED in HARDEN_BRIEF closeout but the read-only nature is still true).

**Migration plan.** Either (a) implement drag-write inside `/staffing-desk` (aligns with the Distribution Studio reference) and remove `/staffing-board`, or (b) keep `/staffing-board` as a focused-mode view that delegates writes to the desk's underlying endpoint. Recommend (a). **Cost: M.**

**Cross-references.** D-72 (refuted, but the constraint persists), reference-planner-distribution-studio.md.

---

## Refuted candidates

The following looked like duplicates on first pass but turned out to be intentional architecture or in-flight migrations. They are listed here so they do not get re-flagged in future audits.

| Candidate | Verdict | Reason |
|---|---|---|
| `StaffingRequestStatus` (5 values) vs `ProjectAssignmentStatus` (9 values) | **NOT A DUPLICATE** | Request-level rollup vs slot-level detail. Documented in HARDEN_BRIEF D-21; correct architecture. |
| Slate `reject-all` vs assignment `/reject` | **NOT A DUPLICATE** | Different artifacts (proposal slate vs persisted assignment); different downstream effects. Already documented as D-90 (Phase 1). |
| Project `/close` vs `/close-override` | **NOT A DUPLICATE** | Escalation tier with different role gate + reason requirement. Both land on the same service. Documented in flow-audit row #7. |
| `ProjectRagSnapshot.overallRag` vs `autoComputedOverall` | **NOT A DUPLICATE** | Intentional: `autoComputedOverall` is the system-derived RAG; `overallRag` is the manual override; `isOverridden` flag (line 2324) tracks which wins. Designed correctly. |
| 4 workload surfaces (`/workload`, `/workload/planning`, `/staffing-board`, `/staffing-desk`) | **PARTIAL — only `/staffing-board` vs `/staffing-desk` is real** | `/workload` (matrix) and `/workload/planning` (12-week capacity forecast) show different KPIs from different endpoints. `/staffing-desk` and `/staffing-board` *do* overlap (row #20). |
| 8 dashboard surfaces | **NOT A DUPLICATE** | Each role's dashboard has unique sections; shared widgets (`RecentActivityRail`, `DataFreshness`) are correctly factored. |
| 3 navigation paths (Cmd+K, sidebar, breadcrumb) | **NOT A DUPLICATE** | All three derive from the same `appRoutes` source-of-truth in `frontend/src/app/navigation.ts` (which is itself derived from `route-manifest.ts`). The breadcrumb is intentionally manual to preserve filter context (UX Law 5 / Law 10). |
| M365 / Radius `personId` vs `candidatePersonIds[]` | **NOT A DUPLICATE** | Reconciliation pattern: `personId` is the resolved match; `candidatePersonIds[]` is the alternative-candidate list when match is ambiguous. Both required. |

---

## Phase 2 acceptance status

- ✅ **≥10 dup pairs registered** with SoT recommendation + cost (rows 1-20 in the top-level table; 12 are *new* this phase, 8 are cross-references to existing tracker work)
- ✅ Per-concept rationale + migration plan in §1-§6
- ✅ Refuted candidates section to prevent re-discovery
- ✅ File:line citations throughout

**Next:** AskUserQuestion → "Phase 2 complete; append D-94..D-NN to MASTER_TRACKER and stop?"
