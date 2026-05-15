-- F-6.1 rollback — drops the 16 FK indexes.
DROP INDEX IF EXISTS "ProjectRisk_convertedFromRiskId_idx";
DROP INDEX IF EXISTS "ProjectRetrospective_facilitatedByPersonId_idx";
DROP INDEX IF EXISTS "EmploymentEvent_recordedByPersonId_idx";
DROP INDEX IF EXISTS "BudgetApproval_decidedByPersonId_idx";
DROP INDEX IF EXISTS "Client_accountManagerPersonId_idx";
DROP INDEX IF EXISTS "OvertimeException_caseRecordId_idx";
DROP INDEX IF EXISTS "OvertimePolicy_setByPersonId_idx";
DROP INDEX IF EXISTS "PersonSkill_skillId_idx";
DROP INDEX IF EXISTS "RateCard_currencyCode_idx";
DROP INDEX IF EXISTS "NotificationRequest_channelId_idx";
DROP INDEX IF EXISTS "CaseType_workflowDefinitionId_idx";
DROP INDEX IF EXISTS "ProjectAssignment_appliedRateCardEntryId_idx";
DROP INDEX IF EXISTS "ExternalAccountLink_personId_idx";
DROP INDEX IF EXISTS "ProjectActivationApproval_decidedById_idx";
DROP INDEX IF EXISTS "ProjectActivationApproval_requestedById_idx";
DROP INDEX IF EXISTS "PersonReleaseRequest_initiatedByPersonId_idx";
