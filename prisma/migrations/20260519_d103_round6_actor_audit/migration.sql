-- F-32 / D-103 + DM-5-5 round 6 — actor-audit columns on
-- OrgUnit and StaffingRequestProposalSlate.
--
-- Continues the F-10.3 + F-17 + F-26 + F-29 + F-30 sweep. After
-- this batch, 12/105 high-audit aggregates carry the on-row actor
-- columns.
--
-- OrgUnit had no actor at all — `managerPersonId` captures the
-- business owner, not who created or last edited the row.
-- Admin-curated; the new columns matter for "who restructured the
-- org" trail.
--
-- StaffingRequestProposalSlate already has `proposedByPersonId`
-- (creator-actor). The canonical pair brings it into uniform
-- shape and captures the last editor too.
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── OrgUnit ───
ALTER TABLE "OrgUnit"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "OrgUnit"
  ADD CONSTRAINT "OrgUnit_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrgUnit"
  ADD CONSTRAINT "OrgUnit_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "OrgUnit_createdByPersonId_idx"
  ON "OrgUnit" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "OrgUnit_updatedByPersonId_idx"
  ON "OrgUnit" ("updatedByPersonId");

-- ─── StaffingRequestProposalSlate ───
ALTER TABLE "StaffingRequestProposalSlate"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "StaffingRequestProposalSlate"
  ADD CONSTRAINT "StaffingRequestProposalSlate_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StaffingRequestProposalSlate"
  ADD CONSTRAINT "StaffingRequestProposalSlate_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "StaffingRequestProposalSlate_createdByPersonId_idx"
  ON "StaffingRequestProposalSlate" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "StaffingRequestProposalSlate_updatedByPersonId_idx"
  ON "StaffingRequestProposalSlate" ("updatedByPersonId");
