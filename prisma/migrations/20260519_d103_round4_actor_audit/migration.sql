-- F-29 / D-103 + DM-5-5 round 4 — actor-audit columns on
-- TimesheetWeek and ProjectRisk.
--
-- Continues the F-10.3 + F-17 + F-26 sweep. After this batch,
-- 8/105 high-audit aggregates carry the on-row actor columns.
--
-- TimesheetWeek already has `approvedBy` (legacy non-UUID String);
-- adding `createdByPersonId` + `updatedByPersonId` captures the
-- timesheet author + last editor (often != personId when an admin
-- corrects on behalf).
--
-- ProjectRisk already has `ownerPersonId` + `assigneePersonId`
-- (business actors); adding `createdByPersonId` + `updatedByPersonId`
-- captures who initially raised the risk and who last modified it.
--
-- All columns nullable + FK SET NULL → existing rows + writers
-- continue unchanged.
--
-- Reversible: rollback drops all 4 columns + 4 FKs + 4 indexes.

-- ─── TimesheetWeek ───
ALTER TABLE "timesheet_weeks"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "timesheet_weeks"
  ADD CONSTRAINT "timesheet_weeks_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "timesheet_weeks"
  ADD CONSTRAINT "timesheet_weeks_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "timesheet_weeks_createdByPersonId_idx"
  ON "timesheet_weeks" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "timesheet_weeks_updatedByPersonId_idx"
  ON "timesheet_weeks" ("updatedByPersonId");

-- ─── ProjectRisk ───
ALTER TABLE "project_risks"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_risks"
  ADD CONSTRAINT "project_risks_createdByPersonId_fkey"
    FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_risks"
  ADD CONSTRAINT "project_risks_updatedByPersonId_fkey"
    FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_risks_createdByPersonId_idx"
  ON "project_risks" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_risks_updatedByPersonId_idx"
  ON "project_risks" ("updatedByPersonId");
