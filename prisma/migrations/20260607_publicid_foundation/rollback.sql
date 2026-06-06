-- Rollback for 20260607_publicid_foundation.
--
-- Drops the publicId columns + unique indexes + BEFORE-INSERT dual-maintain
-- triggers + trigger functions on the 5 aggregate roots wired by W1-07/W1-08.
-- Idempotent. No data loss — the canonical `id` UUID column remains untouched
-- on every table.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DROP TRIGGER IF EXISTS "CaseRecord_publicid_dualmaintain" ON "CaseRecord";
DROP FUNCTION IF EXISTS "CaseRecord_publicid_dualmaintain"();
DROP INDEX IF EXISTS "CaseRecord_publicId_key";
ALTER TABLE "CaseRecord" DROP COLUMN IF EXISTS "publicId";

DROP TRIGGER IF EXISTS "clients_publicid_dualmaintain" ON "clients";
DROP FUNCTION IF EXISTS "clients_publicid_dualmaintain"();
DROP INDEX IF EXISTS "clients_publicId_key";
ALTER TABLE "clients" DROP COLUMN IF EXISTS "publicId";

DROP TRIGGER IF EXISTS "OrgUnit_publicid_dualmaintain" ON "OrgUnit";
DROP FUNCTION IF EXISTS "OrgUnit_publicid_dualmaintain"();
DROP INDEX IF EXISTS "OrgUnit_publicId_key";
ALTER TABLE "OrgUnit" DROP COLUMN IF EXISTS "publicId";

DROP TRIGGER IF EXISTS "Project_publicid_dualmaintain" ON "Project";
DROP FUNCTION IF EXISTS "Project_publicid_dualmaintain"();
DROP INDEX IF EXISTS "Project_publicId_key";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "publicId";

DROP TRIGGER IF EXISTS "Person_publicid_dualmaintain" ON "Person";
DROP FUNCTION IF EXISTS "Person_publicid_dualmaintain"();
DROP INDEX IF EXISTS "Person_publicId_key";
ALTER TABLE "Person" DROP COLUMN IF EXISTS "publicId";
