ALTER TABLE "EmployeeActivityEvent" ALTER COLUMN "eventType" TYPE text USING "eventType"::text;
DROP TYPE IF EXISTS "EmployeeActivityEventType";

ALTER TABLE "timesheet_entries" ALTER COLUMN "benchCategory" TYPE text USING "benchCategory"::text;
DROP TYPE IF EXISTS "BenchCategory";

ALTER TABLE "PersonExternalIdentityLink" ALTER COLUMN "matchedByStrategy" TYPE text USING "matchedByStrategy"::text;
DROP TYPE IF EXISTS "IdentityMatchStrategy";

ALTER TABLE "overtime_policies" ALTER COLUMN "approvalStatus" TYPE text USING "approvalStatus"::text;
DROP TYPE IF EXISTS "OvertimeApprovalStatus";

ALTER TABLE "ExternalAccountLink" ALTER COLUMN "accountPresenceState" TYPE text USING "accountPresenceState"::text;
DROP TYPE IF EXISTS "ExternalAccountPresenceState";

ALTER TABLE "ExternalAccountLink" ALTER COLUMN "sourceType" TYPE text USING "sourceType"::text;
DROP TYPE IF EXISTS "ExternalAccountSourceType";

ALTER TABLE "OutboxEvent" ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "OutboxEvent" ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE "OutboxEvent" ALTER COLUMN status SET DEFAULT 'PENDING';
DROP TYPE IF EXISTS "OutboxEventStatus";

ALTER TABLE "LocalAccount" ALTER COLUMN source TYPE text USING source::text;
DROP TYPE IF EXISTS "LocalAccountSource";
