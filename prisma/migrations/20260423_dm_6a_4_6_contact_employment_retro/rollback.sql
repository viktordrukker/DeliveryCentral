-- DM-6a-4/5/6 rollback.

DROP INDEX IF EXISTS "project_retrospectives_projectId_idx";
DROP TABLE IF EXISTS "project_retrospectives";

DROP INDEX IF EXISTS "employment_events_kind_idx";
DROP INDEX IF EXISTS "employment_events_personId_occurredOn_idx";
DROP TABLE IF EXISTS "employment_events";
DROP TYPE IF EXISTS "EmploymentEventKind";

DROP INDEX IF EXISTS "contacts_person_kind_primary_idx";
DROP INDEX IF EXISTS "contacts_kind_idx";
DROP INDEX IF EXISTS "contacts_personId_idx";
DROP TABLE IF EXISTS "contacts";
DROP TYPE IF EXISTS "ContactKind";
