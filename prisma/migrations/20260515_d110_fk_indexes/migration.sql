-- F-6.1 / D-110 — Add 16 missing FK indexes.
--
-- Postgres does NOT auto-index foreign-key columns (unlike SQL Server).
-- Each FK in our schema needs an explicit single-column index so JOINs
-- against the referenced table and `WHERE <fk>=?` filters use an index
-- scan rather than a sequential scan. CREATE INDEX IF NOT EXISTS makes
-- the migration idempotent.
--
-- Table names below match the `@@map(…)` mappings in prisma/schema.prisma
-- (snake_case plural for newer models, PascalCase for legacy models).
--
-- Forward: 16 indexes.
-- Rollback: see rollback.sql — each DROP INDEX IF EXISTS is independent.

CREATE INDEX IF NOT EXISTS "person_release_requests_initiatedByPersonId_idx"
  ON "person_release_requests" ("initiatedByPersonId");

CREATE INDEX IF NOT EXISTS "project_activation_approvals_requestedById_idx"
  ON "project_activation_approvals" ("requestedById");

CREATE INDEX IF NOT EXISTS "project_activation_approvals_decidedById_idx"
  ON "project_activation_approvals" ("decidedById");

CREATE INDEX IF NOT EXISTS "ExternalAccountLink_personId_idx"
  ON "ExternalAccountLink" ("personId");

CREATE INDEX IF NOT EXISTS "ProjectAssignment_appliedRateCardEntryId_idx"
  ON "ProjectAssignment" ("appliedRateCardEntryId");

CREATE INDEX IF NOT EXISTS "CaseType_workflowDefinitionId_idx"
  ON "CaseType" ("workflowDefinitionId");

CREATE INDEX IF NOT EXISTS "NotificationRequest_channelId_idx"
  ON "NotificationRequest" ("channelId");

CREATE INDEX IF NOT EXISTS "rate_cards_currencyCode_idx"
  ON "rate_cards" ("currencyCode");

CREATE INDEX IF NOT EXISTS "person_skills_skillId_idx"
  ON "person_skills" ("skillId");

CREATE INDEX IF NOT EXISTS "overtime_policies_setByPersonId_idx"
  ON "overtime_policies" ("setByPersonId");

CREATE INDEX IF NOT EXISTS "overtime_exceptions_caseRecordId_idx"
  ON "overtime_exceptions" ("caseRecordId");

CREATE INDEX IF NOT EXISTS "clients_accountManagerPersonId_idx"
  ON "clients" ("accountManagerPersonId");

CREATE INDEX IF NOT EXISTS "budget_approvals_decidedByPersonId_idx"
  ON "budget_approvals" ("decidedByPersonId");

CREATE INDEX IF NOT EXISTS "employment_events_recordedByPersonId_idx"
  ON "employment_events" ("recordedByPersonId");

CREATE INDEX IF NOT EXISTS "project_retrospectives_facilitatedByPersonId_idx"
  ON "project_retrospectives" ("facilitatedByPersonId");

CREATE INDEX IF NOT EXISTS "project_risks_convertedFromRiskId_idx"
  ON "project_risks" ("convertedFromRiskId");
