# REVERSIBLE — LEAN-P4-missing-9 DM escalation approval flow

This migration is reversible (DM-R-4 classification).

## What rolling back does

`rollback.sql`:

1. Drops the `dm_escalations` table.
2. Drops the `DmEscalationStatus` enum.

## When rollback is safe

Before any escalation has been confirmed or overridden. After that point,
rolling back loses the Director-side audit trail (who confirmed/overrode
what rejection and when), which is the very reason this surface exists.

## Rollback path

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260606_lean_p4_missing_9_dm_escalation/rollback.sql
```

Then revoke the migration row:

```sql
DELETE FROM _prisma_migrations
 WHERE migration_name = '20260606_lean_p4_missing_9_dm_escalation';
```
