# Lean Enum Mapping — LEAN-P0-2

V2 Master Plan Phase 0 / LEAN-P0-2. Canonical mapping document for the three
legacy → lean enum transitions used by the Sprint-2 backfill and the
ProjectPositionMirrorService dual-write window. The executable form is
`src/shared/lean-migration/enum-mappings.ts`; this document is the
human-readable contract that helper must honour.

Companion document: `docs/planning/lean-data-shape-audit.md`
(LEAN-P0-1) — the column-by-column reconciliation that this enum map is
extracted from.

The helper deliberately tightens behaviour compared to the legacy free-text
mapper `mapLegacyAssignmentStatus()` in
`src/modules/project-positions/domain/value-objects/position-fill-status.ts`:
that mapper accepts pre-CSW string values (`REQUESTED`, `APPROVED`,
`ACTIVE`, `ENDED`, `REVOKED`, `ARCHIVED`) that no longer exist in the
Prisma enum and falls back to `DRAFT` for unknowns. The lean helper accepts
only the current Prisma enum and throws on unknowns — appropriate for
production code paths where an unknown value is a bug. The legacy mapper
continues to live alongside, used only by the S2-5 backfill script for old
backups that may still contain pre-CSW values.

## 1. AssignmentStatus → ProjectPositionFillStatus

**Source:** `enum AssignmentStatus` in `prisma/schema.prisma` (11 values).
**Target:** `enum ProjectPositionFillStatus` in `prisma/schema.prisma` (8 values).

### Source value semantics

| Source | Meaning |
|---|---|
| `DRAFT` | Position scaffold; not yet open for candidates. |
| `CREATED` | Open for candidates (legacy naming). |
| `PROPOSED` | One or more candidates proposed; awaiting decision. |
| `IN_REVIEW` | Proposal under explicit review (e.g. director approval gate). |
| `REJECTED` | Position killed before fill; reason captured. |
| `BOOKED` | Candidate accepted; not yet onboarded. |
| `ONBOARDING` | Onboarding window — paperwork, induction. |
| `ASSIGNED` | Active engagement on the project. |
| `ON_HOLD` | Active person paused (leave, dispute, illness). |
| `COMPLETED` | Natural end of engagement; reason captured. |
| `CANCELLED` | Terminated mid-engagement; reason captured. |

### Target value semantics

| Target | Meaning |
|---|---|
| `DRAFT` | Position scaffold; not yet open. |
| `OPEN` | Open for candidates. |
| `PROPOSED` | One or more candidates proposed; awaiting decision. |
| `BOOKED` | Candidate accepted; not yet onboarded. |
| `ONBOARDING` | Onboarding window. |
| `ASSIGNED` | Active engagement. |
| `ON_HOLD` | Active person paused. |
| `RELEASED` | Terminal — covers natural completion, rejection, and cancellation. Disambiguation lives in `releaseReason` / `rejectionReason` / `cancellationReason`. |

### Mapping table

| Legacy `AssignmentStatus` | Lean `ProjectPositionFillStatus` | Kind | Notes |
|---|---|---|---|
| `DRAFT` | `DRAFT` | 1:1 | |
| `CREATED` | `OPEN` | renamed | Legacy "created" = open for candidates. |
| `PROPOSED` | `PROPOSED` | 1:1 | |
| `IN_REVIEW` | `PROPOSED` | lossy | Review collapses into PROPOSED; the gate becomes an attribute (e.g. `requiresDirectorApproval`) rather than a state. |
| `REJECTED` | `RELEASED` | lossy | Reason preserved in `rejectionReason`. |
| `BOOKED` | `BOOKED` | 1:1 | |
| `ONBOARDING` | `ONBOARDING` | 1:1 | |
| `ASSIGNED` | `ASSIGNED` | 1:1 | |
| `ON_HOLD` | `ON_HOLD` | 1:1 | |
| `COMPLETED` | `RELEASED` | lossy | Reason preserved in `releaseReason`. |
| `CANCELLED` | `RELEASED` | lossy | Reason preserved in `cancellationReason`. |

### Lossy collapses called out

The 11-state legacy lifecycle folds into 8 lean states. The three lossy
collapses are:

