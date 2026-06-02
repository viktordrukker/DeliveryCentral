# Lean Data-Shape Audit — LEAN-P0-1

V2 Master Plan Phase 0 / LEAN-P0-1. Column-by-column reconciliation between
the 7 legacy staffing models and the 3 lean replacements
(`ProjectPosition`, `ProjectPositionCandidate`, `ProjectPositionFillHistory`).

Authoritative source: `prisma/schema.prisma` (no invented fields).

Status legend per column:

- **identical** — same name, same type, same semantic
- **renamed** — same semantic, different field name (1:1 map)
- **lossy** — type/range/cardinality narrowed (note in cell)
- **synthesized-on-read** — not stored on the lean model; computed from
  `ProjectPosition` rows at query time
- **missing** — no lean equivalent (intentional drop or deferred; note inline)
- **provenance** — backfill-only column on the lean side
  (`legacyAssignmentId`, `legacyStaffingRequestId`); not a semantic mapping

The status enum mapping below is the contract that the readiness check
relies on. It mirrors `mapLegacyAssignmentStatus()` in
`src/modules/project-positions/domain/value-objects/position-fill-status.ts`.

## AssignmentStatus → ProjectPositionFillStatus mapping

| Legacy `ProjectAssignment.status` | Lean `ProjectPosition.fillStatus` | Notes |
|---|---|---|
| DRAFT | DRAFT | identical |
| CREATED | OPEN | "created" = open for candidates in the lean lifecycle |
| PROPOSED | PROPOSED | identical |
| IN_REVIEW | PROPOSED | review collapsed into PROPOSED |
| REJECTED | RELEASED | reason text preserved in `rejectionReason` |
| BOOKED | BOOKED | identical |
| ONBOARDING | ONBOARDING | identical |
| ASSIGNED | ASSIGNED | identical |
| ON_HOLD | ON_HOLD | identical |
| COMPLETED | RELEASED | reason text preserved in `cancellationReason` / `releaseReason` |
| CANCELLED | RELEASED | reason text preserved in `cancellationReason` |

Pre-CSW legacy values (`REQUESTED`, `APPROVED`, `ACTIVE`, `ENDED`, `REVOKED`,
`ARCHIVED`) map per `mapLegacyAssignmentStatus()`. They are not expected in
fresh data — only in old backups.

## StaffingRequestStatus → derived position state

`StaffingRequest.status` is not directly mapped to a column on
`ProjectPosition`. Instead, the legacy semantics are synthesized on-read
from the set of `ProjectPosition` rows with the same
`legacyStaffingRequestId`:

| Legacy `StaffingRequest.status` | Lean synthesis |
|---|---|
| DRAFT | every mirrored position has `fillStatus IN (DRAFT)` |
| OPEN | at least one mirrored position has `fillStatus IN (OPEN, PROPOSED)` and none `IN (BOOKED, ONBOARDING, ASSIGNED, ON_HOLD)` |
| IN_REVIEW | at least one mirrored position has `fillStatus = PROPOSED` |
| FULFILLED | every mirrored position has `fillStatus IN (BOOKED, ONBOARDING, ASSIGNED, ON_HOLD, RELEASED)` AND total active count = `headcountRequired` |
| CANCELLED | every mirrored position has `fillStatus = RELEASED` |

`StaffingRequest.headcountRequired` survives in the **count of
ProjectPosition rows** sharing a `legacyStaffingRequestId` — one lean
position per requested headcount unit. `headcountFulfilled` becomes
`count(*) FILTER (WHERE fillStatus IN ('BOOKED','ONBOARDING','ASSIGNED','ON_HOLD'))`.

## Model 1 — ProjectAssignment → ProjectPosition

