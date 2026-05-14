-- F-5.7 / D-111 — AuditLog CHECK constraints.
--
-- Hardens the AuditLog stream against bad rows entering the hash chain.
-- Each constraint is added inside a `DO $$ ... duplicate_object` block
-- so the migration is idempotent (re-applying on a DB that already has
-- the constraint is a no-op).
--
-- Forward: 8 CHECK constraints on AuditLog.
-- Rollback: see rollback.sql — each DROP IF EXISTS is independent.

-- 1. eventName must be non-empty.
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_eventName_nonempty_check"
    CHECK (length("eventName") > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. eventName must be ≤ 256 chars.
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_eventName_maxlen_check"
    CHECK (length("eventName") <= 256);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. payload must be a JSON object (not array, scalar, or null).
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_payload_is_object_check"
    CHECK (jsonb_typeof("payload") = 'object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. createdAt cannot be more than 1 hour in the future (clock-skew guard).
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_createdAt_not_future_check"
    CHECK ("createdAt" <= now() + interval '1 hour');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. correlationId, when set, must be ≤ 256 chars.
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_correlationId_maxlen_check"
    CHECK ("correlationId" IS NULL OR length("correlationId") <= 256);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. prevHash, when set, must be a 64-char hex string (sha256 hex).
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_prevHash_shape_check"
    CHECK ("prevHash" IS NULL OR "prevHash" ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. rowHash, when set, must be a 64-char hex string (sha256 hex).
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_rowHash_shape_check"
    CHECK ("rowHash" IS NULL OR "rowHash" ~ '^[0-9a-f]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. chainSeq must be positive (Postgres bigserial starts at 1).
DO $$ BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_chainSeq_positive_check"
    CHECK ("chainSeq" > 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
