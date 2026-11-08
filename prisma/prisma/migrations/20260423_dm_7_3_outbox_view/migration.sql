-- DM-7-3 — outbox view over unpublished DomainEvent rows.
--
-- The original `OutboxEvent` table was supposed to be a separate write
-- target that duplicated the payload. That pattern lost atomicity with
-- the aggregate change. DM-7-1 made DomainEvent the durable event
-- spine; this migration adds a convenience VIEW for the relay worker
-- — one stable name to tail without needing to know DomainEvent's
-- partition layout.
--
-- Usage (relay worker):
--   SELECT * FROM domain_outbox_pending ORDER BY "chainSeq" LIMIT 100;
--   -- publish each row to the message bus, then
--   UPDATE "DomainEvent" SET "publishedAt" = NOW() WHERE id = $1 AND "createdAt" = $2;
--
-- OutboxEvent table is left in place (currently 0 rows, no writers in
-- code) but is no longer the outbox. A future migration will drop it.
--
-- Classification: REVERSIBLE.

CREATE OR REPLACE VIEW "domain_outbox_pending" AS
  SELECT
    id,
    "aggregateType",
    "aggregateId",
    "eventName",
    "actorId",
    "correlationId",
    "causationId",
    payload,
    "createdAt",
    "chainSeq"
  FROM "DomainEvent"
  WHERE "publishedAt" IS NULL
  ORDER BY "chainSeq" ASC;

COMMENT ON VIEW "domain_outbox_pending" IS
  'DM-7-3 — unpublished DomainEvent rows, ordered by chainSeq. Relay consumes in order + marks DomainEvent.publishedAt.';
