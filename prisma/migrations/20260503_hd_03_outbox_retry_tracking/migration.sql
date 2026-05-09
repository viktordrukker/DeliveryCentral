-- HD-0.3 — OutboxEvent retry bookkeeping for the OutboxEventPublisher.
--
-- Adds two columns the publisher loop needs in order to bound retries
-- and surface failures to ops:
--
--   * attempts   INT  NOT NULL DEFAULT 0  — dispatch attempts so far,
--     incremented on every handler failure. Capped by the runtime
--     PlatformSetting `outbox.maxAttempts`; on cap the row flips to
--     status='FAILED' and stops being polled.
--   * lastError  TEXT NULL                — most recent failure message,
--     stored for triage so an operator can see why the row is stuck
--     without grepping logs.
--
-- Idempotent per DM-R-11 norm: each ALTER guarded with IF NOT EXISTS so
-- a partial earlier run is safe to re-apply.
--
-- Classification: REVERSIBLE.

ALTER TABLE "OutboxEvent"
  ADD COLUMN IF NOT EXISTS "attempts"  INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OutboxEvent"
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;
