# DeliveryCentral V2 — Remediation Plan

_Derived from `fix-list.md` (2026-06-13 QA + 9-round validation). Principle: **fix the mechanism, not each instance** — most P2s are systemic classes with one root cause. Sequenced by severity + dependency. Do the work on a fresh branch off `origin/main`; each phase ends green (build + the named tests)._

## Fix-order rationale
- **Phase 0** ships the cutover-blockers — 3 surgical, low-risk edits.
- **Phase 1** is the keystone: making every `@Body()` a class-validator DTO simultaneously fixes SC-2 (no-op + unvalidated) **and** enables SC-1 (whitelist then strips body `actorId`). Do it before/with Phase-1 actor sourcing.
- Phases 2–7 are independent and can parallelize across people once Phase 1 lands.

---

## Phase 0 — Cutover blockers (do first; ~½ day, low risk)
Three surgical fixes; each is one-to-a-few lines with an exact repro in `fix-list.md`.

| # | Finding | Fix | File |
|---|---------|-----|------|
| 0.1 | **P1-1** `project-positions` 400 on any `take`/`skip` → `/me` + paginated callers dead | add `@Type(() => Number)` above `@IsInt()` on `take` & `skip` | `src/modules/project-positions/application/contracts/project-position-requests.ts:223-234` |
| 0.2 | **SC-2 / data-loss** `PATCH /api/projects/:id` silently discards edits | add class-validator decorators to `UpdateProjectRequestDto` (so `whitelist` keeps the fields) | `src/modules/project-registry/presentation/projects.controller.ts:60-66` |
| 0.3 | **P1-2** person detail dead via publicId (profile/skills/360/suggested 400) | swap `ParseUUIDPipe` → `ParsePublicIdOrUuid(AggregateType.Person)` on the 4 person sub-resource params + resolve publicId→uuid in service | `person-profile.controller.ts:29`, `project-positions.controller.ts:367`, `skills.controller.ts:81,92`, `people-360.controller.ts:40` |

**Verify:** add HTTP-level tests for `GET /project-positions?take=…` (200), `PATCH /projects/:id` (field actually persists), `GET /people/<publicId>/profile` (200). Re-run the live repros from `fix-list.md` (all currently 400) → expect 200.

---

## Phase 1 — Backend input-validation + actor hygiene (keystone; ~2–3 days)
Covers **SC-2** (undecorated `@Body`), **SC-1** (actor-spoofing, 5 eps), and the **query-param→500 class** (F-1a-1).

1. **Convert every `@Body()` to a class-validator DTO class** (interfaces → classes; undecorated classes → decorated). Known sites: `planner/apply`, `planner/scenarios`, `team-builder`, `UpdateProjectRequestDto`, `reporting-lines` terminate, `resource-pools` create/update/add-member. This kills the no-op (decorated fields survive `whitelist`) and the pass-through (validation rejects garbage + strips body `actorId`).
2. **Source the actor from `req.principal`** on the 5 spoofable endpoints (ignore any body actor): `planner/apply`, `planner/scenarios`, `org/people/:id/terminate`, `cases/:id/comments`, `projects/:id/assign-team`.
3. **Query-param→500 class:** wire `MonthQueryDto`/validation on the raw `@Query()` params (`my-time/month|gaps`, `time-management/compliance|team-calendar`, `staffing-desk/project-timeline`, `assignments/skill-match`); make `parseMonthQuery` throw `BadRequestException`. (Or globally set `ValidationPipe transformOptions.enableImplicitConversion: true` — broader; gate behind a regression run.)

**Verify:** unit tests asserting (a) malformed/missing query params → 400 not 500; (b) a write endpoint persists `createdByPersonId` from the token, not the body, even when a forged `actorId` is sent. Re-run the `actorsweep-*` checks.

---

## Phase 2 — Data-consistency / Law-9 (SC-3 + SC-3-backend + F-DC-*; ~2–3 days)
Both halves must land or drilldowns still lie.

1. **Backend filtering** — implement + contract-test server-side filtering on the high-traffic list endpoints that currently ignore params: `GET /api/projects` (status, rag), `org/people` (lifecycleStatus, departmentId), `project-positions` (fillStatus), `cases` (status). (`exceptions`/`approvals` already honor theirs — use as reference.)
2. **Frontend KPI drilldowns** — align each KPI link to the destination page's filter schema: add missing keys (`rag` on ProjectsPage, an idle/bench filter, manager-scope), **normalize case** in `ProjectsPage.tsx:186` status compare (the `'ACTIVE'!=='active'` bug), fix param **name** (`status`→`lifecycleStatus` for the directory), reconcile **units** (open-positions counts positions vs projects).
3. **Regression test:** for each dashboard KPI, assert `KPI value === drilldown list count`.

Covers F-DC-2/3/4/5/6/7/8 + the RM idle/managed drilldowns.

---

