-- DM-6a-4/5/6 — bundled domain model additions.
--
-- Adds three new aggregates:
--
--   1. `Contact`            (per-Person; email/phone/address)
--   2. `EmploymentEvent`    (per-Person; hire/terminate/leave/rehire)
--   3. `ProjectRetrospective` (1:1 with Project)
--
-- No data migration: `Project.outcomeRating`, `Project.lessonsLearned`,
-- `Project.wouldStaffSameWay` are currently all NULL across the dev
-- DB (verified). DM-6b-1 will drop the columns in a follow-up release
-- after callers switch to ProjectRetrospective.
--
-- Classification: REVERSIBLE.

-- ==================== Contact =================================
CREATE TYPE "ContactKind" AS ENUM ('EMAIL', 'PHONE', 'ADDRESS');

CREATE TABLE IF NOT EXISTS "contacts" (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "personId"  uuid        NOT NULL,
  kind        "ContactKind" NOT NULL,
  label       text        NOT NULL,      -- 'work', 'mobile', 'home', 'emergency', ...
  value       text        NOT NULL,      -- email / phone / freeform address
  "isPrimary" boolean     NOT NULL DEFAULT false,
  verified    boolean     NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "contacts_personId_fkey" FOREIGN KEY ("personId")
    REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "contacts_personId_idx" ON "contacts" ("personId");
CREATE INDEX IF NOT EXISTS "contacts_kind_idx" ON "contacts" (kind);
-- At most one primary per (person, kind).
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_person_kind_primary_idx"
  ON "contacts" ("personId", kind) WHERE "isPrimary" = true;

-- ==================== EmploymentEvent ==========================
CREATE TYPE "EmploymentEventKind" AS ENUM ('HIRE', 'TERMINATE', 'LEAVE_START', 'LEAVE_END', 'REHIRE');

CREATE TABLE IF NOT EXISTS "employment_events" (
  id             uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  "personId"     uuid                 NOT NULL,
  kind           "EmploymentEventKind" NOT NULL,
  "occurredOn"   date                 NOT NULL,
  reason         text,
  "recordedByPersonId" uuid,
  "createdAt"    timestamptz          NOT NULL DEFAULT NOW(),
  CONSTRAINT "employment_events_personId_fkey" FOREIGN KEY ("personId")
    REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "employment_events_recordedByPersonId_fkey" FOREIGN KEY ("recordedByPersonId")
    REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "employment_events_personId_occurredOn_idx"
  ON "employment_events" ("personId", "occurredOn");
CREATE INDEX IF NOT EXISTS "employment_events_kind_idx" ON "employment_events" (kind);

-- ==================== ProjectRetrospective =====================
CREATE TABLE IF NOT EXISTS "project_retrospectives" (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId"           uuid        NOT NULL UNIQUE,
  "outcomeRating"       text,
  "lessonsLearned"      text,
  "wouldStaffSameWay"   boolean,
  "retrospectiveDate"   date,
  "facilitatedByPersonId" uuid,
  "createdAt"           timestamptz NOT NULL DEFAULT NOW(),
  "updatedAt"           timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "project_retrospectives_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "project_retrospectives_facilitatedByPersonId_fkey" FOREIGN KEY ("facilitatedByPersonId")
    REFERENCES "Person"(id) ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "project_retrospectives_projectId_idx"
  ON "project_retrospectives" ("projectId");
