# REVERSIBLE — LEAN-P0-5 reconciliation backfill

This migration is reversible (DM-R-4 classification).

## What rolling back does

`rollback.sql` undoes the additive parts of this migration:

1. Drops `ProjectPositionCandidate.legacyCandidateId` (column + index).
2. Drops `timesheet_entries.positionId` + `timesheet_entries.personId`
   (columns + FK constraints + indexes).
3. Does **NOT** revert the value-only backfills
   (`ProjectPosition.legacyAssignmentId`, `legacyStaffingRequestId`,
   `staffing_requests.id_new`, `staffing_request_fulfilments.id_new`)
   because those columns already existed before this migration and the
   pre-existing values were `NULL` (or, for `id_new`, populated by the
   DM-2 trigger on new writes anyway). Rolling those NULL again would be
   semantically equivalent to "operator hasn't run reconciliation yet" —
   safe, but information-losing.

## When rollback is safe

Before any consumer reads from the new columns. Phase 1 cutover work
that depends on `timesheet_entries.positionId` is gated on this migration
having shipped, so a rollback **before Phase 1 lands** is data-safe.

Once Phase 1 starts populating `positionId` on every new timesheet write,
rolling back this migration is destructive (loses the new column data).

## Rollback path

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260602_lean_p0_5_reconciliation_backfill/rollback.sql
```

Then revoke the migration row:

```sql
DELETE FROM _prisma_migrations
 WHERE migration_name = '20260602_lean_p0_5_reconciliation_backfill';
```
