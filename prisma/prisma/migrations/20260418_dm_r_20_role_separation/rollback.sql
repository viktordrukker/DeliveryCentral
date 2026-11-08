-- DM-R-20 rollback — drop both roles.
--
-- Safety: revoke grants first, then reassign ownership, then drop. If any
-- objects still reference the roles the DROP will fail loudly.

-- ---------------------------------------------------- revoke app_runtime
REVOKE ALL ON ALL TABLES     IN SCHEMA public FROM app_runtime;
REVOKE ALL ON ALL SEQUENCES  IN SCHEMA public FROM app_runtime;
REVOKE USAGE                 ON SCHEMA public FROM app_runtime;
REVOKE CONNECT  ON DATABASE workload_tracking FROM app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES    FROM app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE                          ON SEQUENCES FROM app_runtime;

-- --------------------------------------------------- revoke app_migrator
REVOKE ALL ON ALL TABLES     IN SCHEMA public FROM app_migrator;
REVOKE ALL ON ALL SEQUENCES  IN SCHEMA public FROM app_migrator;
REVOKE ALL ON ALL FUNCTIONS  IN SCHEMA public FROM app_migrator;
REVOKE USAGE, CREATE         ON SCHEMA public FROM app_migrator;
REVOKE CONNECT  ON DATABASE workload_tracking FROM app_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM app_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM app_migrator;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM app_migrator;

-- ------------------------------------------------------------- drop
DROP ROLE IF EXISTS app_runtime;
DROP ROLE IF EXISTS app_migrator;