## Phase 3 — RBAC route↔endpoint alignment (F-1b-C/D/E; ~1 day)
Make route/nav visibility match each endpoint's `@RequireRoles`, and catch the uncaught promise so a 403 never bubbles to console.
- **F-1b-E (P2):** `/cases` is `ALL_ROLES` nav but `GET /api/cases` is `HR_GOVERNANCE_ROLES` → restrict the route's `allowedRoles` (hide "HR Queue" from PM/RM/employee) **or** relax the endpoint.
- **F-1b-C/D (P3):** gate the `/people` side-fetches (`resource-pools`, `people/bench`) and `/projects` health-badge call behind `hasAnyRole(...)`; wrap their promises in `.catch`.

**Verify:** the round-4 cross-role render sweep (PM/HR/employee) → no 403s, no uncaught errors.

---

## Phase 4 — i18n date display (SC-4; ~1–2 days)
- Route the **~21 unguarded** `toLocaleDateString` date-render sites through the existing-but-dead `useLocale()`/`formatDate` (or a shared `<DateText>` atom), or format date-only `'YYYY-MM-DD'` strings without the JS Date constructor.
- **Standardize backend `@db.Date` serialization** to a single `'YYYY-MM-DD'` convention (`person-profile.service.ts:127` vs `resource-manager-dashboard-query.service.ts:122` disagree).
- **Verify:** an Americas-timezone (e.g. `America/New_York`) render test asserting no off-by-one.

---

## Phase 5 — Frontend correctness + export (SC-5, SC-6 + round-9; ~1–2 days)
- **SC-6 / F-CMDK-1:** add `Positions` + `Cases` to the CommandPalette render whitelist (`CommandPalette.tsx:318`) (or derive it from groups present); add a test.
- **F-LOADING-1:** make WorkloadMatrix `onRetry` bump a reload token (actually refetch) + add an `active`-flag cancel guard (`WorkloadMatrixPage.tsx:117-133,307`).
- **F-STALE-1:** refetch / dispatch `ORG_DATA_CHANGED_EVENT` after reporting-line create/terminate (`EmployeeDetailsPage.tsx`).
- **F-ALLOC-1 (P3):** allow >100% in `WeeklyAllocationArea.tsx:53` + compute over-allocation text from the uncapped value (`UtilisationPeek.tsx:80,98`).
- **SC-5 / F-EXPORT-PLACEHOLDER:** disable the Report Builder export + fix the "Export for real data" copy (keep `reportsBuilder` OFF) until the data-query endpoint exists.
- **F-CSV-INJECTION (P3 sec):** prefix-guard `=`/`+`/`-`/`@`/tab lead chars in `ExportButton.escapeCsv` (OWASP).

---

## Phase 6 — P3 cleanup (~1 day)
- `overtime.controller.ts:57` add `ParseUUIDPipe` (and consider removing the FE-dead `fetchResolvedPolicy`).
- `setup/token/issue` gate on `setup.completedAt` (hardening, not a vuln).
- `platform-settings.controller.ts:63` source actor from `req.principal` (not `req.user`, which is never set) → fixes null audit actor.
- Audit-attribution gaps: thread `req.principal` into help-admin update/createTip + bulk-import confirm.
- **Dead-flag sweep:** wire or delete the 46/90 declared-but-ungated flags (keep the 3 half-built-hider flags OFF). See `feature-toggles.md`.

---

## Phase 7 — Design conformance (separate track, with design)
15 DS canvases are PARTIAL (`ds-fe-gap.md`). Mostly polish; **triage each "missing section" with design first** — several are intentional UX deviations the audit flagged as such (e.g. approvals "Escalate" omitted by design). Not a blocker for the cutover.

---

## Suggested ownership / parallelism
- **Backend:** Phases 0.1–0.3, 1, 2-backend, 3-endpoint, 6 (one owner — shared DTO/guard patterns).
- **Frontend:** Phases 2-FE, 4, 5, 3-FE (one owner).
- **Design:** Phase 7.
Phase 0 blocks the cutover; Phases 1–2 are the bulk of the value; 3–6 are cleanup; 7 is parallel polish.

---

## Phase 8 — Representation cleanup: UUIDs → publicIds + human captions (cross-cutting epic)
Two distinct tracks (do NOT entangle with Phase 0–1):

**Track A — no raw UUIDs on the wire/URL (security, finishes DM-2.5 + F-1b-B/F-SYS-1).** Only persons have publicIds today (~18 refs / 104 models); projects/cases/positions-list/resource-pools expose raw UUIDs and ~25 FE deep-links use `.id`. Add `publicId` (or slug) + backfill to every browser-reachable aggregate, accept it on every `:id` route via `ParsePublicIdOrUuid`, migrate the ~25 FE links. **Decision gate:** opaque publicId vs human slug vs both.

**Track B — no raw ids shown to humans (UX captions, `F-CAPTION-1`/SC-7).** 53 `*PersonId` DTO fields vs 4 `*PersonName`; history/audit/timeline/forensics views render UUIDs (e.g. position Fill history). Convention: backend emits a sibling `*PersonName` for every display-facing id; FE renders via a shared `<PersonName>`/`<EntityCaption>` resolver. First slice: `PositionForensics` → add `previousPersonName`/`newPersonName`/`changedByPersonName` (fixes the observed Fill-history screen).
