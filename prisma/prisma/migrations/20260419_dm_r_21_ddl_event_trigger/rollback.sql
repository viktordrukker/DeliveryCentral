-- DM-R-21 rollback — remove event triggers + ddl_audit table.

DROP EVENT TRIGGER IF EXISTS "dm_r_21_sql_drop_audit_trigger";
DROP EVENT TRIGGER IF EXISTS "dm_r_21_ddl_audit_trigger";
DROP EVENT TRIGGER IF EXISTS "dm_r_21_ddl_lockout_trigger";

DROP FUNCTION IF EXISTS "dm_r_21_sql_drop_audit"();
DROP FUNCTION IF EXISTS "dm_r_21_ddl_audit"();
DROP FUNCTION IF EXISTS "dm_r_21_ddl_lockout"();

DROP INDEX IF EXISTS "ddl_audit_sessionUser_idx";
DROP INDEX IF EXISTS "ddl_audit_occurred_at_idx";
DROP TABLE IF EXISTS "ddl_audit";
