-- DM-4-2 batch 4 — promote the remaining string-typed fields to
-- enums. All target columns have ZERO rows today, so the enum set is
-- product-defined and safe to add. New values can be appended later
-- with `ALTER TYPE … ADD VALUE` per the DM-R-6 playbook.
--
-- Fields:
--   LocalAccount.source                             → LocalAccountSource
--   OutboxEvent.status                              → OutboxEventStatus
--   ExternalAccountLink.sourceType                  → ExternalAccountSourceType
--   ExternalAccountLink.accountPresenceState        → ExternalAccountPresenceState
--   OvertimePolicy.approvalStatus                   → OvertimeApprovalStatus
--   PersonExternalIdentityLink.matchedByStrategy    → IdentityMatchStrategy
--   TimesheetEntry.benchCategory                    → BenchCategory
--   EmployeeActivityEvent.eventType                 → EmployeeActivityEventType
--
-- Classification: REVERSIBLE.

-- LocalAccountSource: where the account came from (local form,
-- LDAP import, Azure AD SSO, etc.).
CREATE TYPE "LocalAccountSource" AS ENUM ('local', 'ldap', 'azure_ad', 'google', 'okta');
ALTER TABLE "LocalAccount" ALTER COLUMN source DROP DEFAULT;
ALTER TABLE "LocalAccount" ALTER COLUMN source TYPE "LocalAccountSource" USING source::"LocalAccountSource";
ALTER TABLE "LocalAccount" ALTER COLUMN source SET DEFAULT 'local'::"LocalAccountSource";

-- OutboxEventStatus: PENDING → PUBLISHED | FAILED.
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED', 'RETRY');
ALTER TABLE "OutboxEvent"
  ALTER COLUMN status DROP DEFAULT;
ALTER TABLE "OutboxEvent"
  ALTER COLUMN status TYPE "OutboxEventStatus" USING status::"OutboxEventStatus";
ALTER TABLE "OutboxEvent"
  ALTER COLUMN status SET DEFAULT 'PENDING'::"OutboxEventStatus";

-- ExternalAccountSourceType: where external accounts are pulled from.
CREATE TYPE "ExternalAccountSourceType" AS ENUM ('LDAP', 'AZURE_AD', 'GOOGLE_WORKSPACE', 'RADIUS', 'MANUAL');
ALTER TABLE "ExternalAccountLink"
  ALTER COLUMN "sourceType" TYPE "ExternalAccountSourceType" USING "sourceType"::"ExternalAccountSourceType";

-- ExternalAccountPresenceState: reconciliation status for linked accounts.
CREATE TYPE "ExternalAccountPresenceState" AS ENUM ('PRESENT', 'ABSENT', 'SUSPENDED', 'UNKNOWN');
ALTER TABLE "ExternalAccountLink"
  ALTER COLUMN "accountPresenceState" TYPE "ExternalAccountPresenceState" USING "accountPresenceState"::"ExternalAccountPresenceState";

-- OvertimeApprovalStatus: policy approval lifecycle.
CREATE TYPE "OvertimeApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
ALTER TABLE "overtime_policies" ALTER COLUMN "approvalStatus" DROP DEFAULT;
ALTER TABLE "overtime_policies"
  ALTER COLUMN "approvalStatus" TYPE "OvertimeApprovalStatus" USING "approvalStatus"::"OvertimeApprovalStatus";
ALTER TABLE "overtime_policies" ALTER COLUMN "approvalStatus" SET DEFAULT 'PENDING'::"OvertimeApprovalStatus";

-- IdentityMatchStrategy: how a Person was matched to an external user.
CREATE TYPE "IdentityMatchStrategy" AS ENUM ('EMAIL', 'USER_PRINCIPAL_NAME', 'DISPLAY_NAME', 'EMPLOYEE_NUMBER', 'MANUAL');
ALTER TABLE "PersonExternalIdentityLink"
  ALTER COLUMN "matchedByStrategy" TYPE "IdentityMatchStrategy" USING "matchedByStrategy"::"IdentityMatchStrategy";

-- BenchCategory: bench-time classification for timesheets.
CREATE TYPE "BenchCategory" AS ENUM ('AVAILABLE', 'TRAINING', 'INTERNAL_PROJECT', 'SICK', 'OTHER');
ALTER TABLE "timesheet_entries"
  ALTER COLUMN "benchCategory" TYPE "BenchCategory" USING "benchCategory"::"BenchCategory";

-- EmployeeActivityEventType: kinds of Person-scoped activity events.
-- Keeps door open to DM-7-4 retirement; the enum rides DomainEvent.eventName.
CREATE TYPE "EmployeeActivityEventType" AS ENUM (
  'HIRED', 'TERMINATED', 'ROLE_CHANGED', 'GRADE_CHANGED', 'ORG_CHANGED',
  'MANAGER_CHANGED', 'LOCATION_CHANGED', 'SKILL_ADDED', 'SKILL_REMOVED',
  'REHIRED', 'LEAVE_STARTED', 'LEAVE_ENDED', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED'
);
ALTER TABLE "EmployeeActivityEvent"
  ALTER COLUMN "eventType" TYPE "EmployeeActivityEventType" USING "eventType"::"EmployeeActivityEventType";
