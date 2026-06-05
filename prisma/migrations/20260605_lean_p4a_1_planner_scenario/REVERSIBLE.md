# REVERSIBLE — LEAN-P4a-1 PlannerScenario tenancy + status + audit

This migration is reversible (DM-R-4 classification).

## What rolling back does

`rollback.sql` drops the additive surface added here:

1. Drops `planner_scenarios.publicId`, `tenantId`, `status`, `updatedByPersonId`
   columns and their FKs / indexes.
2. Drops the `PlannerScenarioStatus` enum once no column references it.
3. Does **NOT** revert the `archivedAt → status = CANCELLED` backfill;
   the source `archivedAt` value is preserved, so semantically the
   pre-migration state is restored once `status` is dropped.

## When rollback is safe

Before any service starts reading `status` to drive lifecycle behaviour.
Phase 4a-2 (the UI follow-up) reads `status` for the planner panel; a
rollback **before Phase 4a-2 lands** is data-safe. After that, rolling
back loses the explicit lifecycle distinction and falls back to the
boolean `archivedAt` semantic only.

## Rollback path

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260605_lean_p4a_1_planner_scenario/rollback.sql
```

Then revoke the migration row:

```sql
DELETE FROM _prisma_migrations
 WHERE migration_name = '20260605_lean_p4a_1_planner_scenario';
```
