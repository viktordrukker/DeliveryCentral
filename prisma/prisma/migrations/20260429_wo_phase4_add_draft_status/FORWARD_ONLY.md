# FORWARD_ONLY

**Posture:** This migration is **FORWARD_ONLY**.

## Why forward-only

The migration adds the value `DRAFT` to the `AssignmentStatus` enum
(`ALTER TYPE "AssignmentStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE
'CREATED'`). PostgreSQL has no `DROP VALUE` for enum types, so cleanly
reversing an enum-value addition is impossible at the DB level once any
row uses it. Recovery goes through a pre-migration snapshot.

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
