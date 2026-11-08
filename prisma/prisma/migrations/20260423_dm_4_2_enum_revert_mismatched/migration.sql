-- DM-4-2 rollforward — revert 5 enum promotions whose declared labels
-- do not match the values written by existing production code.
--
-- The batch-2 / batch-4 enum promotions were built from DB-snapshot
-- values (most had 0 rows). Some domain values live only in code paths
-- not exercised by seed/dev data. When those code paths fire in
-- production, the Prisma INSERT would blow up with "invalid input
-- value for enum".
--
-- Specific mismatches discovered 2026-04-23 (all target tables have 0
-- rows — safe to revert):
--
--   EmployeeActivityEvent.eventType
--     enum had: HIRED/TERMINATED/ROLE_CHANGED/GRADE_CHANGED/...
--     code writes: ASSIGNED, UNASSIGNED, DEACTIVATED, HIRED, TERMINATED
--
--   PersonExternalIdentityLink.matchedByStrategy
--     enum had: EMAIL/USER_PRINCIPAL_NAME/DISPLAY_NAME/EMPLOYEE_NUMBER/MANUAL
--     code writes: 'created_new'
--
--   timesheet_entries.benchCategory
--     enum had: AVAILABLE/TRAINING/INTERNAL_PROJECT/SICK/OTHER
--     code writes: 'BENCH-EDU', 'BENCH-ADM'  (dashed labels — not typical enum style)
--
--   overtime_policies.approvalStatus
--     enum had: PENDING/APPROVED/REJECTED/EXPIRED
--     code writes: 'ACTIVE'
--
--   IntegrationSyncState.resourceType
--     enum had: accounts/directory
--     code writes: 'projects' (jira) in addition
--
-- Action: revert each to `text`. Drop the 5 enum types. Proper
-- enum promotion is deferred until product defines the canonical
-- label set AND callers are migrated.
--
-- Also reverts PersonExternalIdentityLink.matchedByStrategy ALTERation
-- in schema.prisma (done in the accompanying schema edit).
--
-- Classification: REVERSIBLE (re-applying the original promotion
-- migration restores the enum; data loss risk = zero because all
-- affected tables are empty).

ALTER TABLE "EmployeeActivityEvent"
  ALTER COLUMN "eventType" TYPE text USING "eventType"::text;
DROP TYPE IF EXISTS "EmployeeActivityEventType";

ALTER TABLE "PersonExternalIdentityLink"
  ALTER COLUMN "matchedByStrategy" TYPE text USING "matchedByStrategy"::text;
DROP TYPE IF EXISTS "IdentityMatchStrategy";

ALTER TABLE "timesheet_entries"
  ALTER COLUMN "benchCategory" TYPE text USING "benchCategory"::text;
DROP TYPE IF EXISTS "BenchCategory";

ALTER TABLE "overtime_policies" ALTER COLUMN "approvalStatus" DROP DEFAULT;
ALTER TABLE "overtime_policies"
  ALTER COLUMN "approvalStatus" TYPE text USING "approvalStatus"::text;
ALTER TABLE "overtime_policies" ALTER COLUMN "approvalStatus" SET DEFAULT 'ACTIVE';
DROP TYPE IF EXISTS "OvertimeApprovalStatus";

ALTER TABLE "IntegrationSyncState"
  ALTER COLUMN "resourceType" TYPE text USING "resourceType"::text;
DROP TYPE IF EXISTS "IntegrationSyncResourceType";
