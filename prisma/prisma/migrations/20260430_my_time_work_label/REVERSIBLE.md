# REVERSIBLE

**Posture:** This migration is **REVERSIBLE**. A sibling `rollback.sql`
restores the schema to the pre-migration state.

## Caveat — destructive backfill

Step 1 of the migration backfills `benchCategory IS NULL → ''` so the
column can become `NOT NULL`. The rollback drops the `NOT NULL` /
`DEFAULT` and brings the column back to nullable, but **cannot
distinguish post-rollback `''` from a pre-migration `NULL`** — that
information is gone after the backfill. In practice this is metadata
only (no app-level NULL/empty distinction), so the rollback is safe for
real-world recovery. If perfect fidelity matters, restore from snapshot
instead.

## Rollback procedure

1. Verify the migration is currently marked applied in `_prisma_migrations`.
2. Take a snapshot:
   ```bash
   ./scripts/db-snapshot.sh pre-rollback
   ```
3. Execute `rollback.sql`:
   ```bash
   docker compose exec -T postgres psql -U postgres -d workload_tracking \
     < prisma/migrations/20260430_my_time_work_label/rollback.sql
   ```
4. Mark rolled back:
   ```sql
   UPDATE _prisma_migrations
      SET rolled_back_at = NOW()
    WHERE migration_name = '20260430_my_time_work_label'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL;
   ```
5. Confirm via `scripts/prestart-verify-migrations.sh`.

## Why reversible

The migration adds two columns (`workLabel`, `workItemId`) and swaps a
unique index. Both are mechanically invertible. No enums are altered, no
tables dropped.

See [`docs/planning/dm-r-plan.md`](../../docs/planning/dm-r-plan.md).
