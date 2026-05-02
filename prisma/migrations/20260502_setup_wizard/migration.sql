-- In-app setup wizard tables: setup_runs (one row per step per re-arm)
-- + setup_run_logs (verbose breadcrumbs for the diagnostic bundle).
--
-- Idempotent per DM-R-11 norm: every CREATE uses IF NOT EXISTS / DO
-- duplicate_object so a partial earlier run is safe to re-apply.
--
-- Classification: REVERSIBLE.

-- ─── Enums ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "SetupRunStatus" AS ENUM (
    'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SetupRunLogLevel" AS ENUM (
    'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ─── setup_runs ───────────────────────────────────────────────────────────
-- One row per (run_id, step_key). A `run_id` groups all step rows of a single
-- wizard execution. `payload_redacted` carries the per-step input/result
-- (passwords + secrets stripped). Resumable: re-entering the wizard finds
-- the first non-COMPLETED row and continues there.
CREATE TABLE IF NOT EXISTS "setup_runs" (
  "id"              uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "run_id"          uuid                       NOT NULL,
  "step_key"        text                       NOT NULL,
  "status"          "SetupRunStatus"           NOT NULL DEFAULT 'PENDING',
  "started_at"      timestamp(3) with time zone,
  "finished_at"     timestamp(3) with time zone,
  "error_payload"   jsonb,
  "actor_id"        uuid,
  "payload_redacted" jsonb,
  "version"         integer                    NOT NULL DEFAULT 1,
  "created_at"      timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at"      timestamp(3) with time zone NOT NULL,
  CONSTRAINT "setup_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "setup_runs_run_id_step_key_key"
  ON "setup_runs" ("run_id", "step_key");
CREATE INDEX IF NOT EXISTS "setup_runs_run_id_idx"
  ON "setup_runs" ("run_id");
CREATE INDEX IF NOT EXISTS "setup_runs_status_started_at_idx"
  ON "setup_runs" ("status", "started_at");


-- ─── setup_run_logs ───────────────────────────────────────────────────────
-- Verbose breadcrumbs. One row per logical action (CREATE DATABASE attempt,
-- migrate apply, diff calc, SMTP test, etc.). `payload_redacted` carries the
-- structured detail; secret-shaped fields ('password', 'secret', 'token',
-- 'apiKey', '*_PASSWORD', 'AUTH_JWT_SECRET') are auto-redacted in the writer.
-- Bundled into the diagnostic-bundle tar.gz on demand.
CREATE TABLE IF NOT EXISTS "setup_run_logs" (
  "id"               uuid                       NOT NULL DEFAULT gen_random_uuid(),
  "run_id"           uuid                       NOT NULL,
  "step_key"         text                       NOT NULL,
  "sequence"         integer                    NOT NULL,
  "level"            "SetupRunLogLevel"         NOT NULL DEFAULT 'INFO',
  "event"            text                       NOT NULL,
  "payload_redacted" jsonb,
  "duration_ms"      integer,
  "occurred_at"      timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "setup_run_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "setup_run_logs_run_id_sequence_idx"
  ON "setup_run_logs" ("run_id", "sequence");
CREATE INDEX IF NOT EXISTS "setup_run_logs_run_id_step_key_idx"
  ON "setup_run_logs" ("run_id", "step_key");
CREATE INDEX IF NOT EXISTS "setup_run_logs_level_occurred_at_idx"
  ON "setup_run_logs" ("level", "occurred_at");
