# REVERSIBLE — Sprint 2 / S2-1 lean staffing aggregate expand

This migration is a pure additive expand: 3 new tables + 3 new enums, no
changes to existing tables, no data manipulation.

## Rollback path

Run `rollback.sql` in the same directory. The rollback drops the new tables
(cascade-drops any rows that exist + the new enums).

```bash
psql "$DATABASE_URL" -f prisma/migrations/20260523_lean_staffing_expand_project_position/rollback.sql
```

After rollback, also revoke the migration row from `_prisma_migrations`:

```sql
DELETE FROM _prisma_migrations WHERE migration_name = '20260523_lean_staffing_expand_project_position';
```

## Safe in production?

Yes. The expand-phase migration adds infrastructure only — no consumer code
yet writes to the new tables (that lands in S2-6 dual-write). Rolling back
before the dual-write seam is wired loses nothing.

After Sprint 2 S2-6 lands, rollback becomes destructive (loses dual-write
shadow data). Rollback procedure for that window is in Sprint 5's contract-phase
migration runbook.
