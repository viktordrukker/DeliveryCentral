-- DM-7-6 — AggregateType enum at the DB layer.
--
-- Binds the polymorphic `aggregateType` column on AuditLog and
-- DomainEvent to a fixed whitelist. Matches the TS `AggregateType`
-- enum in src/infrastructure/public-id/aggregate-type.ts — keep
-- the two lists in sync.
--
-- Known existing values in dev DB: "Person" (audit smoke), "Migration"
-- (DM-R-22 rebuild). `Migration` is a meta value we add to the enum
-- to cover cross-cutting events not tied to a business aggregate.
--
-- Trigger-based `entityId` existence validation is deferred — Postgres
-- cannot cheaply know which table to JOIN from an enum value alone.
-- That constraint is DM-7-6b: a lookup table mapping AggregateType →
-- physical table, plus a trigger that does a dynamic-SQL existence
-- check. Shipping the enum alone already collapses the typo surface.
--
-- Classification: REVERSIBLE.

CREATE TYPE "AggregateType" AS ENUM (
  'Person',
  'Tenant',
  'Project',
  'Client',
  'Vendor',
  'OrgUnit',
  'ResourcePool',
  'ProjectAssignment',
  'StaffingRequest',
  'CaseRecord',
  'TimesheetWeek',
  'LeaveRequest',
  'Notification',
  'DomainEvent',
  'Skill',
  'PeriodLock',
  'PersonCostRate',
  'ProjectBudget',
  'ProjectRisk',
  'ProjectRagSnapshot',
  'EmploymentEvent',
  'Contact',
  'BudgetApproval',
  'Migration'
);

-- The `domain_outbox_pending` view (DM-7-3) selects aggregateType, so
-- Postgres blocks ALTER TABLE. Drop the view, alter, recreate.
-- DM-R-11 (2026-05-01): also drop `employee_activity_view` (DM-7-4)
-- whose WHERE clause references `aggregateType`. PG cannot ALTER a
-- column that any view depends on. Recreated below the ALTERs.
DROP VIEW IF EXISTS "employee_activity_view";
DROP VIEW IF EXISTS "domain_outbox_pending";

ALTER TABLE "AuditLog"
  ALTER COLUMN "aggregateType" TYPE "AggregateType"
  USING "aggregateType"::"AggregateType";

ALTER TABLE "DomainEvent"
  ALTER COLUMN "aggregateType" TYPE "AggregateType"
  USING "aggregateType"::"AggregateType";

-- Recreate the outbox view against the new column type.
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

-- DM-R-11: recreate `employee_activity_view` (was DROPped above).
CREATE OR REPLACE VIEW "employee_activity_view" AS
  SELECT
    id,
    "aggregateId"    AS "personId",
    "eventName"      AS "eventType",
    "createdAt"      AS "occurredAt",
    "actorId",
    COALESCE(payload ->> 'summary', '')  AS summary,
    NULLIF(payload ->> 'relatedEntityId', '')::uuid AS "relatedEntityId",
    payload          AS metadata,
    "createdAt"
  FROM "DomainEvent"
  WHERE "aggregateType" = 'Person';
