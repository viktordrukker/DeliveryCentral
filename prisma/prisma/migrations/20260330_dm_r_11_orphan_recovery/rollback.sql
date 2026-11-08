-- DM-R-11 — orphan-recovery migration: rollback.
--
-- Symmetric inverse of `migration.sql`. Drops the 6 tables and 4 enums
-- that the recovery migration installs. All statements are idempotent
-- (`IF EXISTS`). Tables are dropped before enums because the latter are
-- referenced by columns in the former.
--
-- This rollback is destructive: it drops every row in each of the 6
-- tables. Only run it after confirming no production data depends on
-- them — in practice, that means *only* on a freshly-restored or
-- ephemeral DB.

DROP TABLE IF EXISTS "Tenant"                     CASCADE;
DROP TABLE IF EXISTS "radiator_threshold_configs" CASCADE;
DROP TABLE IF EXISTS "project_radiator_overrides" CASCADE;
DROP TABLE IF EXISTS "project_change_requests"    CASCADE;
DROP TABLE IF EXISTS "project_vendor_engagements" CASCADE;
DROP TABLE IF EXISTS "project_role_plans"         CASCADE;
DROP TABLE IF EXISTS "project_rag_snapshots"      CASCADE;
DROP TABLE IF EXISTS "vendors"                    CASCADE;
DROP TABLE IF EXISTS "clients"                    CASCADE;
DROP TABLE IF EXISTS "EmployeeActivityEvent"      CASCADE;

DROP TYPE IF EXISTS "ThresholdDirection";
DROP TYPE IF EXISTS "ChangeRequestSeverity";
DROP TYPE IF EXISTS "ChangeRequestStatus";
DROP TYPE IF EXISTS "VendorEngagementStatus";
DROP TYPE IF EXISTS "VendorContractType";
DROP TYPE IF EXISTS "RolePlanSource";
DROP TYPE IF EXISTS "RagRating";
