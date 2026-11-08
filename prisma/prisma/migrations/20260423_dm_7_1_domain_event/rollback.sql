-- DM-7-1 rollback — drop DomainEvent and its default partition.

DROP TRIGGER IF EXISTS "dm_r_22_hash_chain_trigger" ON "DomainEvent";
DROP INDEX IF EXISTS "DomainEvent_unpublished_idx";
DROP INDEX IF EXISTS "DomainEvent_correlationId_idx";
DROP INDEX IF EXISTS "DomainEvent_eventName_idx";
DROP INDEX IF EXISTS "DomainEvent_createdAt_idx";
DROP INDEX IF EXISTS "DomainEvent_aggregate_idx";
DROP TABLE IF EXISTS "DomainEvent_default";
DROP TABLE IF EXISTS "DomainEvent";
