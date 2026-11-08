# REVERSIBLE — LEAN-P3-1 pre-migration data fixup

This migration is reversible (DM-R-4 classification).

## What rolling back does

`rollback.sql` undoes the additive parts of this migration. The value-only
data movements (operations 1, 3, 4) are reverted on a best-effort basis
from the JSONB provenance column (op 2) and the existing legacy
back-references on `ProjectPosition.legacyAssignmentId`.

1. **CaseRecord.relatedAssignmentId** — the rollback re-resolves the
   nullified pointer by joining each `CaseRecord` whose payload carries
   a legacy assignmentId hint back to the live `ProjectAssignment` row.
   Cases without payload provenance stay NULL (information lost but
   referentially safe).
2. **rate_card_entries.pinnedPositions** — column is dropped.
3. **timesheet_entries.positionId backfill** — rows whose `assignmentId`
   still resolves are set back to NULL **only** if they were populated by
   THIS migration (heuristic: positionId NOT NULL AND legacyAssignmentId
   AND assignmentId match). LEAN-P0-5 populated entries are left intact
   because they are indistinguishable from runtime writes.
4. **AuditLog.aggregateType** — rows that were migrated
   ProjectAssignment → ProjectPosition by THIS migration are reverted
   when the legacy assignmentId can still be resolved through
   `ProjectPosition.legacyAssignmentId`. Otherwise the rows stay
   ProjectPosition — they are an immutable audit trail.

## When rollback is safe

Before LEAN-P3-2 runs. LEAN-P3-2 drops `ProjectAssignment` and the
`CaseRecord.relatedAssignmentId` / `AuditLog ProjectAssignment` enum
value, at which point this rollback's join targets disappear and the
rollback becomes a partial best-effort.

## Rollback path

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260606_lean_p3_1_data_fixup/rollback.sql
```

Then revoke the migration row:

```sql
DELETE FROM _prisma_migrations
 WHERE migration_name = '20260606_lean_p3_1_data_fixup';
```

## What rollback does NOT touch

- The legacy `ProjectAssignment.appliedRateCardEntryId` column — never
  modified by this migration, so no rollback needed.
- LEAN-P0-5 positionId backfill — rolled back independently by
  LEAN-P0-5's own rollback.sql.
