-- Rollback for F-70 / D-103 round 25 — PersonOrgMembership + ReportingLine actor-audit
--
-- Drops the four FK indexes, the four FK constraints, and the four
-- actor-audit columns added by migration.sql. Safe to run on a DB
-- where the columns are present; idempotent (IF EXISTS).

DROP INDEX IF EXISTS "ReportingLine_updatedByPersonId_idx";
DROP INDEX IF EXISTS "ReportingLine_createdByPersonId_idx";
DROP INDEX IF EXISTS "PersonOrgMembership_updatedByPersonId_idx";
DROP INDEX IF EXISTS "PersonOrgMembership_createdByPersonId_idx";

ALTER TABLE "ReportingLine"
  DROP CONSTRAINT IF EXISTS "ReportingLine_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "ReportingLine_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "PersonOrgMembership"
  DROP CONSTRAINT IF EXISTS "PersonOrgMembership_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "PersonOrgMembership_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