| Source field | Source type | Target field | Target type | Equivalence | Notes |
|---|---|---|---|---|---|
| id | uuid PK | legacyAssignmentId | uuid (nullable) | provenance | Lean PK is `ProjectPosition.id`; the legacy id is preserved here for backfill verification only. |
| personId | uuid | activePersonId | uuid (nullable) | renamed | Only populated when `fillStatus` is active (BOOKED/ONBOARDING/ASSIGNED/ON_HOLD). Cleared on RELEASED. |
| projectId | text | projectId | uuid | identical | Same column name; type tightened to UUID on the lean side (DM-2 contract). |
| workstreamId | uuid (nullable) | workstreamId | uuid (nullable) | identical | |
| staffingRequestId | text (nullable) | legacyStaffingRequestId | uuid (nullable) | provenance | Lean does not preserve a runtime parent pointer — instead, sibling positions are grouped via shared `legacyStaffingRequestId` during the dual-write window. |
| requestedByPersonId | uuid (nullable) | requestedByPersonId | uuid (nullable) | identical | |
| assignmentCode | text (nullable) unique | — | — | missing | Lean uses `publicId` (`pos_*`) instead. Existing codes are not migrated; new ones are not generated. |
| staffingRole | text | role | text | renamed | Same semantic, renamed to match lean naming. |
| status | AssignmentStatus | fillStatus | ProjectPositionFillStatus | lossy | 11 → 8 states per the mapping table above. REJECTED / COMPLETED / CANCELLED all fold into RELEASED with reason text preserved. |
| allocationPercent | decimal(5,2) nullable | activeAllocationPercent | decimal(5,2) nullable | renamed | Set only when fill is active; otherwise NULL. |
| requestedAt | timestamptz | — | — | synthesized-on-read | Derive from `createdAt` of the earliest sibling position with the same `legacyStaffingRequestId`, falling back to position's own `createdAt`. |
| approvedAt | timestamptz nullable | — | — | synthesized-on-read | Derive from `ProjectPositionFillHistory.occurredAt` of the row where `newStatus = BOOKED`. |
| validFrom | timestamptz | activeValidFrom | timestamptz nullable | renamed | NULL when not active; otherwise mirrors. |
| validTo | timestamptz nullable | activeValidTo | timestamptz nullable | renamed | |
| onboardingDate | timestamptz nullable | onboardingDate | timestamptz nullable | identical | |
| notes | text nullable | notes | text nullable | identical | |
| rejectionReason | text nullable | rejectionReason | text nullable | identical | |
| rejectionReasonCode | text nullable | rejectionReasonCode | text nullable | identical | |
| cancellationReason | text nullable | cancellationReason | text nullable | identical | |
| onHoldReason | text nullable | onHoldReason | text nullable | identical | |
| onHoldCaseId | uuid nullable | onHoldCaseId | uuid nullable | identical | |
| requiresDirectorApproval | bool | requiresDirectorApproval | bool | identical | |
| slaStage | AssignmentSlaStage nullable | slaStage | AssignmentSlaStage nullable | identical | Same enum reused on the lean side. |
| slaDueAt | timestamptz nullable | slaDueAt | timestamptz nullable | identical | |
| slaBreachedAt | timestamptz nullable | slaBreachedAt | timestamptz nullable | identical | |
| slaWarnedAt50pct | timestamptz nullable | slaWarnedAt50pct | timestamptz nullable | identical | |
| slaWarnedAt75pct | timestamptz nullable | slaWarnedAt75pct | timestamptz nullable | identical | |
| appliedRateCardEntryId | uuid nullable | appliedRateCardEntryId | uuid nullable | identical | |
| effectiveBillRate | decimal(10,2) nullable | effectiveBillRate | decimal(10,2) nullable | identical | |
| effectiveBillCurrency | char(3) nullable | effectiveBillCurrency | char(3) nullable | identical | |
| version | int | version | int | identical | Concurrency counter — restarts at 1 on first lean mirror write. |
| createdAt | timestamptz | createdAt | timestamptz | identical | |
| updatedAt | timestamptz | updatedAt | timestamptz | identical | |
| createdByPersonId | uuid nullable | createdByPersonId | uuid nullable | identical | |
| updatedByPersonId | uuid nullable | updatedByPersonId | uuid nullable | identical | |
| archivedAt | timestamptz nullable | archivedAt | timestamptz nullable | identical | |
| tenantId | uuid nullable | tenantId | uuid nullable | identical | |
| — | — | publicId | varchar(32) nullable unique | missing | New on lean side; format `pos_*`. Backfill leaves NULL until first mutation. |
| — | — | role (split from staffingRole) | — | — | (covered above as renamed) |
| — | — | skills | text[] | missing | New on lean side; sourced from parent `StaffingRequest.skills` during backfill when `legacyStaffingRequestId` is set, otherwise `[]`. |
| — | — | summary | text nullable | missing | Sourced from parent `StaffingRequest.summary` during backfill. |
| — | — | requiredAllocationPercent | decimal(5,2) | missing | Demand-side allocation. Backfill: parent `StaffingRequest.allocationPercent` if linked, else `ProjectAssignment.allocationPercent`. |
| — | — | startDate | date | missing | Demand-side window. Backfill: parent `StaffingRequest.startDate` if linked, else `ProjectAssignment.validFrom::date`. |
| — | — | endDate | date | missing | Demand-side window. Backfill: parent `StaffingRequest.endDate` if linked, else `ProjectAssignment.validTo::date` or +365d sentinel. |
| — | — | priority | StaffingRequestPriority | missing | Backfill: parent `StaffingRequest.priority`, fallback MEDIUM. |
| — | — | releaseReason | text nullable | missing | Free-text reason captured on transition to RELEASED. Empty for backfilled rows. |

