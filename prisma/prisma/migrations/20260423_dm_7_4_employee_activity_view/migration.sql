-- DM-7-4 — retire EmployeeActivityEvent (EAE) via a compatibility view.
--
-- EAE is a write-side audit for Person-scoped activity that duplicated
-- what DomainEvent now records authoritatively. EAE currently has 0
-- rows; existing callers (EmployeeActivityService) still use the
-- Prisma model.
--
-- Strategy: keep the EAE table as-is (EmployeeActivityService keeps
-- working) AND add a parallel read view `employee_activity_events` on
-- top of DomainEvent filtered to aggregateType='Person'. New queries
-- pull from the view; the old writes to the EAE table become DomainEvent
-- INSERTs in a follow-up. Once no code writes to EAE, DM-7-4b drops it.
--
-- View name doesn't collide with the table name — the table is PascalCase
-- (`"EmployeeActivityEvent"`), the view is snake_case.
--
-- Classification: REVERSIBLE.

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

COMMENT ON VIEW "employee_activity_view" IS
  'DM-7-4 — Person-scoped DomainEvent rows shaped as the legacy EmployeeActivityEvent. New read callers use this view; writes moving to DomainEvent in DM-7-4b follow-up.';
