# FORWARD_ONLY

**Posture:** This migration is **FORWARD_ONLY**.

## Why forward-only

The migration adds a new value `IN_REVIEW` to the `AssignmentStatus` enum
(`ALTER TYPE "AssignmentStatus" ADD VALUE 'IN_REVIEW' AFTER 'PROPOSED'`).
PostgreSQL has no `DROP VALUE` for enum types, so the only way to "remove"
an enum value is the rename-and-replace dance — which is destructive and
risks losing rows that already use the new value. Once any
`ProjectAssignment` row carries `IN_REVIEW`, `slaStage`, `slaBreachedAt`,
or references the new slate tables, automated reversal would silently
drop business state.

Recovery for a bad deploy goes through a pre-migration snapshot, not
through automated reversal — the standard DM-R flow.

## How to restore after a bad deploy

```bash
# 1) Before the migration (required by scripts/db-migrate-safe.sh):
./scripts/db-snapshot.sh pre-migrate

# 2) Run the migration via the safe wrapper:
./scripts/db-migrate-safe.sh deploy

# 3) If it turns out bad, restore the snapshot:
./scripts/db-restore.sh .snapshots/<timestamp>.pre-migrate-deploy.dump
```

Point-in-time recovery (DM-R-25) is the secondary path.

## Approvals

Per DM-R-29 (two-person rule for FORWARD_ONLY migrations), the merge
commit that introduces this directory must carry ≥2 distinct
`Approved-By:` trailers when landing via PR. Direct pushes to `main`
bypass that CI gate but should still be reviewed before promote-to-prod.

See [`docs/planning/dm-r-plan.md`](../../docs/planning/dm-r-plan.md).