1. **IN_REVIEW → PROPOSED.** The "review" sub-state is encoded as a
   property of the proposed state, not a separate state. Approval gating
   moves to `requiresDirectorApproval` + the SLA timer fields.
2. **REJECTED → RELEASED.** Reason text moves to `rejectionReason`. The
   readiness check `status_mapping_consistency` (LEAN-P0-1 §5.3)
   tolerates this collapse — it compares
   `fillStatus === mapAssignmentStatusToFillStatus(legacyStatus)`.
3. **COMPLETED + CANCELLED → RELEASED.** Both terminal states share the
   `RELEASED` lean value. `cancellationReason` distinguishes cancellation;
   absence of either reason field implies natural completion. ASSIGNED →
   COMPLETED and ASSIGNED → CANCELLED both surface as ASSIGNED → RELEASED
   on the lean side.

### Edge cases

- **NULL handling.** The `AssignmentStatus` column is `NOT NULL` on
  `ProjectAssignment`; the helper does not accept `null` /
  `undefined`. Backfill that encounters an absent value should treat the
  row as suspect and skip (not silently default).
- **Pre-CSW values.** `REQUESTED`, `APPROVED`, `ACTIVE`, `ENDED`,
  `REVOKED`, `ARCHIVED` were removed from the Prisma enum during CSW. The
  Sprint-2 backfill encounters them only in old backups and uses the
  permissive `mapLegacyAssignmentStatus()` (not this helper). Production
  code paths use the strict helper and throw on these values.
- **In-flight rows.** During the dual-write window the legacy
  `ProjectAssignment.status` and the lean `ProjectPosition.fillStatus`
  must satisfy `fillStatus === mapAssignmentStatusToFillStatus(legacyStatus)`
  at all times. The mirror service writes both sides in the same
  transaction.

## 2. StaffingRequestStatus → ProjectPositionFillStatus

**Source:** `enum StaffingRequestStatus` in `prisma/schema.prisma` (5 values).
**Target:** `enum ProjectPositionFillStatus` (subset).

### Source value semantics

| Source | Meaning |
|---|---|
| `DRAFT` | Request scaffold; not yet broadcast. |
| `OPEN` | Broadcast to RMs; soliciting candidates. |
| `IN_REVIEW` | At least one candidate proposed; awaiting PM decision. |
| `FULFILLED` | All requested headcount filled. |
| `CANCELLED` | Request killed; positions released. |

### Mapping table

| Legacy `StaffingRequestStatus` | Lean `ProjectPositionFillStatus` (representative) | Kind | Notes |
|---|---|---|---|
| `DRAFT` | `DRAFT` | 1:1 | Spawned positions start as DRAFT. |
| `OPEN` | `OPEN` | 1:1 | Spawned positions start as OPEN. |
| `IN_REVIEW` | `PROPOSED` | lossy | Same collapse as `AssignmentStatus.IN_REVIEW`. |
| `FULFILLED` | `ASSIGNED` | lossy | Representative active state. The lean truth is in the set of sibling positions — some siblings may be BOOKED, ONBOARDING, ON_HOLD, or even RELEASED while the SR is FULFILLED. |
| `CANCELLED` | `RELEASED` | lossy | Every sibling position becomes RELEASED. |

### Lossy collapses called out

Per LEAN-P0-1, `StaffingRequest.status` has **no direct column on the lean
model** — it is synthesized from the set of sibling positions sharing a
`legacyStaffingRequestId`. This helper returns the *representative* lean
state that a single position spawned from a request in that status should
start with. Callers that need the SR-level status (read path) must query
the sibling positions and apply the synthesis rules from
LEAN-P0-1 §"StaffingRequestStatus → derived position state":

| Legacy SR status | Synthesis predicate |
|---|---|
| `DRAFT` | every sibling has `fillStatus = DRAFT` |
| `OPEN` | at least one sibling in `{OPEN, PROPOSED}` and none in `{BOOKED, ONBOARDING, ASSIGNED, ON_HOLD}` |
| `IN_REVIEW` | at least one sibling in `PROPOSED` |
| `FULFILLED` | every sibling in `{BOOKED, ONBOARDING, ASSIGNED, ON_HOLD, RELEASED}` AND active count = `headcountRequired` |
| `CANCELLED` | every sibling in `RELEASED` |

