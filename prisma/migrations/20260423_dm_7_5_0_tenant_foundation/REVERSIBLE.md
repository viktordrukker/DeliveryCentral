# REVERSIBLE

**Posture:** This migration is **REVERSIBLE**. A sibling `rollback.sql` is
committed alongside it and is expected to restore the schema (and where
feasible, the data shape) to the pre-migration state.

## Rollback procedure

1. Verify the migration is currently marked applied in `_prisma_migrations`.
2. Take a snapshot (belt + braces — rollback.sql is tested, but a snapshot
   is still the recovery of last resort):

   ```bash
   ./scripts/db-snapshot.sh pre-rollback
   ```

3. Execute `rollback.sql` against the target DB:

   ```bash
   docker compose exec -T postgres psql -U postgres -d workload_tracking \
     < prisma/migrations/<this-dir>/rollback.sql
   ```

4. Mark the migration as rolled back in `_prisma_migrations`:

   ```sql
   UPDATE _prisma_migrations
      SET rolled_back_at = NOW()
    WHERE migration_name = '<this-dir>'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL;
   ```

5. Confirm via `scripts/prestart-verify-migrations.sh`.

## Why reversible

This migration is either (a) pure expand-phase (adds a column/table without
dropping anything), or (b) additive constraints that can be dropped
cleanly. In both cases the inverse SQL is trivial and we commit it.

Weekly round-trip verification lands in DM-R-11. Until then, the rollback
has been exercised at least once during authoring.

See [`docs/planning/dm-r-plan.md`](../../docs/planning/dm-r-plan.md).
