# DM-8-12 — Partition cutover runbook

**Status:** rehearsed, not executed. Runs only when a watched table
crosses 5M rows (DM-8-10 capacity_audit will alert).

**Scope:** declarative-partition a table with historical data already
in a single default partition. The DomainEvent table (DM-7-1) ships
partition-ready from day one — other high-volume tables
(WorkEvidence, NotificationDelivery, TimesheetEntry, ddl_audit,
EmployeeActivityEvent) need this runbook when they cross the
threshold.

## Prerequisites

1. The table's PK must include the partition key column (usually
   `createdAt`). If the PK is just `id`, a re-keying migration
   precedes partitioning — see the DM-R strategic plan §J for the
   expand-contract-rekey pattern.
2. `DM-R-3` snapshot taken via `scripts/db-snapshot.sh pre-partition`.
3. Traffic drained from the table for the cutover window. For
   append-only audit tables (DomainEvent, ddl_audit), a 30s pause is
   sufficient; for OLTP tables, schedule off-hours + blue/green.
4. A PITR base backup (DM-R-25) taken within the last 24 hours.

## Cutover procedure (worked example: ddl_audit)

### Phase 1 — add new partitioned table alongside

```sql
-- Create the new partitioned table with the same shape.
CREATE TABLE "ddl_audit_new" (
  LIKE "ddl_audit" INCLUDING ALL EXCLUDING CONSTRAINTS EXCLUDING INDEXES
) PARTITION BY RANGE (occurred_at);

-- Default partition absorbs everything until we retro-split.
CREATE TABLE "ddl_audit_new_default" PARTITION OF "ddl_audit_new" DEFAULT;

-- Recreate indexes + triggers on the new table.
-- (same DDL as the original; scripted in scripts/migrate-partition.sh)
```

### Phase 2 — backfill

```sql
-- Lock the source table long enough to copy + snapshot LSN.
BEGIN;
LOCK TABLE "ddl_audit" IN SHARE MODE;
INSERT INTO "ddl_audit_new" SELECT * FROM "ddl_audit";
-- Capture the cutoff LSN for forward catch-up if traffic resumes.
SELECT pg_current_wal_lsn();
COMMIT;
```

### Phase 3 — swap

```sql
BEGIN;
LOCK TABLE "ddl_audit" IN ACCESS EXCLUSIVE MODE;
-- Re-insert any rows that arrived after the backfill snapshot
-- (differential by chainSeq / id).
INSERT INTO "ddl_audit_new" SELECT * FROM "ddl_audit"
  WHERE "chainSeq" > (SELECT MAX("chainSeq") FROM "ddl_audit_new");

-- Rename in one transaction.
ALTER TABLE "ddl_audit"     RENAME TO "ddl_audit_old";
ALTER TABLE "ddl_audit_new" RENAME TO "ddl_audit";
COMMIT;
```

### Phase 4 — verify + split partitions

```sql
-- Hash-chain still intact?
-- (scripts/verify-audit-hash-chain.cjs runs against the new table.)

-- Retro-split the default partition into monthly ranges.
-- Run one at a time to keep locks short.
BEGIN;
CREATE TABLE "ddl_audit_2026_04" PARTITION OF "ddl_audit"
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
-- Data migration: rows move from _default into _2026_04.
WITH moved AS (
  DELETE FROM "ddl_audit_default"
  WHERE occurred_at >= '2026-04-01' AND occurred_at < '2026-05-01'
  RETURNING *
)
INSERT INTO "ddl_audit_2026_04" SELECT * FROM moved;
COMMIT;

-- Repeat per month. Drop "ddl_audit_default" once empty.
```

### Phase 5 — cleanup

```sql
-- Keep "ddl_audit_old" available for 30 days as a safety net.
-- After verification, drop.
DROP TABLE "ddl_audit_old";
```

## Monthly maintenance

- New month = new partition. Schedule a cron:
  ```sql
  CREATE TABLE IF NOT EXISTS "ddl_audit_2026_05" PARTITION OF "ddl_audit"
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
  ```
- Retention: drop partitions older than N months with `DROP TABLE "ddl_audit_YYYY_MM"` (fast — no VACUUM).

## Trigger points

From DM-8-10 capacity_audit, alert when a watched table crosses:
- **5M rows** — prepare to cut over (order materials; schedule window).
- **7M rows** — cutover window scheduled.
- **10M rows** — operational ceiling per DM-R-25 scale projection; cutover MUST happen.

## Rollback

If phase 3 swap goes wrong: the original table is renamed to
`ddl_audit_old`, still intact. Swap names back; new partitioned
table remains aside for debugging.

If data-loss detected post-cutover: restore the snapshot from
`.snapshots/…pre-partition.dump` via `scripts/db-restore.sh`. Or
PITR to pre-phase-3 wall-clock time via `docs/runbooks/pitr-restore.md`.

## Related

- DM-7-1 DomainEvent is already partition-ready; follows this runbook's
  Phase 4 only (split partitions).
- DM-R-11 weekly round-trip will catch any rollback.sql that doesn't
  round-trip cleanly across the cutover.
