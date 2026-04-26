-- DM-8-1 rollback.
ALTER TABLE "project_risks"       DROP COLUMN IF EXISTS "version";
ALTER TABLE "project_budgets"     DROP COLUMN IF EXISTS "version";
ALTER TABLE "staffing_requests"   DROP COLUMN IF EXISTS "version";
ALTER TABLE "leave_requests"      DROP COLUMN IF EXISTS "version";
ALTER TABLE "WorkEvidence"        DROP COLUMN IF EXISTS "version";
ALTER TABLE "CaseRecord"          DROP COLUMN IF EXISTS "version";
ALTER TABLE "OrgUnit"             DROP COLUMN IF EXISTS "version";
ALTER TABLE "Person"              DROP COLUMN IF EXISTS "version";
