DROP INDEX IF EXISTS "CaseRecord_tenantId_caseNumber_key";
DROP INDEX IF EXISTS "ProjectAssignment_tenantId_assignmentCode_key";
DROP INDEX IF EXISTS "Project_tenantId_projectCode_key";
DROP INDEX IF EXISTS "OrgUnit_tenantId_code_key";
DROP INDEX IF EXISTS "Person_tenantId_primaryEmail_key";
DROP INDEX IF EXISTS "Person_tenantId_personNumber_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CaseRecord_caseNumber_key" ON "CaseRecord" ("caseNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectAssignment_assignmentCode_key" ON "ProjectAssignment" ("assignmentCode") WHERE "assignmentCode" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Project_projectCode_key" ON "Project" ("projectCode");
CREATE UNIQUE INDEX IF NOT EXISTS "OrgUnit_code_key" ON "OrgUnit" (code);
CREATE UNIQUE INDEX IF NOT EXISTS "Person_primaryEmail_key" ON "Person" ("primaryEmail") WHERE "primaryEmail" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Person_personNumber_key" ON "Person" ("personNumber") WHERE "personNumber" IS NOT NULL;

DROP INDEX IF EXISTS "ProjectAssignment_tenantId_idx";
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAssignment_tenantId_fkey') THEN
    ALTER TABLE "ProjectAssignment" DROP CONSTRAINT "ProjectAssignment_tenantId_fkey";
  END IF;
END $$;
ALTER TABLE "ProjectAssignment" DROP COLUMN IF EXISTS "tenantId";
