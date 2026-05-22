-- Rollback for F-85 / D-103 round 34 — PersonExternalIdentityLink + Tenant actor-audit

DROP INDEX IF EXISTS "Tenant_updatedByPersonId_idx";
DROP INDEX IF EXISTS "Tenant_createdByPersonId_idx";
DROP INDEX IF EXISTS "PersonExternalIdentityLink_updatedByPersonId_idx";
DROP INDEX IF EXISTS "PersonExternalIdentityLink_createdByPersonId_idx";

ALTER TABLE "Tenant"
  DROP CONSTRAINT IF EXISTS "Tenant_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "Tenant_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "PersonExternalIdentityLink"
  DROP CONSTRAINT IF EXISTS "PersonExternalIdentityLink_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "PersonExternalIdentityLink_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
