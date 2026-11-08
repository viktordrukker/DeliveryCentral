-- DM-7-6 rollback.
ALTER TABLE "DomainEvent"
  ALTER COLUMN "aggregateType" TYPE text USING "aggregateType"::text;
ALTER TABLE "AuditLog"
  ALTER COLUMN "aggregateType" TYPE text USING "aggregateType"::text;
DROP TYPE IF EXISTS "AggregateType";
