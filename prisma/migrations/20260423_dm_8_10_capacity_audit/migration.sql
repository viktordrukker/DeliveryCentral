-- DM-8-10 — capacity-audit table.
--
-- Weekly cron inserts one row per watched table with current row count.
-- Operator dashboard trends these to spot tables approaching the 5M-row
-- partition cutover threshold (DM-R strategic plan §J / DM-R-28 scenario H).
--
-- Watched tables (from DM-R strategic plan §J.32 — high-volume hot tables):
--   DomainEvent, AuditLog, ddl_audit, migration_audit
--   WorkEvidence, NotificationDelivery, NotificationRequest,
--   EmployeeActivityEvent, timesheet_entries
--
-- Not enforced in schema — the list lives in scripts/capacity-audit.sh.
--
-- Classification: REVERSIBLE.

CREATE TABLE IF NOT EXISTS "capacity_audit" (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "recordedAt" timestamptz NOT NULL DEFAULT NOW(),
  "tableName"  text        NOT NULL,
  "rowCount"   bigint      NOT NULL,
  "relSizeBytes" bigint,             -- pg_total_relation_size
  notes       text
);
CREATE INDEX IF NOT EXISTS "capacity_audit_table_recorded_idx"
  ON "capacity_audit" ("tableName", "recordedAt" DESC);

REVOKE UPDATE, DELETE ON "capacity_audit" FROM app_runtime;

COMMENT ON TABLE "capacity_audit" IS
  'DM-8-10 — weekly row-count trend per watched table. Operators partition-cutover (DM-R-28) at 5M rows (75% of the 10M operational ceiling per the DM-R scale projection).';
