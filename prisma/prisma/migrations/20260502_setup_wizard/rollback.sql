-- Setup wizard rollback. Drops the two tables + two enums.
-- Idempotent: every statement is IF EXISTS so it survives partial state.

DROP TABLE IF EXISTS "setup_run_logs" CASCADE;
DROP TABLE IF EXISTS "setup_runs"     CASCADE;

DROP TYPE IF EXISTS "SetupRunLogLevel";
DROP TYPE IF EXISTS "SetupRunStatus";
