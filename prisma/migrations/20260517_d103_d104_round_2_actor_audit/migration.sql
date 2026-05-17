-- F-17 / D-103 + DM-5-5 round 2 — extend actor-audit columns to CaseRecord
-- and PersonReleaseRequest.
--
-- Continues the F-10.3 pattern (which covered Project + ProjectAssignment).
-- StaffingRequest deliberately excluded — its `requestedByPersonId` is a
-- legacy non-UUID `String` column (no @db.Uuid annotation) and would need
-- a separate type-correction migration first.
--
-- All columns are nullable + FK SET NULL → existing rows + existing
-- writers continue unchanged; service-layer adoption can land
-- per-aggregate as a follow-up.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── CaseRecord ───
ALTER TABLE "CaseRecord"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "CaseRecord"
  ADD CONSTRAINT "CaseRecord_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseRecord"
  ADD CONSTRAINT "CaseRecord_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CaseRecord_createdByPersonId_idx"
  ON "CaseRecord" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "CaseRecord_updatedByPersonId_idx"
  ON "CaseRecord" ("updatedByPersonId");

-- ─── PersonReleaseRequest ───
ALTER TABLE "person_release_requests"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "person_release_requests"
  ADD CONSTRAINT "person_release_requests_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "person_release_requests"
  ADD CONSTRAINT "person_release_requests_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "person_release_requests_createdByPersonId_idx"
  ON "person_release_requests" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "person_release_requests_updatedByPersonId_idx"
  ON "person_release_requests" ("updatedByPersonId");
