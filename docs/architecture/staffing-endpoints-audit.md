# Staffing endpoint audit — legacy vs canonical (HD-1 Step A)

**Date:** 2026-05-03
**Owner:** Phase HD (HD-1 = Phase WO-6 cutover)
**Inputs:** `src/modules/assignments/presentation/assignments.controller.ts`, `frontend/src/lib/api/assignments.ts`, `frontend/src/features/**`, `docs/planning/canonical-staffing-workflow.md`

---

## TL;DR

The backend exposes **5 legacy endpoints** that predate the canonical 9-status state machine (Phase CSW). Each has a canonical replacement. The frontend calls 3 of the 5 from 2 call-site clusters; migration is straightforward (drop-in rename + `body.reason` shape change).

| Tier | Count |
|---|---|
| Legacy controller endpoints | **5** |
| FE call sites of legacy endpoints | **2 clusters / 5 invocations** |
| Canonical controller endpoints | **10** (8 transitions + director-approve + onboarding-with-date) |
| Pure CRUD/utility (not legacy, not canonical) | **6** |

---

## 1. Endpoint inventory

### 1a. LEGACY (deprecate → canonical) — 5 endpoints

Each routes to a bespoke service. They predate `TransitionProjectAssignmentService` + the `ASSIGNMENT_STATUS_TRANSITIONS` matrix. State-machine semantics are bypassed: legacy `/approve` jumps from `PROPOSED` straight to a vague "approved" without going through `BOOKED`/`ASSIGNED`; `/end` skips `COMPLETED`; `/revoke` skips `CANCELLED`.

| Legacy endpoint | Service | Replaced by | Migration shape |
|---|---|---|---|
| `POST /assignments/:id/approve` | `ApproveProjectAssignmentService` | `POST /assignments/:id/book` (canonical PROPOSED→BOOKED, PM/DM/Director/Admin) | body: `{comment?}` → `{reason?, caseId?}` |
| `POST /assignments/:id/reject` | `RejectProjectAssignmentService` | `POST /assignments/:id/cancel` with reason (any non-terminal → CANCELLED) | body: `{reason?, comment?}` → `{reason?, caseId?}` |
| `POST /assignments/:id/end` | `EndProjectAssignmentService` | `POST /assignments/:id/complete` (ASSIGNED→COMPLETED) | body: `{endDate?, reason?}` → `{reason?, caseId?}` *(see note)* |
| `POST /assignments/:id/revoke` | `RevokeProjectAssignmentService` | `POST /assignments/:id/cancel` | body: `{reason?}` → `{reason?, caseId?}` |
| `POST /assignments/activate` (bulk) | `ActivateApprovedAssignmentsService` | **Keep**: a system-/cron-bulk utility, not a per-id state-machine transition. Rename to `POST /assignments/activate-approved` and document as a sweep. | unchanged |

**Note on `/end` → `/complete`:** the legacy service accepts an explicit `endDate` for back-dating. The canonical `/complete` uses "now" as default. If back-dated completion is a real use case, keep an `endDate` query/body param on `/complete` (additive); otherwise drop. Today's call sites all pass "now" — likely safe to drop.

### 1b. CANONICAL (keep) — 10 endpoints

Route through `TransitionProjectAssignmentService.execute(...)` consulting `ASSIGNMENT_STATUS_TRANSITIONS`. Idempotent re-application of the same target is a no-op; invalid transitions raise a typed error.

| Endpoint | Target status | Roles |
|---|---|---|
| `POST /assignments/:id/submit` | `CREATED` (DRAFT→CREATED) | PM, DM, RM, Director, Admin |
| `POST /assignments/:id/propose` | `PROPOSED` | RM, DM, Admin |
| `POST /assignments/:id/book` | `BOOKED` | PM, DM, Director, Admin |
| `POST /assignments/:id/onboarding` | `ONBOARDING` (+ optional `onboardingDate` body → routes to `ScheduleOnboardingService`) | PM, DM, Director, Admin |
| `POST /assignments/:id/assign` | `ASSIGNED` | PM, DM, Director, Admin |
| `POST /assignments/:id/hold` | `ON_HOLD` (reason required) | PM, RM, HR, Director, Admin |
| `POST /assignments/:id/release` | `ASSIGNED` (from ON_HOLD) | PM, RM, HR, Director, Admin |
| `POST /assignments/:id/complete` | `COMPLETED` | PM, DM, Director, Admin |
| `POST /assignments/:id/cancel` | `CANCELLED` (reason required) | PM, DM, RM, Director, Admin |
| `POST /assignments/:id/director-approve` | sequence-2 approval (clears `requiresDirectorApproval`) | Director, Admin |

### 1c. CRUD/utility (keep, not part of state-machine) — 6 endpoints

| Endpoint | Purpose |
|---|---|
| `GET /assignments` | List + filter |
| `GET /assignments/:id` | Detail |
| `POST /assignments` | Create new (first slot in DRAFT/CREATED) |
| `POST /assignments/override` | Governed allocation override (creates with `allowOverlapOverride=true`) |
| `POST /assignments/bulk` | Bulk-create with partial-success envelope |
| `PATCH /assignments/:id` | Amend mutable fields (allocation, role, notes, validTo). **Not a status change.** |

---

## 2. Frontend call sites

