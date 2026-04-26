-- DM-4-2 batch 2 rollback — cast enum columns back to text, drop enums.

ALTER TABLE "CaseType"
  ALTER COLUMN "key" TYPE text USING "key"::text;
DROP TYPE IF EXISTS "CaseTypeKey";

ALTER TABLE "IntegrationSyncState"
  ALTER COLUMN "resourceType" TYPE text USING "resourceType"::text;
DROP TYPE IF EXISTS "IntegrationSyncResourceType";

ALTER TABLE "WorkEvidenceLink"
  ALTER COLUMN "linkType" TYPE text USING "linkType"::text;
DROP TYPE IF EXISTS "WorkEvidenceLinkType";
