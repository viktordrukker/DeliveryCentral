-- F-64 / D-103 round 22 — actor-audit columns on PersonReleaseApproval + StaffingRequestFulfilment
--
-- Adds `createdByPersonId` + `updatedByPersonId` UUID columns + FK to Person
-- + covering indexes. Both columns nullable to keep legacy rows intact.
--
-- REVERSIBLE: see rollback.sql.

ALTER TABLE "person_release_approvals"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "person_release_approvals"
  ADD CONSTRAINT "person_release_approvals_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "person_release_approvals"
  ADD CONSTRAINT "person_release_approvals_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "person_release_approvals_createdByPersonId_idx"
  ON "person_release_approvals" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "person_release_approvals_updatedByPersonId_idx"
  ON "person_release_approvals" ("updatedByPersonId");

ALTER TABLE "staffing_request_fulfilments"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "staffing_request_fulfilments"
  ADD CONSTRAINT "staffing_request_fulfilments_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staffing_request_fulfilments"
  ADD CONSTRAINT "staffing_request_fulfilments_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "staffing_request_fulfilments_createdByPersonId_idx"
  ON "staffing_request_fulfilments" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "staffing_request_fulfilments_updatedByPersonId_idx"
  ON "staffing_request_fulfilments" ("updatedByPersonId");
