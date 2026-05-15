-- F-6.1 / D-110 — Add 16 missing FK indexes.
--
-- Postgres does NOT auto-index foreign-key columns (unlike SQL Server).
-- Each FK in our schema needs an explicit single-column index so JOINs
-- against the referenced table and `WHERE <fk>=?` filters use an index
-- scan rather than a sequential scan. CREATE INDEX IF NOT EXISTS makes
-- the migration idempotent.
--
-- Forward: 16 indexes.
-- Rollback: see rollback.sql — each DROP INDEX IF EXISTS is independent.

CREATE INDEX IF NOT EXISTS "PersonReleaseRequest_initiatedByPersonId_idx"
  ON "PersonReleaseRequest" ("initiatedByPersonId");

CREATE INDEX IF NOT EXISTS "ProjectActivationApproval_requestedById_idx"
  ON "ProjectActivationApproval" ("requestedById");

CREATE INDEX IF NOT EXISTS "ProjectActivationApproval_decidedById_idx"
  ON "ProjectActivationApproval" ("decidedById");

CREATE INDEX IF NOT EXISTS "ExternalAccountLink_personId_idx"
  ON "ExternalAccountLink" ("personId");

CREATE INDEX IF NOT EXISTS "ProjectAssignment_appliedRateCardEntryId_idx"
  ON "ProjectAssignment" ("appliedRateCardEntryId");

CREATE INDEX IF NOT EXISTS "CaseType_workflowDefinitionId_idx"
  ON "CaseType" ("workflowDefinitionId");

CREATE INDEX IF NOT EXISTS "NotificationRequest_channelId_idx"
  ON "NotificationRequest" ("channelId");

CREATE INDEX IF NOT EXISTS "RateCard_currencyCode_idx"
  ON "RateCard" ("currencyCode");

CREATE INDEX IF NOT EXISTS "PersonSkill_skillId_idx"
  ON "PersonSkill" ("skillId");

CREATE INDEX IF NOT EXISTS "OvertimePolicy_setByPersonId_idx"
  ON "OvertimePolicy" ("setByPersonId");

CREATE INDEX IF NOT EXISTS "OvertimeException_caseRecordId_idx"
  ON "OvertimeException" ("caseRecordId");

CREATE INDEX IF NOT EXISTS "Client_accountManagerPersonId_idx"
  ON "Client" ("accountManagerPersonId");

CREATE INDEX IF NOT EXISTS "BudgetApproval_decidedByPersonId_idx"
  ON "BudgetApproval" ("decidedByPersonId");

CREATE INDEX IF NOT EXISTS "EmploymentEvent_recordedByPersonId_idx"
  ON "EmploymentEvent" ("recordedByPersonId");

CREATE INDEX IF NOT EXISTS "ProjectRetrospective_facilitatedByPersonId_idx"
  ON "ProjectRetrospective" ("facilitatedByPersonId");

CREATE INDEX IF NOT EXISTS "ProjectRisk_convertedFromRiskId_idx"
  ON "ProjectRisk" ("convertedFromRiskId");
