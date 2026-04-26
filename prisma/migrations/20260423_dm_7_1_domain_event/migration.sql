-- DM-7-1 — `DomainEvent` partition-ready table.
--
-- One durable record per business mutation. Every aggregate write is
-- followed by an INSERT into DomainEvent within the same Prisma
-- $transaction (DM-7-2); this makes outbox delivery atomic with the
-- domain change — the root cause the original AuditLogger-writes-to-
-- memory findings pointed at.
--
-- Partition-ready: PARTITION BY RANGE (createdAt) with a single
-- "default" partition that catches all rows for now. When a table
-- crosses the 5M-row watermark we retro-split into monthly partitions
-- via ATTACH PARTITION (runbook in docs/planning/schema-conventions §J
-- — written against this exact shape).
--
-- Append-only via DM-R-20 grants + DM-R-22 hash chain (will extend).
--
-- Classification: REVERSIBLE.

CREATE TABLE IF NOT EXISTS "DomainEvent" (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  "aggregateType"   text        NOT NULL,
  "aggregateId"    uuid        NOT NULL,
  "eventName"       text        NOT NULL,
  "actorId"         uuid,
  "correlationId"   text,
  "causationId"     uuid,           -- points at the DomainEvent that caused this one, if any
  payload           jsonb       NOT NULL,
  "publishedAt"     timestamptz,    -- set by the outbox relay when the event is dispatched
  "createdAt"       timestamptz   NOT NULL DEFAULT NOW(),
  -- DM-R-22 hash chain columns; trigger installed below.
  "prevHash"        text,
  "rowHash"         text,
  "chainSeq"        bigserial    NOT NULL,
  -- Composite PK includes the partition key (createdAt) so declarative
  -- partitioning can split the table later without rewriting.
  PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- Default partition absorbs all rows until retro-split.
CREATE TABLE IF NOT EXISTS "DomainEvent_default" PARTITION OF "DomainEvent" DEFAULT;

CREATE INDEX IF NOT EXISTS "DomainEvent_aggregate_idx"      ON "DomainEvent" ("aggregateType", "aggregateId");
CREATE INDEX IF NOT EXISTS "DomainEvent_createdAt_idx"      ON "DomainEvent" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DomainEvent_eventName_idx"      ON "DomainEvent" ("eventName");
CREATE INDEX IF NOT EXISTS "DomainEvent_correlationId_idx"  ON "DomainEvent" ("correlationId")
  WHERE "correlationId" IS NOT NULL;
-- Outbox-relay hot path: unpublished rows by chainSeq.
CREATE INDEX IF NOT EXISTS "DomainEvent_unpublished_idx"    ON "DomainEvent" ("chainSeq")
  WHERE "publishedAt" IS NULL;

-- Extend DM-R-22 hash chain to cover DomainEvent.
DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "DomainEvent";
CREATE TRIGGER "dm_r_22_hash_chain_trigger"
  BEFORE INSERT ON "DomainEvent"
  FOR EACH ROW EXECUTE FUNCTION "dm_r_22_audit_hash_chain"('createdAt');

-- DM-R-20 append-only: app_runtime may INSERT + SELECT, never UPDATE/DELETE.
REVOKE UPDATE, DELETE ON "DomainEvent" FROM app_runtime;

-- DM-R-23 circuit breaker — hot table, same policy as AuditLog.
DROP TRIGGER IF EXISTS "dm_r_23_delete_guard" ON "DomainEvent";
DROP TRIGGER IF EXISTS "dm_r_23_update_guard" ON "DomainEvent";
-- We don't install mass-mutation triggers on DomainEvent because the
-- only legitimate UPDATE is the outbox relay setting publishedAt —
-- which legitimately may touch many rows at once.

COMMENT ON TABLE "DomainEvent" IS
  'DM-7-1 — durable transactional outbox. One row per business mutation, written inside the same $transaction as the aggregate change. Outbox relay consumes rows where publishedAt IS NULL and marks them.';
