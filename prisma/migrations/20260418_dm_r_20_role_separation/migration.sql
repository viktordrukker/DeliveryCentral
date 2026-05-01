-- DM-R-20 — Postgres role separation.
--
-- Creates two roles:
--   app_runtime  — DML only (SELECT/INSERT/UPDATE/DELETE). No DDL,
--                  no TRUNCATE, no CREATE, no DROP. The backend
--                  connects as this role. A hostile agent that
--                  smuggles `DROP TABLE` through the application
--                  fails at the DB permission layer, not the
--                  review gate.
--   app_migrator — full ownership. Only the migrate container +
--                  manual DDL sessions use this role.
--
-- Append-only tables (AuditLog, migration_audit — and future
-- DomainEvent/ddl_audit when DM-7/DM-R-21 land) revoke DELETE and
-- UPDATE from app_runtime. Writers may append only; history is
-- immutable from the runtime role's perspective.
--
-- Passwords are set here to known tokens that match the compose
-- default secrets. Production overrides via POSTGRES_APP_RUNTIME_PASSWORD
-- and POSTGRES_APP_MIGRATOR_PASSWORD in the deploy environment
-- (rotate before exposing any real data).
--
-- Classification: REVERSIBLE. Rollback drops both roles.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_migrator') THEN
    CREATE ROLE app_migrator LOGIN PASSWORD 'app_migrator';
  END IF;
END
$$;

-- ---------------------------------------------------------------- connect
-- DM-R-11 (2026-05-01): use current_database() so this works against
-- workload_tracking (dev), workload_tracking_prod, workload_tracking_staging,
-- and any name a fresh CI ephemeral DB picks. The original literal
-- `workload_tracking` was the dev-only name and made fresh-DB migrate fail.
DO $$
BEGIN
  EXECUTE 'GRANT CONNECT ON DATABASE ' || quote_ident(current_database()) || ' TO app_runtime';
  EXECUTE 'GRANT CONNECT ON DATABASE ' || quote_ident(current_database()) || ' TO app_migrator';
END $$;

-- ------------------------------------------------------------- schema use
GRANT USAGE          ON SCHEMA public TO app_runtime;
GRANT USAGE, CREATE  ON SCHEMA public TO app_migrator;

-- ----------------------------------------------------- app_runtime grants
-- DML on every existing table, and default-privileges for future tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO app_runtime;
GRANT USAGE                          ON ALL SEQUENCES IN SCHEMA public TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE ON SEQUENCES TO app_runtime;

-- --------------------------------------------------- app_migrator grants
GRANT ALL ON ALL TABLES     IN SCHEMA public TO app_migrator;
GRANT ALL ON ALL SEQUENCES  IN SCHEMA public TO app_migrator;
GRANT ALL ON ALL FUNCTIONS  IN SCHEMA public TO app_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO app_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO app_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO app_migrator;

-- --------------------------------- append-only invariant on audit tables
-- DM-R-22 hash-chain will add BEFORE UPDATE/DELETE triggers for forensic
-- coverage; role-level revokes here are the first defense line.
-- DM-R-11 (2026-05-01): conditional REVOKE — `migration_audit` is
-- created by sibling `20260418_dm_r_7_migration_audit` which sorts AFTER
-- this one (`_20_` < `_7_` lexicographically). On a fresh DB the table
-- doesn't exist yet; on every populated DB it does and the REVOKE runs.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'AuditLog') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON "AuditLog" FROM app_runtime';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'migration_audit') THEN
    EXECUTE 'REVOKE UPDATE, DELETE ON "migration_audit" FROM app_runtime';
  END IF;
END $$;
-- Future: REVOKE UPDATE, DELETE ON "DomainEvent" FROM app_runtime;  (DM-7)
-- Future: REVOKE UPDATE, DELETE ON "ddl_audit"   FROM app_runtime;  (DM-R-21)

COMMENT ON ROLE app_runtime IS
  'DM-R-20 — DML-only runtime role. Used by the NestJS backend. No DDL, no TRUNCATE, append-only on audit tables.';
COMMENT ON ROLE app_migrator IS
  'DM-R-20 — full-owner migration role. Used by the migrate container + DBAs. DDL permitted.';
