# REVERSIBLE

**Posture:** REVERSIBLE. Sibling `rollback.sql` drops the two tables and
two enums the forward migration adds.

## What this migration adds

* `PersonReleaseStatus` enum (`PENDING_APPROVAL` / `APPROVED` /
  `REJECTED` / `CANCELLED` / `COMPLETED`).
* `ReleaseApprovalDecision` enum (`APPROVED` / `REJECTED`).
* `person_release_requests` table — one row per release submission;
  RM initiates, HR Manager AND Director both approve, RM finalizes.
* `person_release_approvals` table — one row per approver decision;
  unique on `(requestId, role)` so a single role can't decide twice.

All additive; no existing data is touched.

## Rollback impact

* All in-flight release requests + approval history are lost.
* The HD-5 services (`OpenPersonReleaseRequestService`,
  `DecidePersonReleaseService`, future `FinalizePersonReleaseService`)
  will fail at boot if their tables are missing — schedule a code
  rollback alongside any DB rollback.
