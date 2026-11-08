-- F-60 / D-103 round 20 — actor-audit columns on CustomFieldValue + StaffingRequestProposalCandidate
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "CustomFieldValue"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "CustomFieldValue"
  ADD CONSTRAINT "CustomFieldValue_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CustomFieldValue"
  ADD CONSTRAINT "CustomFieldValue_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CustomFieldValue_createdByPersonId_idx"
  ON "CustomFieldValue" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "CustomFieldValue_updatedByPersonId_idx"
  ON "CustomFieldValue" ("updatedByPersonId");

ALTER TABLE "StaffingRequestProposalCandidate"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "StaffingRequestProposalCandidate"
  ADD CONSTRAINT "StaffingRequestProposalCandidate_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StaffingRequestProposalCandidate"
  ADD CONSTRAINT "StaffingRequestProposalCandidate_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "StaffingRequestProposalCandidate_createdByPersonId_idx"
  ON "StaffingRequestProposalCandidate" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "StaffingRequestProposalCandidate_updatedByPersonId_idx"
  ON "StaffingRequestProposalCandidate" ("updatedByPersonId");
