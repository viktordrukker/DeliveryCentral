-- F-44 / D-103 + DM-5-5 round 12 — actor-audit columns on
-- ProjectChangeRequest and ProjectActivationApproval.
--
-- Continues the round-by-round sweep. After this batch, 24/105
-- aggregates carry the on-row actor columns.
--
-- Both are governance aggregates that already have business actors
-- (requester/requestedBy + decidedBy). The canonical pair brings
-- them into uniform shape for join-by-actor queries across all
-- audit-grade aggregates.
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged. Reversible: rollback drops all 4 columns +
-- 4 FKs + 4 indexes.

-- ─── ProjectChangeRequest ───
ALTER TABLE "project_change_requests"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_change_requests"
  ADD CONSTRAINT "project_change_requests_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_change_requests"
  ADD CONSTRAINT "project_change_requests_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_change_requests_createdByPersonId_idx"
  ON "project_change_requests" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_change_requests_updatedByPersonId_idx"
  ON "project_change_requests" ("updatedByPersonId");

-- ─── ProjectActivationApproval ───
ALTER TABLE "project_activation_approvals"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_activation_approvals"
  ADD CONSTRAINT "project_activation_approvals_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_activation_approvals"
  ADD CONSTRAINT "project_activation_approvals_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_activation_approvals_createdByPersonId_idx"
  ON "project_activation_approvals" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_activation_approvals_updatedByPersonId_idx"
  ON "project_activation_approvals" ("updatedByPersonId");
