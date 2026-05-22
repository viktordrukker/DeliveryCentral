-- F-85 / D-103 round 34 — actor-audit columns on PersonExternalIdentityLink + Tenant
--
-- PersonExternalIdentityLink maps a Person to one external identity
-- (M365/LDAP/etc.); admin can re-link on reconciliation. Tenant is the
-- top-level admin-curated row that owns most other aggregates.
-- Both want the canonical actor-audit pair so observability can answer
-- "who linked this identity" / "who edited this tenant" without scanning
-- audit-log streams.
--
-- REVERSIBLE: see rollback.sql.

-- PersonExternalIdentityLink --------------------------------------------

ALTER TABLE "PersonExternalIdentityLink"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "PersonExternalIdentityLink"
  ADD CONSTRAINT "PersonExternalIdentityLink_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PersonExternalIdentityLink"
  ADD CONSTRAINT "PersonExternalIdentityLink_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PersonExternalIdentityLink_createdByPersonId_idx"
  ON "PersonExternalIdentityLink" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "PersonExternalIdentityLink_updatedByPersonId_idx"
  ON "PersonExternalIdentityLink" ("updatedByPersonId");

-- Tenant ----------------------------------------------------------------

ALTER TABLE "Tenant"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Tenant"
  ADD CONSTRAINT "Tenant_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Tenant_createdByPersonId_idx"
  ON "Tenant" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "Tenant_updatedByPersonId_idx"
  ON "Tenant" ("updatedByPersonId");