`FULFILLED → ASSIGNED` is the lossiest case: the lean model has no single
state that captures "all headcount filled, any active sub-state". The
backfill writes whatever per-position state the source row already had
(usually `ASSIGNED`); this helper exists for the rarer code path of
spawning a representative single position from an SR-level state without a
sibling context.

### Edge cases

- **NULL handling.** The `status` column on `StaffingRequest` is `NOT
  NULL`; the helper does not accept `null` / `undefined`.
- **No pre-CSW values.** Unlike `AssignmentStatus`, the
  `StaffingRequestStatus` enum has been stable since the CSW work — there
  are no deprecated values to handle.
- **In-flight rows.** During the dual-write window, the SR's `status` and
  the synthesised position state are kept consistent by the mirror
  service.

## 3. StaffingRequestProposalCandidateDecision → ProjectPositionCandidateDecision

**Source:** `enum StaffingRequestProposalCandidateDecision` in `prisma/schema.prisma` (4 values).
**Target:** `enum ProjectPositionCandidateDecision` (4 values, same set).

### Source value semantics

| Source | Meaning |
|---|---|
| `PENDING` | Candidate proposed; awaiting decision. |
| `PICKED` | PM picked this candidate for the position. |
| `DECLINED` | PM explicitly declined this candidate. |
| `AUTO_DECLINED` | Auto-declined when a sibling candidate was PICKED. |

### Mapping table

| Legacy decision | Lean decision | Kind | Notes |
|---|---|---|---|
| `PENDING` | `PENDING` | 1:1 | |
| `PICKED` | `PICKED` | 1:1 | |
| `DECLINED` | `DECLINED` | 1:1 | |
| `AUTO_DECLINED` | `AUTO_DECLINED` | 1:1 | |

### Lossy collapses called out

None. The enums are intentionally identical — the helper exists for type
safety (the two enums have distinct nominal types in TypeScript even
though their value sets coincide) and to provide a single canonical
conversion site for the backfill.

### Edge cases

- **NULL handling.** The `decision` column on
  `StaffingRequestProposalCandidate` is `NOT NULL` with a default of
  `PENDING`; the helper does not accept `null` / `undefined`.
- **In-flight rows.** A candidate's `decision` and its lean counterpart on
  `ProjectPositionCandidate` are kept in sync by the mirror service. The
  readiness check `candidate_backfill_completeness` (LEAN-P0-1 §5.4)
  reconciles by `(positionId, candidatePersonId)`.

## Helper signature reference

The executable form of this contract lives in
`src/shared/lean-migration/enum-mappings.ts`:

```ts
import {
  AssignmentStatus,
  ProjectPositionCandidateDecision,
  ProjectPositionFillStatus,
  StaffingRequestProposalCandidateDecision,
  StaffingRequestStatus,
} from '@prisma/client';

export class UnknownLegacyEnumValueError extends Error { /* ... */ }

export function mapAssignmentStatusToFillStatus(
  status: AssignmentStatus,
): ProjectPositionFillStatus;

export function mapStaffingRequestStatusToFillStatus(
  status: StaffingRequestStatus,
): ProjectPositionFillStatus;

export function mapCandidateDecisionLegacyToLean(
  decision: StaffingRequestProposalCandidateDecision,
): ProjectPositionCandidateDecision;
```

Each function uses an exhaustive `switch` with a `never` default; adding a
value to one of the source Prisma enums will fail the TypeScript build
until this module is updated.

## What this document does not do

- Does not modify `prisma/schema.prisma`. Enum shapes are inputs.
- Does not touch `ProjectPositionMirrorService`. The mirror remains the
  subject of LEAN-P0-4.
- Does not produce a backfill script. The Sprint-2 backfill (S2-5) is the
  source of truth for backfill behaviour.
- Does not replace `mapLegacyAssignmentStatus()` in
  `position-fill-status.ts`. That permissive mapper still serves the
  backfill of pre-CSW backups; the strict helper here serves production
  code paths.
