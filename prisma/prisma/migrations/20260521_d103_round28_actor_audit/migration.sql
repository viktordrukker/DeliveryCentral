-- F-76 / D-103 round 28 — actor-audit columns on LocalAccount + WorkEvidence
--
-- Two more aggregates with full createdAt/updatedAt but no canonical
-- actor-audit pair. LocalAccount stores per-person auth credentials
-- (admin/RM can reset others' accounts → "who reset" needs answer
-- without an audit-log scan); WorkEvidence captures PMO-visible
-- work-record streams from external systems.
--
-- REVERSIBLE: see rollback.sql.

-- LocalAccount ----------------------------------------------------------

ALTER TABLE "LocalAccount"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "LocalAccount"
  ADD CONSTRAINT "LocalAccount_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LocalAccount"
  ADD CONSTRAINT "LocalAccount_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "LocalAccount_createdByPersonId_idx"
  ON "LocalAccount" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "LocalAccount_updatedByPersonId_idx"
  ON "LocalAccount" ("updatedByPersonId");

-- WorkEvidence ----------------------------------------------------------

ALTER TABLE "WorkEvidence"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "WorkEvidence"
  ADD CONSTRAINT "WorkEvidence_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WorkEvidence"
  ADD CONSTRAINT "WorkEvidence_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkEvidence_createdByPersonId_idx"
  ON "WorkEvidence" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "WorkEvidence_updatedByPersonId_idx"
  ON "WorkEvidence" ("updatedByPersonId");
