# REVERSIBLE

**Posture:** This migration is **REVERSIBLE**. A sibling `rollback.sql` is
committed alongside it and drops the 6 tables and 4 enums it installs.

## Rollback procedure

1. Verify the migration is currently marked applied in `_prisma_migrations`.
2. Take a snapshot — the rollback drops every row in each table:

   ```bash
   ./scripts/db-snapshot.sh pre-rollback
   ```

3. Execute `rollback.sql` against the target DB:

   ```bash
   docker compose exec -T postgres psql -U postgres -d workload_tracking \
     < prisma/migrations/20260330_dm_r_11_orphan_recovery/rollback.sql
   ```

4. Mark the migration as rolled back in `_prisma_migrations`:

   ```sql
   UPDATE _prisma_migrations
      SET rolled_back_at = NOW()
    WHERE migration_name = '20260330_dm_r_11_orphan_recovery'
      AND finished_at IS NOT NULL
      AND rolled_back_at IS NULL;
   ```

## Why reversible

The migration is pure expand-phase: it `CREATE`s tables and enums
that, on every existing DB, already exist (so the SQL is a no-op).
On a fresh DB, the `DROP … IF EXISTS` rollback restores the empty
state.

## Why this migration exists at all

Six tables (`EmployeeActivityEvent`, `clients`, `vendors`,
`project_rag_snapshots`, `project_role_plans`,
`project_vendor_engagements`) and four enums (`RagRating`,
`RolePlanSource`, `VendorContractType`, `VendorEngagementStatus`)
were originally created via direct schema edits + `prisma db push`,
not via committed migrations. DM-R-11 catalogued the gap; this
migration closes it. After this lands, `prisma migrate deploy` works
first try on any fresh Postgres — see the new `Fresh-DB migrate` CI
job in `.github/workflows/ci.yml`.

See [`docs/planning/dm-r-plan.md`](../../../docs/planning/dm-r-plan.md).
