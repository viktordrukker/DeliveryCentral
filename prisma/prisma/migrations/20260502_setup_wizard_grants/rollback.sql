-- Reverse of 20260502_setup_wizard_grants/migration.sql.
--
-- REVOKE is idempotent. Skips users that don't exist.

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
      'REVOKE SELECT, INSERT, UPDATE, DELETE ON setup_runs    FROM %I',
      r.rolname
    );
    EXECUTE format(
      'REVOKE SELECT, INSERT, UPDATE, DELETE ON setup_run_logs FROM %I',
      r.rolname
    );
  END LOOP;
END $$;