## Model 2 — AssignmentApproval → (synthesized via ProjectPositionFillHistory)

`AssignmentApproval` has no direct lean replacement model. The approval
ledger is reconstructed from `ProjectPositionFillHistory` rows where
`changeType IN ('PROPOSED','BOOKED','RELEASED')` and from
`ProjectPositionCandidate.decision`.

| Source field | Source type | Target representation | Equivalence | Notes |
|---|---|---|---|---|
| id | uuid PK | — | missing | No lean PK survives. Old approval rows remain readable while the legacy table exists; the lean side does not import them. |
| assignmentId | uuid | (PositionFillHistory.positionId via legacyAssignmentId join) | synthesized-on-read | Resolve the parent position by `legacyAssignmentId`. |
| decidedByPersonId | uuid nullable | PositionFillHistory.changedByPersonId | renamed | |
| sequenceNumber | int | (ordinal of PositionFillHistory rows ordered by occurredAt for that position) | synthesized-on-read | |
| decision | ApprovalDecision | (derived from PositionFillHistory.newStatus + ProjectPositionCandidate.decision) | lossy | The lean model removes the explicit PENDING/REQUESTED enum; "pending" is implicit when no terminal history row exists yet. |
| decisionReason | text nullable | PositionFillHistory.changeReason | renamed | |
| decisionAt | timestamptz nullable | PositionFillHistory.occurredAt | renamed | |
| createdAt | timestamptz | PositionFillHistory.occurredAt | renamed | Single timestamp on the lean side. |
| updatedAt | timestamptz | — | missing | Lean history rows are append-only — no updates. |
| createdByPersonId | uuid nullable | PositionFillHistory.changedByPersonId | renamed | |
| updatedByPersonId | uuid nullable | — | missing | Append-only model — no updater field. |

Reconciliation note: the legacy multi-approver sequence
(`sequenceNumber`) is preserved by ordering history rows by `occurredAt`;
there is no longer a uniqueness constraint that says "first approval, then
second approval" — the lean model assumes one decision per state transition,
and stacked approvers are surfaced via the workflow/case layer.

## Model 3 — AssignmentHistory → ProjectPositionFillHistory

