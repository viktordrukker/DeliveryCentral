-- Grant DML on setup_runs + setup_run_logs to the runtime DB users
-- (`prod_user`, `staging_user`).
--
-- Why this is needed: ops/bootstrap-app.sh:apply_baseline issues
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO <user>
-- which only auto-grants for objects created BY THE ROLE that ran the
-- ALTER (postgres superuser at install time). New tables created by a
-- DIFFERENT role (e.g. `app_migrator` after DM-R-21's DDL lockdown, or
-- `postgres` again via MIGRATE_DATABASE_URL) skip the auto-grant. The
-- result: a runtime endpoint that touches the new table fails with
-- `42501 permission denied for table <name>`.
--
-- Observed on staging 2026-05-02 after `20260502_setup_wizard` shipped:
-- `prisma.setupRun.findFirst()` returned 42501, blocking
-- /api/setup/status -> SetupGate fail-open -> /setup redirected to /login.
--
-- Idempotent (GRANT is idempotent in postgres) so re-applying is safe.
-- Skips users that don't exist on the cluster (dev DBs, fresh installs).
--
-- Classification: REVERSIBLE.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT rolname
    FROM pg_roles
    WHERE rolname IN ('prod_user', 'staging_user', 'app_runtime')
      AND rolcanlogin
  LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON setup_runs    TO %I',
      r.rolname
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON setup_run_logs TO %I',
      r.rolname
    );
  END LOOP;
END $$;