### 2a. Legacy methods exported by `frontend/src/lib/api/assignments.ts`

```
approveAssignment(id, {comment?, reason?})   → POST /assignments/:id/approve
rejectAssignment(id, {reason?, comment?})    → POST /assignments/:id/reject
endAssignment(id, {endDate?, reason?})       → POST /assignments/:id/end
revokeAssignment(id, {reason?})              → POST /assignments/:id/revoke
```

### 2b. Live call sites (production code, `*.test.*` excluded)

| Caller | Imports | Migration needed |
|---|---|---|
| `frontend/src/features/assignments/useAssignmentDetails.ts:13-18,96,99,125,200` | `approveAssignment, rejectAssignment, endAssignment, revokeAssignment` | Replace with `bookAssignment` (approve) / `cancelAssignment` (reject + revoke) / `completeAssignment` (end). |
| `frontend/src/features/staffing-desk/useStaffingDeskActions.ts:4,33-44` | `approveAssignment, rejectAssignment, endAssignment` | Same mapping. Keep the `wrap('Assignment approved', …)` toast strings; semantic is unchanged. |

That's it. **Two files, ~10 lines of change.**

### 2c. Already-canonical FE methods (in use, no work needed)

`bookAssignment`, `completeAssignment`, `cancelAssignment`, `proposeAssignment`, `holdAssignment`, `releaseAssignment`, `markAssignmentAssigned`, `moveAssignmentToOnboarding`, `directorApproveAssignment`, `scheduleOnboarding`, `transitionAssignment` (generic) — all defined and consumed where appropriate.

### 2d. PATCH amend (correct as-is)

`amendAssignment(id, AmendAssignmentRequest)` → `PATCH /assignments/:id`. Not in scope for cutover; this is a CRUD endpoint, not a state transition.

---

## 3. Cutover plan (HD-1 Steps B → E)

The brief's WO-6 ladder, refined to the verified surface area above:

### Step B — soft deprecation (LANDS IN ONE PR)

For each of the 5 legacy endpoints:

1. Add NestJS response headers via a small `@DeprecatedEndpoint(sunsetIso: '2026-08-01')` decorator that injects:
   - `Deprecation: true`
   - `Sunset: Thu, 01 Aug 2026 00:00:00 GMT`
   - `Link: </api/v1/assignments/:id/{replacement}>; rel="successor-version"`
2. Add a `Logger.warn` with `legacyEndpoint` label + correlation-id on every call.
3. Add a Prom counter `assignment_legacy_endpoint_call_total{route}` (gauges adoption progress, target = 0 by Step E).
4. Internally route the legacy handler through the canonical service (so the deprecation does not change behavior — it just emits the warning).
   - `/approve` → `transitionProjectAssignmentService.execute({target: 'BOOKED', ...})`
   - `/reject` → `transitionProjectAssignmentService.execute({target: 'CANCELLED', reason: ...})`
   - `/end` → `transitionProjectAssignmentService.execute({target: 'COMPLETED', ...})`
   - `/revoke` → `transitionProjectAssignmentService.execute({target: 'CANCELLED', ...})`
   - `POST /assignments/activate` stays as-is (re-classified as utility per §1a note).
5. Update Swagger description with `@deprecated`.

### Step C — frontend migration (SAME PR or one follow-up)

Update the 2 call sites:

```ts
// useAssignmentDetails.ts
- await approveAssignment(id, { reason: '...' });
+ await bookAssignment(id, { reason: '...' });
- await rejectAssignment(id, { reason });
+ await cancelAssignment(id, { reason });
- await endAssignment(id, { reason, endDate });
+ await completeAssignment(id, { reason });

// useStaffingDeskActions.ts — same replacements
```

Then mark `approveAssignment` / `rejectAssignment` / `endAssignment` / `revokeAssignment` as `@deprecated` in `lib/api/assignments.ts` — leave for one release in case any out-of-tree consumer still calls them.

### Step D — soak (7+ days on stage)

Watch the metric. Acceptance = `assignment_legacy_endpoint_call_total` is 0 across the soak window (no internal callers). External / API consumers, if any, get the deprecation warning headers; if logs show external calls, extend the sunset date.

### Step E — sunset (separate PR)

1. Delete the 4 deprecated controller methods + their bespoke services (`ApproveProjectAssignmentService`, `RejectProjectAssignmentService`, `EndProjectAssignmentService`, `RevokeProjectAssignmentService`) + their DTOs.
2. Delete the 4 FE legacy exports.
3. Add `scripts/check-no-legacy-staffing-api.cjs` ratchet (`grep -rE "approveAssignment\\(|rejectAssignment\\(|endAssignment\\(|revokeAssignment\\(" frontend/src` → must return 0 hits).
4. Tracker: `[x] Phase WO-6` / `[x] HD-1`.

---

## 4. Acceptance for HD-1 Step A (this audit)

- [x] Every controller method classified.
- [x] Every legacy method has a named canonical replacement.
- [x] FE call sites enumerated (2 clusters, 5 invocations across 2 files).
- [x] Cutover plan steps B-E specified at the file/line level.
- [x] No deprecation work shipped yet (per HD-1 plan, Step B is the next implementation task).

The next action when HD-1 resumes is to land Step B (the deprecation decorator + interceptor) + Step C (FE migration of the 2 call sites) in one PR.
