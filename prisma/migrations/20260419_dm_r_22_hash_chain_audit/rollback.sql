-- DM-R-22 rollback — remove triggers, function, hash columns.

DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "ddl_audit";
DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "migration_audit";
DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "AuditLog";

DROP FUNCTION IF EXISTS "dm_r_22_audit_hash_chain"();

ALTER TABLE "ddl_audit"       DROP COLUMN IF EXISTS "rowHash";
ALTER TABLE "ddl_audit"       DROP COLUMN IF EXISTS "prevHash";
ALTER TABLE "migration_audit" DROP COLUMN IF EXISTS "rowHash";
ALTER TABLE "migration_audit" DROP COLUMN IF EXISTS "prevHash";
ALTER TABLE "AuditLog"        DROP COLUMN IF EXISTS "rowHash";
ALTER TABLE "AuditLog"        DROP COLUMN IF EXISTS "prevHash";
