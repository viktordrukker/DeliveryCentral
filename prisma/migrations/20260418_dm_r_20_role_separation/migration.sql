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
GRANT CONNECT ON DATABASE workload_tracking TO app_runtime;
GRANT CONNECT ON DATABASE workload_tracking TO app_migrator;

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
REVOKE UPDATE, DELETE ON "AuditLog"        FROM app_runtime;
REVOKE UPDATE, DELETE ON "migration_audit" FROM app_runtime;
-- Future: REVOKE UPDATE, DELETE ON "DomainEvent" FROM app_runtime;  (DM-7)
-- Future: REVOKE UPDATE, DELETE ON "ddl_audit"   FROM app_runtime;  (DM-R-21)

COMMENT ON ROLE app_runtime IS
  'DM-R-20 — DML-only runtime role. Used by the NestJS backend. No DDL, no TRUNCATE, append-only on audit tables.';
COMMENT ON ROLE app_migrator IS
  'DM-R-20 — full-owner migration role. Used by the migrate container + DBAs. DDL permitted.';
