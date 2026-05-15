-- F-10.3 / D-103 + F-10.4 / D-104 — actor audit + temporal columns first batch.
--
-- D-103 — add `createdByPersonId` + `updatedByPersonId` (nullable FK → persons)
-- to the two highest-audit aggregates: Project and ProjectAssignment.
-- Service-layer writers will populate these as a follow-up (additive nullable
-- columns mean existing rows + existing writers continue to work unchanged).
--
-- D-104 — add `createdAt` + `updatedAt` (defaulted, NOT NULL) to the two
-- approval-side aggregates that were missing them: PersonReleaseApproval
-- (had `decidedAt` only) and StaffingRequestFulfilment (had `fulfilledAt`
-- only). All existing rows get backfilled with NOW() at column-add time.
--
-- Reversible: rollback drops every column + FK + index added here.
-- Pure additive forward migration → reverse is pure drop, no data loss
-- for *new* writes after rollback but `decidedAt` / `fulfilledAt` still
-- carry the legacy authoritative timestamp.

-- ─── D-103: Project.createdByPersonId + updatedByPersonId ───
ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Project_createdByPersonId_idx"
  ON "Project" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "Project_updatedByPersonId_idx"
  ON "Project" ("updatedByPersonId");

-- ─── D-103: ProjectAssignment.createdByPersonId + updatedByPersonId ───
ALTER TABLE "ProjectAssignment"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "ProjectAssignment"
  ADD CONSTRAINT "ProjectAssignment_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectAssignment"
  ADD CONSTRAINT "ProjectAssignment_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ProjectAssignment_createdByPersonId_idx"
  ON "ProjectAssignment" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "ProjectAssignment_updatedByPersonId_idx"
  ON "ProjectAssignment" ("updatedByPersonId");

-- ─── D-104: PersonReleaseApproval.createdAt + updatedAt ───
ALTER TABLE "person_release_approvals"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW();

ALTER TABLE "person_release_approvals"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW();

-- ─── D-104: StaffingRequestFulfilment.createdAt + updatedAt ───
ALTER TABLE "staffing_request_fulfilments"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW();

ALTER TABLE "staffing_request_fulfilments"
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW();
