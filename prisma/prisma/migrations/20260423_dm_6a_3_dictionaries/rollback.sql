DROP INDEX IF EXISTS "Project_projectTypeId_idx";
DROP INDEX IF EXISTS "Project_domainId_idx";
DROP INDEX IF EXISTS "Person_locationId_idx";
DROP INDEX IF EXISTS "Person_jobRoleId_idx";
DROP INDEX IF EXISTS "Person_gradeId_idx";

ALTER TABLE "Project" DROP COLUMN IF EXISTS "projectTypeId";
ALTER TABLE "Project" DROP COLUMN IF EXISTS "domainId";
ALTER TABLE "Person"  DROP COLUMN IF EXISTS "locationId";
ALTER TABLE "Person"  DROP COLUMN IF EXISTS "jobRoleId";
ALTER TABLE "Person"  DROP COLUMN IF EXISTS "gradeId";

DROP TABLE IF EXISTS "project_types";
DROP TABLE IF EXISTS "project_domains";
DROP TABLE IF EXISTS "locations";
DROP TABLE IF EXISTS "job_roles";
DROP TABLE IF EXISTS "grades";
