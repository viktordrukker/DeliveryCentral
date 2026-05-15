-- F-6.1 rollback — drops the 16 FK indexes.
DROP INDEX IF EXISTS "project_risks_convertedFromRiskId_idx";
DROP INDEX IF EXISTS "project_retrospectives_facilitatedByPersonId_idx";
DROP INDEX IF EXISTS "employment_events_recordedByPersonId_idx";
DROP INDEX IF EXISTS "budget_approvals_decidedByPersonId_idx";
DROP INDEX IF EXISTS "clients_accountManagerPersonId_idx";
DROP INDEX IF EXISTS "overtime_exceptions_caseRecordId_idx";
DROP INDEX IF EXISTS "overtime_policies_setByPersonId_idx";
DROP INDEX IF EXISTS "person_skills_skillId_idx";
DROP INDEX IF EXISTS "rate_cards_currencyCode_idx";
DROP INDEX IF EXISTS "NotificationRequest_channelId_idx";
DROP INDEX IF EXISTS "CaseType_workflowDefinitionId_idx";
DROP INDEX IF EXISTS "ProjectAssignment_appliedRateCardEntryId_idx";
DROP INDEX IF EXISTS "ExternalAccountLink_personId_idx";
DROP INDEX IF EXISTS "project_activation_approvals_decidedById_idx";
DROP INDEX IF EXISTS "project_activation_approvals_requestedById_idx";
DROP INDEX IF EXISTS "person_release_requests_initiatedByPersonId_idx";
