-- F-26 / D-103 + DM-5-5 round 3 — actor-audit columns on LeaveRequest
-- and AssignmentApproval.
--
-- Continues the F-10.3 + F-17 pattern (Project + ProjectAssignment;
-- then CaseRecord + PersonReleaseRequest). Both aggregates already
-- carry a "decision actor" column (`LeaveRequest.reviewedBy`,
-- `AssignmentApproval.decidedByPersonId`); this adds the missing
-- creation + last-modification actor columns so the full audit trail
-- is on-row rather than reconstructed from AuditLog.
--
-- All columns nullable + FK SET NULL → existing rows + existing
-- service writers continue unchanged. Service-layer adoption follows.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── LeaveRequest ───
ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_requests_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_requests_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "leave_requests_createdByPersonId_idx"
  ON "leave_requests" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "leave_requests_updatedByPersonId_idx"
  ON "leave_requests" ("updatedByPersonId");

-- ─── AssignmentApproval ───
ALTER TABLE "AssignmentApproval"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "AssignmentApproval"
  ADD CONSTRAINT "AssignmentApproval_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AssignmentApproval"
  ADD CONSTRAINT "AssignmentApproval_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "AssignmentApproval_createdByPersonId_idx"
  ON "AssignmentApproval" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "AssignmentApproval_updatedByPersonId_idx"
  ON "AssignmentApproval" ("updatedByPersonId");
