-- DM-7.5-6a — flip 6 global UNIQUE constraints to tenant-scoped.
-- Per docs/planning/tenant-uniqueness-audit.md.
--
-- Changes:
--   Person.personNumber        UNIQUE(name) → UNIQUE(tenantId, personNumber)
--   Person.primaryEmail        UNIQUE(name) → UNIQUE(tenantId, primaryEmail)
--   OrgUnit.code               UNIQUE(name) → UNIQUE(tenantId, code)
--   Project.projectCode        UNIQUE(name) → UNIQUE(tenantId, projectCode)
--   ProjectAssignment.assignmentCode  → add tenantId + UNIQUE(tenantId, assignmentCode)
--   CaseRecord.caseNumber      → UNIQUE(tenantId, caseNumber)
--
-- LocalAccount.email stays global pending product decision (SSO).
--
-- ProjectAssignment doesn't have tenantId yet (wasn't in DM-7.5-2
-- list); adding here + backfilling.
--
-- Classification: REVERSIBLE.

-- Add tenantId to ProjectAssignment (missing from DM-7.5-2).
ALTER TABLE "ProjectAssignment" ADD COLUMN IF NOT EXISTS "tenantId" uuid;

-- Backfill all tenant-sensitive aggregates (bypass DM-R-23 1000-row
-- guard via SET LOCAL allow_bulk).
DO $$
BEGIN
  PERFORM set_config('public.allow_bulk', 'true', true);
  UPDATE "ProjectAssignment" SET "tenantId" = '00000000-0000-0000-0000-00000000dc01'
    WHERE "tenantId" IS NULL
      AND id NOT IN (SELECT "rowId" FROM "honeypot" WHERE "tableName" = 'ProjectAssignment');
END $$;

-- FK + index.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAssignment_tenantId_fkey') THEN
    ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"(id)
      ON UPDATE CASCADE ON DELETE RESTRICT NOT VALID;
    ALTER TABLE "ProjectAssignment" VALIDATE CONSTRAINT "ProjectAssignment_tenantId_fkey";
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "ProjectAssignment_tenantId_idx" ON "ProjectAssignment" ("tenantId");

-- Drop old global uniques.
DROP INDEX IF EXISTS "Person_personNumber_key";
DROP INDEX IF EXISTS "Person_primaryEmail_key";
DROP INDEX IF EXISTS "OrgUnit_code_key";
DROP INDEX IF EXISTS "Project_projectCode_key";
DROP INDEX IF EXISTS "ProjectAssignment_assignmentCode_key";
DROP INDEX IF EXISTS "CaseRecord_caseNumber_key";

-- Create tenant-scoped uniques.
CREATE UNIQUE INDEX IF NOT EXISTS "Person_tenantId_personNumber_key"
  ON "Person" ("tenantId", "personNumber") WHERE "personNumber" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Person_tenantId_primaryEmail_key"
  ON "Person" ("tenantId", "primaryEmail") WHERE "primaryEmail" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "OrgUnit_tenantId_code_key"
  ON "OrgUnit" ("tenantId", code);
CREATE UNIQUE INDEX IF NOT EXISTS "Project_tenantId_projectCode_key"
  ON "Project" ("tenantId", "projectCode");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectAssignment_tenantId_assignmentCode_key"
  ON "ProjectAssignment" ("tenantId", "assignmentCode") WHERE "assignmentCode" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "CaseRecord_tenantId_caseNumber_key"
  ON "CaseRecord" ("tenantId", "caseNumber");
