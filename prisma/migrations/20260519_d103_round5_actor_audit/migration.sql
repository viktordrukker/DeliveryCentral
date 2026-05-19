-- F-30 / D-103 + DM-5-5 round 5 — actor-audit columns on
-- ProjectMilestone and BudgetApproval.
--
-- Continues the F-10.3 + F-17 + F-26 + F-29 sweep. After this batch,
-- 10/105 aggregates carry the on-row actor columns.
--
-- ProjectMilestone has no actor at all today (project-side rows
-- created by PMs — only `projectId` joins them to a project owner).
-- Adding both columns captures the milestone author + last editor.
--
-- BudgetApproval already has `requestedByPersonId` (creator-actor)
-- and `decidedByPersonId` (decision-actor). Adding the canonical
-- pair brings it into uniform shape with the rest of the
-- actor-audit aggregates — `createdByPersonId` will mirror
-- `requestedByPersonId` at write time but the framework column
-- stays for join-by-actor queries.
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── ProjectMilestone ───
ALTER TABLE "project_milestones"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_milestones"
  ADD CONSTRAINT "project_milestones_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_milestones"
  ADD CONSTRAINT "project_milestones_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_milestones_createdByPersonId_idx"
  ON "project_milestones" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_milestones_updatedByPersonId_idx"
  ON "project_milestones" ("updatedByPersonId");

-- ─── BudgetApproval ───
ALTER TABLE "budget_approvals"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "budget_approvals"
  ADD CONSTRAINT "budget_approvals_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budget_approvals"
  ADD CONSTRAINT "budget_approvals_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "budget_approvals_createdByPersonId_idx"
  ON "budget_approvals" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "budget_approvals_updatedByPersonId_idx"
  ON "budget_approvals" ("updatedByPersonId");
