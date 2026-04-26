-- DM-R-7 rollback: remove migration_audit table.
DROP INDEX IF EXISTS "migration_audit_agent_id_idx";
DROP INDEX IF EXISTS "migration_audit_recorded_at_idx";
DROP TABLE IF EXISTS "migration_audit";
