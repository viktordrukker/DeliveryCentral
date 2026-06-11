-- W1-07 / W1-08 — publicId foundation for 5 aggregate roots.
--
-- Adds opaque tenant-scoped publicId on 5 aggregate roots that were still
-- exposing raw UUIDs in URLs and DTOs. This is the cross-cutting prerequisite
-- for every UUID_LEAK fix (Wave 1 G-L) that flips FE routing to publicId.
--
-- ProjectPosition + LeaveRequest already carry publicId from prior work
-- (see 20260523_lean_staffing_expand_project_position + 20260418_dm2_expand_leave_requests).
--
-- Aggregate prefixes:
--   Person      → usr_
--   Project     → prj_
--   OrgUnit     → org_
--   Client      → cli_
--   CaseRecord  → case_
--
-- Idempotent (IF NOT EXISTS / DO-EXCEPTION). REVERSIBLE — rollback drops the
-- columns, indexes, triggers, and trigger functions; no data loss because the
-- columns are still backed by the canonical `id` UUID.
--
-- Honeypot rows (DM-R-31) are excluded from the UPDATE backfill via the
-- explicit `WHERE id NOT IN (SELECT "rowId" FROM "honeypot" ...)` clause so
-- the BEFORE UPDATE tripwire trigger does not fire on this backfill.
--
-- Derivation is substr(md5(id::text), 1, 12) — NOT the first 12 hex chars of
-- the UUID itself. Seed profiles use patterned UUIDs (e.g. every it-company
-- Person id = bbbb0001-0000-0000-0000-XXXXXXXXXXXX) whose prefix-12 is
-- identical across all rows, which made the original uuid-prefix derivation
-- collide on the unique index. md5 of the full UUID text is deterministic
-- and collision-proof for distinct ids.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- =====================================================================
-- Person — prefix `usr_`
-- =====================================================================
ALTER TABLE "Person" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "Person"
SET "publicId" = 'usr_' || substr(md5("id"::text), 1, 12)
WHERE "publicId" IS NULL
  AND "id" NOT IN (SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'Person');

CREATE UNIQUE INDEX IF NOT EXISTS "Person_publicId_key" ON "Person" ("publicId");

CREATE OR REPLACE FUNCTION "Person_publicid_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'usr_' || substr(md5(NEW."id"::text), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Person_publicid_dualmaintain" ON "Person";
CREATE TRIGGER "Person_publicid_dualmaintain"
BEFORE INSERT ON "Person"
FOR EACH ROW EXECUTE FUNCTION "Person_publicid_dualmaintain"();

-- =====================================================================
-- Project — prefix `prj_`
-- =====================================================================
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "Project"
SET "publicId" = 'prj_' || substr(md5("id"::text), 1, 12)
WHERE "publicId" IS NULL
  AND "id" NOT IN (SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'Project');

CREATE UNIQUE INDEX IF NOT EXISTS "Project_publicId_key" ON "Project" ("publicId");

CREATE OR REPLACE FUNCTION "Project_publicid_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'prj_' || substr(md5(NEW."id"::text), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "Project_publicid_dualmaintain" ON "Project";
CREATE TRIGGER "Project_publicid_dualmaintain"
BEFORE INSERT ON "Project"
FOR EACH ROW EXECUTE FUNCTION "Project_publicid_dualmaintain"();

-- =====================================================================
-- OrgUnit — prefix `org_`
-- =====================================================================
ALTER TABLE "OrgUnit" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "OrgUnit"
SET "publicId" = 'org_' || substr(md5("id"::text), 1, 12)
WHERE "publicId" IS NULL
  AND "id" NOT IN (SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'OrgUnit');

CREATE UNIQUE INDEX IF NOT EXISTS "OrgUnit_publicId_key" ON "OrgUnit" ("publicId");

CREATE OR REPLACE FUNCTION "OrgUnit_publicid_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'org_' || substr(md5(NEW."id"::text), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "OrgUnit_publicid_dualmaintain" ON "OrgUnit";
CREATE TRIGGER "OrgUnit_publicid_dualmaintain"
BEFORE INSERT ON "OrgUnit"
FOR EACH ROW EXECUTE FUNCTION "OrgUnit_publicid_dualmaintain"();

-- =====================================================================
-- Client — prefix `cli_`
-- =====================================================================
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "clients"
SET "publicId" = 'cli_' || substr(md5("id"::text), 1, 12)
WHERE "publicId" IS NULL
  AND "id" NOT IN (SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'clients');

CREATE UNIQUE INDEX IF NOT EXISTS "clients_publicId_key" ON "clients" ("publicId");

CREATE OR REPLACE FUNCTION "clients_publicid_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'cli_' || substr(md5(NEW."id"::text), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "clients_publicid_dualmaintain" ON "clients";
CREATE TRIGGER "clients_publicid_dualmaintain"
BEFORE INSERT ON "clients"
FOR EACH ROW EXECUTE FUNCTION "clients_publicid_dualmaintain"();

-- =====================================================================
-- CaseRecord — prefix `case_`
-- =====================================================================
ALTER TABLE "CaseRecord" ADD COLUMN IF NOT EXISTS "publicId" varchar(32);

UPDATE "CaseRecord"
SET "publicId" = 'case_' || substr(md5("id"::text), 1, 12)
WHERE "publicId" IS NULL
  AND "id" NOT IN (SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'CaseRecord');

CREATE UNIQUE INDEX IF NOT EXISTS "CaseRecord_publicId_key" ON "CaseRecord" ("publicId");

CREATE OR REPLACE FUNCTION "CaseRecord_publicid_dualmaintain"() RETURNS trigger AS $$
BEGIN
  IF NEW."publicId" IS NULL THEN
    NEW."publicId" := 'case_' || substr(md5(NEW."id"::text), 1, 12);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "CaseRecord_publicid_dualmaintain" ON "CaseRecord";
CREATE TRIGGER "CaseRecord_publicid_dualmaintain"
BEFORE INSERT ON "CaseRecord"
FOR EACH ROW EXECUTE FUNCTION "CaseRecord_publicid_dualmaintain"();

-- =====================================================================
-- Audit
-- =====================================================================
INSERT INTO "AuditLog" ("id", "aggregateType", "aggregateId", "eventName", "payload", "createdAt")
VALUES (
  gen_random_uuid(), 'Migration', gen_random_uuid(), 'W1-publicId-foundation',
  jsonb_build_object(
    'migration', '20260607_publicid_foundation',
    'phase', 'expand',
    'tablesAdded', jsonb_build_array('Person', 'Project', 'OrgUnit', 'clients', 'CaseRecord'),
    'columnsAdded', jsonb_build_array('publicId'),
    'triggersAdded', jsonb_build_array(
      'Person_publicid_dualmaintain',
      'Project_publicid_dualmaintain',
      'OrgUnit_publicid_dualmaintain',
      'clients_publicid_dualmaintain',
      'CaseRecord_publicid_dualmaintain'
    ),
    'prefixes', jsonb_build_object(
      'Person', 'usr_',
      'Project', 'prj_',
      'OrgUnit', 'org_',
      'Client', 'cli_',
      'CaseRecord', 'case_'
    )
  ),
  NOW()
);
