-- HD-0.4 — Idempotency key store.
-- Front-door cache for opt-in write requests (Idempotency-Key header).
-- Concurrent duplicates hit the unique index; replay of COMPLETED rows
-- happens at the interceptor layer.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdempotencyKeyStatus') THEN
    CREATE TYPE "IdempotencyKeyStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "idempotency_keys" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "idempotency_key"  TEXT NOT NULL,
  "method"           TEXT NOT NULL,
  "path"             TEXT NOT NULL,
  "actor_id"         UUID,
  "request_hash"     TEXT NOT NULL,
  "status"           "IdempotencyKeyStatus" NOT NULL DEFAULT 'PENDING',
  "response_status"  INTEGER,
  "response_body"    JSONB,
  "created_at"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at"     TIMESTAMPTZ(3),
  "expires_at"       TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_idempotency_key_actor_route"
  ON "idempotency_keys" ("idempotency_key", "method", "path", "actor_id");

CREATE INDEX IF NOT EXISTS "idx_idempotency_key_expires_at"
  ON "idempotency_keys" ("expires_at");
