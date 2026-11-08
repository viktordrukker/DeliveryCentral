-- /my-time hierarchy fix: extend TimesheetEntry identity for project-custom rows
-- and multi-row-per-day. Plan:
--   /home/drukker/.claude/plans/on-page-http-localhost-5173-my-time-agai-mighty-engelbart.md
-- Empty string '' is the "not set" sentinel so the composite unique key works
-- without partial-index gymnastics around Postgres NULLS-DISTINCT semantics.

-- 1. Backfill existing NULL benchCategory rows to '' so the column can become NOT NULL.
UPDATE "timesheet_entries" SET "benchCategory" = '' WHERE "benchCategory" IS NULL;

-- 2. Promote benchCategory to NOT NULL DEFAULT ''.
ALTER TABLE "timesheet_entries"
  ALTER COLUMN "benchCategory" SET NOT NULL,
  ALTER COLUMN "benchCategory" SET DEFAULT '';

-- 3. New columns: workLabel for project-custom rows, workItemId for the future Jira link.
ALTER TABLE "timesheet_entries"
  ADD COLUMN "workLabel" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "workItemId" TEXT;

-- 4. Swap the unique index from (week, project, date) to the new composite identity.
DROP INDEX "timesheet_entries_timesheetWeekId_projectId_date_key";
CREATE UNIQUE INDEX "timesheet_entries_timesheetWeekId_projectId_benchCategory_w_key"
  ON "timesheet_entries" ("timesheetWeekId", "projectId", "benchCategory", "workLabel", "date");