| Source field | Source type | Target field | Target type | Equivalence | Notes |
|---|---|---|---|---|---|
| id | uuid PK | id | uuid PK | identical | New ids on lean side. |
| assignmentId | uuid | positionId | uuid | renamed | Resolved via `ProjectPosition.legacyAssignmentId`. |
| changedByPersonId | uuid nullable | changedByPersonId | uuid nullable | identical | |
| changeType | text | changeType | ProjectPositionFillChangeType | lossy | Legacy was free-text. Lean enum covers the canonical transitions (DRAFTED / OPENED / PROPOSED / BOOKED / ONBOARDED / ASSIGNED / HELD / RELEASED / CANDIDATES_ADDED / CANDIDATE_PICKED / CANDIDATE_DECLINED / RATE_PINNED / ALLOCATION_CHANGED / DATES_CHANGED). Backfill maps best-effort; unknown text → omitted. |
| changeReason | text nullable | changeReason | text nullable | identical | |
| previousSnapshot | jsonb nullable | previousSnapshot | jsonb nullable | identical | |
| newSnapshot | jsonb nullable | newSnapshot | jsonb nullable | identical | |
| occurredAt | timestamptz | occurredAt | timestamptz | identical | |
| — | — | previousPersonId | uuid nullable | missing | New on lean side; populated on candidate-pick and release. |
| — | — | newPersonId | uuid nullable | missing | New on lean side; populated on candidate-pick. |
| — | — | previousStatus | ProjectPositionFillStatus nullable | missing | New on lean side; captures fill-status transitions explicitly. |
| — | — | newStatus | ProjectPositionFillStatus nullable | missing | New on lean side; captures fill-status transitions explicitly. |

## Model 4 — StaffingRequest → (1:N ProjectPosition rows sharing legacyStaffingRequestId)

The legacy 1-row-N-headcount model splits 1:N into one lean position per
headcount unit. Most StaffingRequest columns survive as
**identical-per-position** copies; `headcountRequired` becomes
"`count(*)`" and `headcountFulfilled` becomes a count filter.

