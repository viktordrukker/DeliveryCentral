# FORWARD_ONLY

**Posture:** This migration is **FORWARD_ONLY**. There is no committed, tested
`rollback.sql` for this directory — and deliberately so. Writing a rollback
that runs cleanly but silently loses data is worse than having no rollback
at all. If the migration turns out to be a mistake, recovery goes through a
pre-migration snapshot, not through automated reversal.

## How to restore after a bad deploy

Every production/staging run of this migration MUST be preceded by a
pre-migration snapshot. The canonical flow is:

```bash
# 1) Before the migration (required by scripts/db-migrate-safe.sh):
./scripts/db-snapshot.sh pre-migrate

# 2) Run the migration via the safe wrapper:
./scripts/db-migrate-safe.sh deploy

# 3) If it turns out bad, restore the snapshot:
./scripts/db-restore.sh .snapshots/<timestamp>.pre-migrate-deploy.dump
```

Point-in-time recovery (DM-R-25) is the secondary path once it lands.

## Why forward-only

Older migrations predate the DM-R-4 classification rule. Rather than
back-fill fictional rollback SQL that has never been exercised, we declare
them forward-only and rely on DM-R-3's snapshot toolchain for recovery.

See [`docs/planning/dm-r-plan.md`](../../docs/planning/dm-r-plan.md) and
[`docs/planning/schema-conventions.md`](../../docs/planning/schema-conventions.md)
for the full classification rules.
