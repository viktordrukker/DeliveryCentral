-- F-70 / D-103 round 25 — actor-audit columns on PersonOrgMembership + ReportingLine
--
-- Two org-graph aggregates that already carry full createdAt/updatedAt
-- timestamps but no actor-audit pair. Adding the canonical
-- (createdByPersonId, updatedByPersonId) pair to make these uniform with
-- the other audited aggregates so observability tools can answer
-- "who reassigned this person to org-unit X" / "who reshaped the
-- reporting line" without reading audit-log streams.
--
-- REVERSIBLE: see rollback.sql.

-- PersonOrgMembership ---------------------------------------------------

ALTER TABLE "PersonOrgMembership"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "PersonOrgMembership"
  ADD CONSTRAINT "PersonOrgMembership_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PersonOrgMembership"
  ADD CONSTRAINT "PersonOrgMembership_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PersonOrgMembership_createdByPersonId_idx"
  ON "PersonOrgMembership" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "PersonOrgMembership_updatedByPersonId_idx"
  ON "PersonOrgMembership" ("updatedByPersonId");

-- ReportingLine ---------------------------------------------------------

ALTER TABLE "ReportingLine"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "ReportingLine"
  ADD CONSTRAINT "ReportingLine_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ReportingLine"
  ADD CONSTRAINT "ReportingLine_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ReportingLine_createdByPersonId_idx"
  ON "ReportingLine" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "ReportingLine_updatedByPersonId_idx"
  ON "ReportingLine" ("updatedByPersonId");
