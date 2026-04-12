-- CreateEnum
CREATE TYPE "PersonEmploymentStatus" AS ENUM ('ACTIVE', 'LEAVE', 'INACTIVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "OrgUnitStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportingLineType" AS ENUM ('SOLID_LINE', 'DOTTED_LINE', 'FUNCTIONAL', 'PROJECT');

-- CreateEnum
CREATE TYPE "ReportingAuthority" AS ENUM ('APPROVER', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'ENDED', 'REVOKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('REQUESTED', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkEvidenceStatus" AS ENUM ('CAPTURED', 'RECONCILED', 'IGNORED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CaseParticipantRole" AS ENUM ('SUBJECT', 'REQUESTER', 'APPROVER', 'REVIEWER', 'OBSERVER', 'OPERATOR');

-- CreateEnum
CREATE TYPE "MetadataDataType" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'JSON');

-- CreateEnum
CREATE TYPE "WorkflowDefinitionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('IDLE', 'RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "Person" (
    "id" UUID NOT NULL,
    "personNumber" TEXT,
    "givenName" TEXT NOT NULL,
    "familyName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "primaryEmail" TEXT,
    "employmentStatus" "PersonEmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "hiredAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrgUnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentOrgUnitId" UUID,
    "managerPersonId" UUID,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "occupantPersonId" UUID,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isManagerial" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonOrgMembership" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "orgUnitId" UUID NOT NULL,
    "positionId" UUID,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PersonOrgMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportingLine" (
    "id" UUID NOT NULL,
    "subjectPersonId" UUID NOT NULL,
    "managerPersonId" UUID NOT NULL,
    "relationshipType" "ReportingLineType" NOT NULL,
    "authority" "ReportingAuthority" NOT NULL DEFAULT 'VIEWER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ReportingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourcePool" (
    "id" UUID NOT NULL,
    "orgUnitId" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ResourcePool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonResourcePoolMembership" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "resourcePoolId" UUID NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PersonResourcePoolMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "startsOn" TIMESTAMP(3),
    "endsOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectExternalLink" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "connectionKey" TEXT,
    "externalProjectKey" TEXT NOT NULL,
    "externalProjectName" TEXT,
    "externalUrl" TEXT,
    "providerEnvironment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "ProjectExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalSyncState" (
    "id" UUID NOT NULL,
    "projectExternalLinkId" UUID NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessfulSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastPayloadFingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "requestedByPersonId" UUID,
    "assignmentCode" TEXT,
    "staffingRole" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "allocationPercent" DECIMAL(5,2),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentApproval" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "decidedByPersonId" UUID,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "decisionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentHistory" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "changedByPersonId" UUID,
    "changeType" TEXT NOT NULL,
    "changeReason" TEXT,
    "previousSnapshot" JSONB,
    "newSnapshot" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkEvidenceSource" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "connectionKey" TEXT,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "WorkEvidenceSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkEvidence" (
    "id" UUID NOT NULL,
    "workEvidenceSourceId" UUID NOT NULL,
    "personId" UUID,
    "projectId" UUID,
    "sourceRecordKey" TEXT NOT NULL,
    "evidenceType" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "occurredOn" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "status" "WorkEvidenceStatus" NOT NULL DEFAULT 'CAPTURED',
    "summary" TEXT,
    "details" JSONB,
    "trace" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "WorkEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkEvidenceLink" (
    "id" UUID NOT NULL,
    "workEvidenceId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "externalUrl" TEXT,
    "linkType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkEvidenceLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseType" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "workflowDefinitionId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CaseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseRecord" (
    "id" UUID NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "caseTypeId" UUID NOT NULL,
    "subjectPersonId" UUID NOT NULL,
    "ownerPersonId" UUID NOT NULL,
    "relatedProjectId" UUID,
    "relatedAssignmentId" UUID,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "summary" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CaseRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStep" (
    "id" UUID NOT NULL,
    "caseRecordId" UUID NOT NULL,
    "workflowStateDefinitionId" UUID,
    "stepKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToPersonId" UUID,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseParticipant" (
    "id" UUID NOT NULL,
    "caseRecordId" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "role" "CaseParticipantRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataDictionary" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "dictionaryKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "scopeOrgUnitId" UUID,
    "isSystemManaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "MetadataDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataEntry" (
    "id" UUID NOT NULL,
    "metadataDictionaryId" UUID NOT NULL,
    "entryKey" TEXT NOT NULL,
    "entryValue" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "MetadataEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "dataType" "MetadataDataType" NOT NULL,
    "metadataDictionaryId" UUID,
    "scopeOrgUnitId" UUID,
    "validationSchema" JSONB,
    "defaultValue" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldValue" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID NOT NULL,
    "customFieldDefinitionId" UUID NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "CustomFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "workflowKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowDefinitionStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowStateDefinition" (
    "id" UUID NOT NULL,
    "workflowDefinitionId" UUID NOT NULL,
    "stateKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 0,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "validationSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStateDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLayoutDefinition" (
    "id" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "layoutKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "scopeOrgUnitId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "layoutSchema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "EntityLayoutDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" UUID NOT NULL,
    "eventName" TEXT NOT NULL,
    "actorId" UUID,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" UUID NOT NULL,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncState" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "lastCursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastStatus" "SyncStatus" NOT NULL DEFAULT 'IDLE',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_personNumber_key" ON "Person"("personNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Person_primaryEmail_key" ON "Person"("primaryEmail");

-- CreateIndex
CREATE INDEX "Person_employmentStatus_archivedAt_idx" ON "Person"("employmentStatus", "archivedAt");

-- CreateIndex
CREATE INDEX "Person_familyName_givenName_idx" ON "Person"("familyName", "givenName");

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_code_key" ON "OrgUnit"("code");

-- CreateIndex
CREATE INDEX "OrgUnit_parentOrgUnitId_idx" ON "OrgUnit"("parentOrgUnitId");

-- CreateIndex
CREATE INDEX "OrgUnit_managerPersonId_idx" ON "OrgUnit"("managerPersonId");

-- CreateIndex
CREATE INDEX "OrgUnit_status_archivedAt_idx" ON "OrgUnit"("status", "archivedAt");

-- CreateIndex
CREATE INDEX "Position_occupantPersonId_idx" ON "Position"("occupantPersonId");

-- CreateIndex
CREATE INDEX "Position_orgUnitId_validFrom_validTo_idx" ON "Position"("orgUnitId", "validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "Position_orgUnitId_code_key" ON "Position"("orgUnitId", "code");

-- CreateIndex
CREATE INDEX "PersonOrgMembership_personId_validFrom_validTo_idx" ON "PersonOrgMembership"("personId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "PersonOrgMembership_orgUnitId_validFrom_validTo_idx" ON "PersonOrgMembership"("orgUnitId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "PersonOrgMembership_positionId_idx" ON "PersonOrgMembership"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonOrgMembership_personId_orgUnitId_validFrom_key" ON "PersonOrgMembership"("personId", "orgUnitId", "validFrom");

-- CreateIndex
CREATE INDEX "ReportingLine_subjectPersonId_relationshipType_validFrom_va_idx" ON "ReportingLine"("subjectPersonId", "relationshipType", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "ReportingLine_managerPersonId_relationshipType_validFrom_va_idx" ON "ReportingLine"("managerPersonId", "relationshipType", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "ReportingLine_isPrimary_validTo_idx" ON "ReportingLine"("isPrimary", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "ReportingLine_subjectPersonId_managerPersonId_relationshipT_key" ON "ReportingLine"("subjectPersonId", "managerPersonId", "relationshipType", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ResourcePool_code_key" ON "ResourcePool"("code");

-- CreateIndex
CREATE INDEX "ResourcePool_orgUnitId_idx" ON "ResourcePool"("orgUnitId");

-- CreateIndex
CREATE INDEX "ResourcePool_archivedAt_idx" ON "ResourcePool"("archivedAt");

-- CreateIndex
CREATE INDEX "PersonResourcePoolMembership_personId_validFrom_validTo_idx" ON "PersonResourcePoolMembership"("personId", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "PersonResourcePoolMembership_resourcePoolId_validFrom_valid_idx" ON "PersonResourcePoolMembership"("resourcePoolId", "validFrom", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "PersonResourcePoolMembership_personId_resourcePoolId_validF_key" ON "PersonResourcePoolMembership"("personId", "resourcePoolId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectCode_key" ON "Project"("projectCode");

-- CreateIndex
CREATE INDEX "Project_status_archivedAt_idx" ON "Project"("status", "archivedAt");

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "ProjectExternalLink_projectId_idx" ON "ProjectExternalLink"("projectId");

-- CreateIndex
CREATE INDEX "ProjectExternalLink_provider_archivedAt_idx" ON "ProjectExternalLink"("provider", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectExternalLink_provider_externalProjectKey_key" ON "ProjectExternalLink"("provider", "externalProjectKey");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalSyncState_projectExternalLinkId_key" ON "ExternalSyncState"("projectExternalLinkId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_assignmentCode_key" ON "ProjectAssignment"("assignmentCode");

-- CreateIndex
CREATE INDEX "ProjectAssignment_personId_status_validFrom_validTo_idx" ON "ProjectAssignment"("personId", "status", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "ProjectAssignment_projectId_status_validFrom_validTo_idx" ON "ProjectAssignment"("projectId", "status", "validFrom", "validTo");

-- CreateIndex
CREATE INDEX "ProjectAssignment_requestedByPersonId_idx" ON "ProjectAssignment"("requestedByPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_personId_projectId_validFrom_key" ON "ProjectAssignment"("personId", "projectId", "validFrom");

-- CreateIndex
CREATE INDEX "AssignmentApproval_assignmentId_decision_idx" ON "AssignmentApproval"("assignmentId", "decision");

-- CreateIndex
CREATE INDEX "AssignmentApproval_decidedByPersonId_idx" ON "AssignmentApproval"("decidedByPersonId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentApproval_assignmentId_sequenceNumber_key" ON "AssignmentApproval"("assignmentId", "sequenceNumber");

-- CreateIndex
CREATE INDEX "AssignmentHistory_assignmentId_occurredAt_idx" ON "AssignmentHistory"("assignmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "AssignmentHistory_changedByPersonId_idx" ON "AssignmentHistory"("changedByPersonId");

-- CreateIndex
CREATE INDEX "WorkEvidenceSource_provider_archivedAt_idx" ON "WorkEvidenceSource"("provider", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkEvidenceSource_provider_sourceType_connectionKey_key" ON "WorkEvidenceSource"("provider", "sourceType", "connectionKey");

-- CreateIndex
CREATE INDEX "WorkEvidence_personId_recordedAt_idx" ON "WorkEvidence"("personId", "recordedAt");

-- CreateIndex
CREATE INDEX "WorkEvidence_projectId_recordedAt_idx" ON "WorkEvidence"("projectId", "recordedAt");

-- CreateIndex
CREATE INDEX "WorkEvidence_workEvidenceSourceId_recordedAt_idx" ON "WorkEvidence"("workEvidenceSourceId", "recordedAt");

-- CreateIndex
CREATE INDEX "WorkEvidence_status_archivedAt_idx" ON "WorkEvidence"("status", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkEvidence_workEvidenceSourceId_sourceRecordKey_key" ON "WorkEvidence"("workEvidenceSourceId", "sourceRecordKey");

-- CreateIndex
CREATE INDEX "WorkEvidenceLink_provider_externalKey_idx" ON "WorkEvidenceLink"("provider", "externalKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkEvidenceLink_workEvidenceId_provider_externalKey_key" ON "WorkEvidenceLink"("workEvidenceId", "provider", "externalKey");

-- CreateIndex
CREATE UNIQUE INDEX "CaseType_key_key" ON "CaseType"("key");

-- CreateIndex
CREATE INDEX "CaseType_archivedAt_idx" ON "CaseType"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseRecord_caseNumber_key" ON "CaseRecord"("caseNumber");

-- CreateIndex
CREATE INDEX "CaseRecord_caseTypeId_status_idx" ON "CaseRecord"("caseTypeId", "status");

-- CreateIndex
CREATE INDEX "CaseRecord_subjectPersonId_status_idx" ON "CaseRecord"("subjectPersonId", "status");

-- CreateIndex
CREATE INDEX "CaseRecord_ownerPersonId_status_idx" ON "CaseRecord"("ownerPersonId", "status");

-- CreateIndex
CREATE INDEX "CaseRecord_relatedProjectId_idx" ON "CaseRecord"("relatedProjectId");

-- CreateIndex
CREATE INDEX "CaseRecord_relatedAssignmentId_idx" ON "CaseRecord"("relatedAssignmentId");

-- CreateIndex
CREATE INDEX "CaseStep_assignedToPersonId_status_idx" ON "CaseStep"("assignedToPersonId", "status");

-- CreateIndex
CREATE INDEX "CaseStep_workflowStateDefinitionId_idx" ON "CaseStep"("workflowStateDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStep_caseRecordId_stepKey_key" ON "CaseStep"("caseRecordId", "stepKey");

-- CreateIndex
CREATE INDEX "CaseParticipant_personId_role_idx" ON "CaseParticipant"("personId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CaseParticipant_caseRecordId_personId_role_key" ON "CaseParticipant"("caseRecordId", "personId", "role");

-- CreateIndex
CREATE INDEX "MetadataDictionary_entityType_archivedAt_idx" ON "MetadataDictionary"("entityType", "archivedAt");

-- CreateIndex
CREATE INDEX "MetadataDictionary_scopeOrgUnitId_idx" ON "MetadataDictionary"("scopeOrgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "MetadataDictionary_entityType_dictionaryKey_scopeOrgUnitId_key" ON "MetadataDictionary"("entityType", "dictionaryKey", "scopeOrgUnitId");

-- CreateIndex
CREATE INDEX "MetadataEntry_metadataDictionaryId_isEnabled_archivedAt_idx" ON "MetadataEntry"("metadataDictionaryId", "isEnabled", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MetadataEntry_metadataDictionaryId_entryKey_key" ON "MetadataEntry"("metadataDictionaryId", "entryKey");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_entityType_isEnabled_archivedAt_idx" ON "CustomFieldDefinition"("entityType", "isEnabled", "archivedAt");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_metadataDictionaryId_idx" ON "CustomFieldDefinition"("metadataDictionaryId");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_scopeOrgUnitId_idx" ON "CustomFieldDefinition"("scopeOrgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_entityType_fieldKey_scopeOrgUnitId_key" ON "CustomFieldDefinition"("entityType", "fieldKey", "scopeOrgUnitId");

-- CreateIndex
CREATE INDEX "CustomFieldValue_entityType_entityId_archivedAt_idx" ON "CustomFieldValue"("entityType", "entityId", "archivedAt");

-- CreateIndex
CREATE INDEX "CustomFieldValue_customFieldDefinitionId_idx" ON "CustomFieldValue"("customFieldDefinitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldValue_entityType_entityId_customFieldDefinitionI_key" ON "CustomFieldValue"("entityType", "entityId", "customFieldDefinitionId");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_entityType_status_archivedAt_idx" ON "WorkflowDefinition"("entityType", "status", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_entityType_workflowKey_version_key" ON "WorkflowDefinition"("entityType", "workflowKey", "version");

-- CreateIndex
CREATE INDEX "WorkflowStateDefinition_workflowDefinitionId_sequenceNumber_idx" ON "WorkflowStateDefinition"("workflowDefinitionId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowStateDefinition_workflowDefinitionId_stateKey_key" ON "WorkflowStateDefinition"("workflowDefinitionId", "stateKey");

-- CreateIndex
CREATE INDEX "EntityLayoutDefinition_entityType_isDefault_archivedAt_idx" ON "EntityLayoutDefinition"("entityType", "isDefault", "archivedAt");

-- CreateIndex
CREATE INDEX "EntityLayoutDefinition_scopeOrgUnitId_idx" ON "EntityLayoutDefinition"("scopeOrgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLayoutDefinition_entityType_layoutKey_version_scopeOr_key" ON "EntityLayoutDefinition"("entityType", "layoutKey", "version", "scopeOrgUnitId");

-- CreateIndex
CREATE INDEX "AuditLog_aggregateType_aggregateId_idx" ON "AuditLog"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_correlationId_idx" ON "AuditLog"("correlationId");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");

-- CreateIndex
CREATE INDEX "OutboxEvent_createdAt_idx" ON "OutboxEvent"("createdAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncState_provider_resourceType_lastStatus_idx" ON "IntegrationSyncState"("provider", "resourceType", "lastStatus");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSyncState_provider_resourceType_scopeKey_key" ON "IntegrationSyncState"("provider", "resourceType", "scopeKey");

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentOrgUnitId_fkey" FOREIGN KEY ("parentOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_managerPersonId_fkey" FOREIGN KEY ("managerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_occupantPersonId_fkey" FOREIGN KEY ("occupantPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonOrgMembership" ADD CONSTRAINT "PersonOrgMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonOrgMembership" ADD CONSTRAINT "PersonOrgMembership_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonOrgMembership" ADD CONSTRAINT "PersonOrgMembership_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingLine" ADD CONSTRAINT "ReportingLine_managerPersonId_fkey" FOREIGN KEY ("managerPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportingLine" ADD CONSTRAINT "ReportingLine_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourcePool" ADD CONSTRAINT "ResourcePool_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonResourcePoolMembership" ADD CONSTRAINT "PersonResourcePoolMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonResourcePoolMembership" ADD CONSTRAINT "PersonResourcePoolMembership_resourcePoolId_fkey" FOREIGN KEY ("resourcePoolId") REFERENCES "ResourcePool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectExternalLink" ADD CONSTRAINT "ProjectExternalLink_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalSyncState" ADD CONSTRAINT "ExternalSyncState_projectExternalLinkId_fkey" FOREIGN KEY ("projectExternalLinkId") REFERENCES "ProjectExternalLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_requestedByPersonId_fkey" FOREIGN KEY ("requestedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentApproval" ADD CONSTRAINT "AssignmentApproval_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentApproval" ADD CONSTRAINT "AssignmentApproval_decidedByPersonId_fkey" FOREIGN KEY ("decidedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentHistory" ADD CONSTRAINT "AssignmentHistory_changedByPersonId_fkey" FOREIGN KEY ("changedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEvidence" ADD CONSTRAINT "WorkEvidence_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEvidence" ADD CONSTRAINT "WorkEvidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEvidence" ADD CONSTRAINT "WorkEvidence_workEvidenceSourceId_fkey" FOREIGN KEY ("workEvidenceSourceId") REFERENCES "WorkEvidenceSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkEvidenceLink" ADD CONSTRAINT "WorkEvidenceLink_workEvidenceId_fkey" FOREIGN KEY ("workEvidenceId") REFERENCES "WorkEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseType" ADD CONSTRAINT "CaseType_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_caseTypeId_fkey" FOREIGN KEY ("caseTypeId") REFERENCES "CaseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_subjectPersonId_fkey" FOREIGN KEY ("subjectPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_ownerPersonId_fkey" FOREIGN KEY ("ownerPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_relatedProjectId_fkey" FOREIGN KEY ("relatedProjectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseRecord" ADD CONSTRAINT "CaseRecord_relatedAssignmentId_fkey" FOREIGN KEY ("relatedAssignmentId") REFERENCES "ProjectAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStep" ADD CONSTRAINT "CaseStep_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStep" ADD CONSTRAINT "CaseStep_workflowStateDefinitionId_fkey" FOREIGN KEY ("workflowStateDefinitionId") REFERENCES "WorkflowStateDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStep" ADD CONSTRAINT "CaseStep_assignedToPersonId_fkey" FOREIGN KEY ("assignedToPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_caseRecordId_fkey" FOREIGN KEY ("caseRecordId") REFERENCES "CaseRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseParticipant" ADD CONSTRAINT "CaseParticipant_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataDictionary" ADD CONSTRAINT "MetadataDictionary_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataEntry" ADD CONSTRAINT "MetadataEntry_metadataDictionaryId_fkey" FOREIGN KEY ("metadataDictionaryId") REFERENCES "MetadataDictionary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_metadataDictionaryId_fkey" FOREIGN KEY ("metadataDictionaryId") REFERENCES "MetadataDictionary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldValue" ADD CONSTRAINT "CustomFieldValue_customFieldDefinitionId_fkey" FOREIGN KEY ("customFieldDefinitionId") REFERENCES "CustomFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowStateDefinition" ADD CONSTRAINT "WorkflowStateDefinition_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLayoutDefinition" ADD CONSTRAINT "EntityLayoutDefinition_scopeOrgUnitId_fkey" FOREIGN KEY ("scopeOrgUnitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