| Source field | Source type | Target field | Target type | Equivalence | Notes |
|---|---|---|---|---|---|
| id | text PK | legacyStaffingRequestId | uuid nullable | provenance | Backfill stores the SR id on every position spawned for that request. |
| idNew | uuid generated | — | — | missing | Internal DM-2-era migration column; not carried. |
| publicId | varchar(32) nullable unique | publicId (per position) | varchar(32) nullable unique | identical | One publicId per position; the SR-level publicId is not preserved (SR no longer addressable). |
| projectId | text | projectId | uuid | identical | |
| requestedByPersonId | text | requestedByPersonId | uuid nullable | identical | |
| role | text | role | text | identical | Copied to every spawned position. |
| skills | text[] | skills | text[] | identical | Copied to every spawned position. |
| summary | text nullable | summary | text nullable | identical | Copied to every spawned position. |
| allocationPercent | decimal(5,2) | requiredAllocationPercent | decimal(5,2) | renamed | |
| headcountRequired | int | (count of sibling positions) | synthesized-on-read | `SELECT count(*) FROM ProjectPosition WHERE legacyStaffingRequestId = $1`. |
| headcountFulfilled | int | (count of active sibling positions) | synthesized-on-read | `SELECT count(*) FROM ProjectPosition WHERE legacyStaffingRequestId = $1 AND fillStatus IN ('BOOKED','ONBOARDING','ASSIGNED','ON_HOLD')`. |
| candidatePersonId | uuid nullable | activePersonId (per filled sibling position) | uuid nullable | synthesized-on-read | The SR-level "preferred candidate" denormalisation is replaced by the per-position active person. |
| priority | StaffingRequestPriority | priority | StaffingRequestPriority | identical | |
| status | StaffingRequestStatus | (derived from sibling positions' fillStatus) | synthesized-on-read | See "StaffingRequestStatus → derived position state" table above. |
| startDate | date | startDate | date | identical | |
| endDate | date | endDate | date | identical | |
| cancelledAt | timestamptz nullable | — | — | synthesized-on-read | When every sibling position is RELEASED, take MAX(updatedAt) as the cancellation timestamp. |
| createdAt | timestamptz | createdAt (per position) | timestamptz | identical | |
| updatedAt | timestamptz | updatedAt (per position) | timestamptz | identical | |
| createdByPersonId | uuid nullable | createdByPersonId | uuid nullable | identical | |
| updatedByPersonId | uuid nullable | updatedByPersonId | uuid nullable | identical | |
| version | int | version | int | identical | Counter restarts per position. |
| tenantId | uuid nullable | tenantId | uuid nullable | identical | |

## Model 5 — StaffingRequestProposalSlate → (implicit, no lean replacement)

The "slate" concept (a grouping of candidate proposals at a point in time)
is **dropped** from the lean model. Candidates attach directly to a
`ProjectPosition` via `ProjectPositionCandidate`. The slate's status and
expiry are replaced by:

- the position's `fillStatus` (OPEN → PROPOSED → BOOKED)
- per-candidate `decision` on `ProjectPositionCandidate`

| Source field | Source type | Target representation | Equivalence | Notes |
|---|---|---|---|---|
| id | uuid PK | — | missing | No lean equivalent. |
| staffingRequestId | text unique | (each candidate's position via legacyStaffingRequestId) | provenance | Backfill resolves via `ProjectPosition.legacyStaffingRequestId`. |
| proposedByPersonId | uuid | ProjectPositionCandidate.createdByPersonId | renamed | |
| status | StaffingRequestProposalSlateStatus | (derived from ProjectPosition.fillStatus + candidate decisions) | synthesized-on-read | OPEN ⇔ position.fillStatus = OPEN with any PENDING candidates. DECIDED ⇔ at least one PICKED. EXPIRED / WITHDRAWN ⇔ no lean equivalent (assumed DECIDED with no PICKED). |
| proposedAt | timestamptz | ProjectPositionCandidate.createdAt (earliest) | renamed | |
| expiresAt | timestamptz nullable | — | missing | Lean has no per-slate expiry; SLA timers live at `ProjectPosition.slaDueAt`. |
| decidedAt | timestamptz nullable | ProjectPositionCandidate.decidedAt (latest PICKED) | renamed | |
| createdAt | timestamptz | ProjectPositionCandidate.createdAt | renamed | |
| updatedAt | timestamptz | ProjectPositionCandidate.updatedAt | renamed | |
| createdByPersonId | uuid nullable | ProjectPositionCandidate.createdByPersonId | identical | |
| updatedByPersonId | uuid nullable | ProjectPositionCandidate.updatedByPersonId | identical | |

## Model 6 — StaffingRequestProposalCandidate → ProjectPositionCandidate

| Source field | Source type | Target field | Target type | Equivalence | Notes |
|---|---|---|---|---|---|
| id | uuid PK | id | uuid PK | identical | Lean creates fresh ids; backfill stamps the legacy id via the readiness probe (no dedicated column today — see "synthesized-on-read" below). |
| slateId | uuid | positionId | uuid | renamed | Slate → position resolution via `ProjectPosition.legacyStaffingRequestId` join from `StaffingRequestProposalSlate.staffingRequestId`. |
| candidatePersonId | uuid | candidatePersonId | uuid | identical | |
| rank | int | rank | int | identical | |
| matchScore | decimal(6,3) | matchScore | decimal(6,3) | identical | |
| availabilityPercent | decimal(5,2) nullable | availabilityPercent | decimal(5,2) nullable | identical | |
| mismatchedSkills | text[] | mismatchedSkills | text[] | identical | |
| rationale | text nullable | rationale | text nullable | identical | |
| decision | StaffingRequestProposalCandidateDecision | decision | ProjectPositionCandidateDecision | identical | Same 4-value enum (PENDING / PICKED / DECLINED / AUTO_DECLINED). |
| decidedAt | timestamptz nullable | decidedAt | timestamptz nullable | identical | |
| createdAt | timestamptz | createdAt | timestamptz | identical | |
| updatedAt | timestamptz | updatedAt | timestamptz | identical | |
| createdByPersonId | uuid nullable | createdByPersonId | uuid nullable | identical | |
| updatedByPersonId | uuid nullable | updatedByPersonId | uuid nullable | identical | |

Synthesized-on-read note: `ProjectPositionCandidate` does **not** currently
carry a `legacyCandidateId` provenance column. The readiness check
reconciles by joining `(positionId, candidatePersonId)` against
`(slateId → SR id → position via legacyStaffingRequestId, candidatePersonId)`.
If a future sprint needs row-level audit, a `legacyCandidateId` column is
the natural add and is called out as a follow-up in LEAN-P0-4.

## Model 7 — StaffingRequestFulfilment → (synthesized-on-read from ProjectPosition)

`StaffingRequestFulfilment` recorded that a person was attached to a
specific staffing-request slot. In the lean model, the slot **is** the
position — so a fulfilment is implicit when `ProjectPosition.activePersonId`
is set and `fillStatus` is in the active subset.

| Source field | Source type | Target representation | Equivalence | Notes |
|---|---|---|---|---|
| id | text PK | — | missing | No lean equivalent. |
| idNew | uuid generated | — | — | missing | DM-2-era column; not carried. |
| requestId | text | (ProjectPosition via legacyStaffingRequestId) | synthesized-on-read | |
| assignedPersonId | text | ProjectPosition.activePersonId | renamed | |
| proposedByPersonId | text | ProjectPositionCandidate.createdByPersonId (for the PICKED row) | renamed | |
| fulfilledAt | timestamptz | (ProjectPositionFillHistory.occurredAt where newStatus=BOOKED) | synthesized-on-read | |
| createdAt | timestamptz | (same as above) | synthesized-on-read | |
| updatedAt | timestamptz | (same as above) | synthesized-on-read | |
| createdByPersonId | uuid nullable | ProjectPositionFillHistory.changedByPersonId | renamed | |
| updatedByPersonId | uuid nullable | — | missing | Lean fill history is append-only. |

## Readiness signals (queries run by `scripts/lean-readiness-check.ts`)

The reconciliation script returns 0 for each query when the data is
ready to drop the legacy tables:

1. **assignment_backfill_completeness** — every non-archived
   `ProjectAssignment` row has a `ProjectPosition` mirror with
   matching `legacyAssignmentId`.
2. **staffing_request_backfill_completeness** — every
   `StaffingRequest` row has at least one `ProjectPosition` with
   matching `legacyStaffingRequestId`.
3. **status_mapping_consistency** — for every mirrored pair, the
   lean `fillStatus` equals `mapLegacyAssignmentStatus(legacyStatus)`.
4. **candidate_backfill_completeness** — every
   `StaffingRequestProposalCandidate` row is represented by a
   `ProjectPositionCandidate` for the same `(person, position)` pair,
   resolving slate → SR id → position via `legacyStaffingRequestId`.
5. **headcount_parity** — for each
   `StaffingRequest`, `count(ProjectPosition WHERE legacyStaffingRequestId=X) >= StaffingRequest.headcountRequired`.

Each query returns the COUNT of rows that violate the readiness
contract. A passing run prints `ok` for every probe; any non-zero count
prints `FAIL` with a sample id. Exit code 0 on all green, 1 on any
failure.

## What this audit does not do

- Does not modify `prisma/schema.prisma`. Schema changes (e.g. adding
  `legacyCandidateId` to `ProjectPositionCandidate`) are scoped to a
  later LEAN-P0 item.
- Does not touch `ProjectPositionMirrorService`. The mirror is the
  subject of LEAN-P0-4.
- Does not produce a backfill script. The Sprint-2 backfill (S2-5)
  remains the source of truth for backfill behaviour.
- Does not touch service code or DTOs. Documentation + readiness
  tooling only.
