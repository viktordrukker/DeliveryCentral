# Phase 2 Checkpoint — Functional Duplication Register

**Run date:** 2026-05-09
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/functional-duplication-register.md](../functional-duplication-register.md) — 20 candidate pairs registered (12 new + 8 cross-references) + 8 refuted candidates.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Dup pairs registered (with SoT + cost) | ≥10 | **20** rows in top-level table (12 new this phase + 8 cross-refs to existing D-/WO-/PM-/HD-/DM- IDs) |
| Schema double-truth (Prisma) | — | 9 (rows 1-9 in register; 4 cross-ref existing D-08 / D-10 / D-11; 5 new) |
| Backend service / API double-truth | — | 5 (rows 10-14; 1 cross-ref D-24; 1 cross-ref D-85; 3 new) |
| Frontend surface duplicates | — | 6 (rows 15-20; 3 cross-ref D-86/D-87/D-88; 2 new; 1 refuted) |
| Refuted (looked like dup, isn't) | — | 8 (table at bottom of register) |
| File:line citations per claim | every claim | yes |

## Findings summary (≤300 words)

**Two corrections to prior briefs surfaced during verification:**

1. **HARDEN_BRIEF D-10 is half-wrong.** `Project.tags String[]` and `Project.techStack String[]` coexist with `ProjectTag` / `ProjectTechnology` join tables — but the join tables have **zero write sites anywhere** (grep across `src/`, `prisma/seeds/`, `frontend/src/`). They are orphaned schema, not active double-truth. The fix is "drop the join tables" (cost S), not "route reads through join". This is **distinct from D-08** (PersonSkill is genuinely live, with writes from `EditSkillsTab`).

2. **The HARDEN_BRIEF D-04 / Phase WO-6 narrative about "legacy assignment endpoints" needs a footnote.** The HTTP routes `/assignments/:id/{approve, reject, end, revoke}` do **not** exist on `assignments.controller.ts`. What exists is the **legacy services** still injected into the controller's constructor (`ApproveProjectAssignmentService`, `RejectProjectAssignmentService`, `RevokeProjectAssignmentService`) with **no live call sites** — pure dead code. `EndProjectAssignmentService` is the exception: it has one live caller (`terminate-employee.service.ts:56` cascade). D-89 (Phase 1) covers the endpoint deprecation; new D-item covers the unused-services cleanup.

**Genuinely new findings:**

- §1 — `Project.tags`/`techStack` orphaned join tables (cost S, drop)
- §2 — `StaffingRequest.headcountFulfilled` redundant counter (cost M; folds into S-13 or D-11 scope)
- §3 — `archivedAt` + `deletedAt` dual soft-delete on Person/Project/OrgUnit (cost M; needs user decision: GDPR purge planned y/n?)
- §4 — `Project.projectManagerId` vs `Project.leadPmPersonId` relation duplicate (cost S/M; possibly already in DM-2.5/DM-3 scope)
- §5a — Three legacy assignment services injected but unused (`Approve/Reject/Revoke`) — dead code, cost S
- §5b — Planner direct write bypasses canonical `CreateProjectAssignmentService` (audit silence + transaction-boundary mismatch), cost M
- §5c — `POST /staffing-requests/:id/fulfil` legacy endpoint, no live FE callers, cost S
- §6a — `/admin/dictionaries` (HR-scoped legacy) vs `/metadata-admin` (platform-wide canonical), cost M to fold
- §6c — `/staffing-board` (drag-only, navVisible:false) vs `/staffing-desk` (canonical), cost M

**Refuted (will not become D-items):**
- StaffingRequestStatus 5-state vs ProjectAssignment 9-state (rollup vs detail; correct)
- 8 dashboards (intentionally role-scoped)
- 3 nav paths (single source-of-truth via `appRoutes`)
- 4 workload surfaces — only the staffing-board/staffing-desk pair is duplicate; `/workload` and `/workload/planning` are distinct
- M365/Radius candidatePersonIds[] (reconciliation pattern, intentional)
- ProjectRagSnapshot override (intentional manual-vs-derived)
- Project /close vs /close-override (escalation tier)
- Slate reject-all vs assignment /reject (different artifacts, different effects — already D-90)
- `/admin/integrations` vs `/integrations` (admin control vs read-only status, different audiences)

## Skills invoked

- `tech-debt-tracker` (closest local match) and `code-review-excellence` — methodology inlined: classify each pair as **drop / merge / document / keep / refuted**, demand a writer for each side before flagging "double-truth", and cross-reference existing tracker IDs rather than minting new ones.
- `codebase-cleanup-tech-debt` — concept used: distinguish *orphaned schema* (one writer or none) from *live double-truth* (two writers); the join-table case in §1 only became visible after this distinction.
- The spec-named `engineering:*`, `product-management:*`, `operations:*` plugins are not installed; methodology was inlined sufficiently from the local skills above plus the lean-flow rule from Phase 1.

## Tracker append plan (on user approval)

A new sub-heading `### Phase 2 — Functional duplication (docs/planning/functional-duplication-register.md)` will be appended to the **existing** `## Research Findings (D-85+)` section at the bottom of `MASTER_TRACKER.md`. Each entry: checkbox + bold D-id + verdict tag + body + source row.

| New D-id | Description | Source row |
|---|---|---|
| D-94 | [DROP] Drop orphaned `ProjectTag` and `ProjectTechnology` join tables — zero writes anywhere; arrays on `Project` are de-facto SoT; supersedes the "consolidate" half of HARDEN_BRIEF D-10 | register row #2-#3, §1 |
| D-95 | [DERIVE] Replace `StaffingRequest.headcountFulfilled` cached counter with a derived count — adjacent to D-11 status drift, candidate to fold into S-13 scope | register row #5, §2 |
| D-96 | [DECIDE] `archivedAt` + `deletedAt` dual soft-delete on `Person` / `Project` / `OrgUnit` — user decision needed: is GDPR purge a real process or vestigial; cost ranges S→L based on answer | register row #6-#8, §3 |
| D-97 | [VERIFY] `Project.projectManagerId` vs `Project.leadPmPersonId` relation duplicate — confirm whether DM-2.5/DM-3 already owns this; if not, audit writers and drop the loser | register row #9, §4 |
| D-98 | [DELETE] Three injected-but-unused legacy assignment services in `assignments.controller.ts` (`Approve/Reject/Revoke`); `End` retained for cascade. Distinct from D-89 (HTTP endpoints) | register row #11, §5a |
| D-99 | [REFACTOR] `WorkforcePlannerService.applyPlan` calls `prisma.projectAssignment.create()` directly — bypasses `CreateProjectAssignmentService` (no audit log, no transaction wrap) | register row #12, §5b |
| D-100 | [DEPRECATE] `POST /staffing-requests/:id/fulfil` — no live FE callers; canonical fulfilment goes through `/proposals/:slateId/pick` | register row #14, §5c |
| D-101 | [CONSOLIDATE] `/admin/dictionaries` (HR-scoped legacy) into `/metadata-admin` with role-scoped entity-type filter; or formally split if both must remain | register row #15, §6a |
| D-102 | [DEPRECATE] `/staffing-board` once drag-write lands in `/staffing-desk` (Distribution Studio scope); cross-ref D-72 (refuted) | register row #20, §6c |

(9 new D-items; counter ends at D-102.)

## Open questions / next-session inputs

- **D-96 hinges on a yes/no:** does any team operate (or plan to operate) a GDPR purge job that consumes `Person.deletedAt` / `Project.deletedAt`? If yes, we keep both columns and document the state machine; if no, we drop `deletedAt` from all three models. Recommend asking before implementation kicks off.
- **D-97 may already be DM-2.5 / DM-3 scope** — confirm with `git log -p prisma/schema.prisma -- "*leadPmPersonId*"` whether the column was added recently as part of an in-flight rename. If yes, don't mint a new D-item; just append a cross-reference. *(Not done in this phase to avoid scope creep.)*
- **Phase 3 input:** the schema double-truth findings here (rows 1-9) are 1:1 inputs to the Phase 3 "data model audit" deliverable. Consider whether Phase 3 should re-derive these or trust the register and extend.

## Exit conditions hit

- ✅ ≥10 duplicate pairs registered with SoT + cost
- ✅ File:line citations
- ✅ Cross-reference table at row level (existing D-/WO-/PM-/HD-/DM- IDs)
- ✅ Refuted-candidates subsection at bottom of register
- ✅ Two corrections to prior briefs (HARDEN_BRIEF D-10, D-89 narrative) surfaced during verification

**Stop here.** Awaiting validation gate before tracker append + Phase 3.
