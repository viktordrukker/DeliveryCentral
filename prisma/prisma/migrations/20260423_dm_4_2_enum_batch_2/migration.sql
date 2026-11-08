-- DM-4-2 batch 2 — promote 3 more string fields to enums.
--
-- Pattern identical to the pilot (20260422_dm_4_2_work_evidence_type_enum):
-- CREATE TYPE with the distinct values present in dev DB, then direct
-- ALTER COLUMN TYPE USING cast. Rollback casts back to text.
--
-- Fields:
--   WorkEvidenceLink.linkType          → WorkEvidenceLinkType
--   IntegrationSyncState.resourceType  → IntegrationSyncResourceType
--   CaseType.key                       → CaseTypeKey
--
-- Value cardinality captured from dev DB:
--   WorkEvidenceLink.linkType: ISSUE
--   IntegrationSyncState.resourceType: accounts, directory
--   CaseType.key: OFFBOARDING, ONBOARDING, PERFORMANCE, TRANSFER
--
-- Note: IntegrationSyncResourceType uses lowercase labels to match
-- existing row values; normalization to uppercase is a separate DM-5
-- concern (naming).
--
-- Classification: REVERSIBLE.

-- ----------------------------------------- WorkEvidenceLink.linkType
CREATE TYPE "WorkEvidenceLinkType" AS ENUM ('ISSUE');

ALTER TABLE "WorkEvidenceLink"
  ALTER COLUMN "linkType" TYPE "WorkEvidenceLinkType"
  USING "linkType"::"WorkEvidenceLinkType";

-- ----------------------------- IntegrationSyncState.resourceType
CREATE TYPE "IntegrationSyncResourceType" AS ENUM ('accounts', 'directory');

ALTER TABLE "IntegrationSyncState"
  ALTER COLUMN "resourceType" TYPE "IntegrationSyncResourceType"
  USING "resourceType"::"IntegrationSyncResourceType";

-- ------------------------------------------------ CaseType.key
CREATE TYPE "CaseTypeKey" AS ENUM ('OFFBOARDING', 'ONBOARDING', 'PERFORMANCE', 'TRANSFER');

ALTER TABLE "CaseType"
  ALTER COLUMN "key" TYPE "CaseTypeKey"
  USING "key"::"CaseTypeKey";
