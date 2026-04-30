# FORWARD_ONLY

**Posture:** This migration is **FORWARD_ONLY**.

## Why forward-only

The migration realigns the slate aggregate from `ProjectAssignment` to
`StaffingRequest`:

- `DROP TABLE` on `AssignmentProposalCandidate` and
  `AssignmentProposalSlate` (and their enums
  `AssignmentProposalCandidateDecision`,
  `AssignmentProposalSlateStatus`).
- `CREATE TABLE` on `StaffingRequestProposalSlate` and
  `StaffingRequestProposalCandidate` (and matching enums).
- `ADD COLUMN candidatePersonId` to `staffing_requests`.

Both old tables were always empty (per the migration header comment —
the prior workflow forced placeholder personIds, so the old slate path
was never used in production data), but a clean automated reversal would
need to (a) drop the new tables and column, (b) recreate the old enums,
and (c) recreate the old empty tables with their FKs and indexes.
That recreation is mechanical schema regen with no data to restore;
writing it as `rollback.sql` adds maintenance burden without operational
value. The DM-R snapshot/restore flow is the cleaner recovery path.

## How to restore after a bad deploy

```bash
./scripts/db-snapshot.sh pre-migrate
./scripts/db-migrate-safe.sh deploy
# If bad:
./scripts/db-restore.sh .snapshots/<timestamp>.pre-migrate-deploy.dump
```

## Approvals

Per DM-R-29, FORWARD_ONLY migrations landing via PR require ≥2 distinct
`Approved-By:` trailers on the merge commit.

See [`docs/planning/dm-r-plan.md`](../../docs/planning/dm-r-plan.md).
