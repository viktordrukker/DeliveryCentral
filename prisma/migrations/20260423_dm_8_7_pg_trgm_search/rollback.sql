-- DM-8-7 rollback.
DROP INDEX IF EXISTS "Person_displayName_trgm_idx";
DROP INDEX IF EXISTS "CaseRecord_summary_trgm_idx";
DROP INDEX IF EXISTS "project_risks_title_trgm_idx";
DROP INDEX IF EXISTS "Project_name_trgm_idx";
-- Keep the pg_trgm extension — other future indexes may depend on it.
-- To fully revert: DROP EXTENSION pg_trgm;
