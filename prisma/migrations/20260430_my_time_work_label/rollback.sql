-- Reverse 20260430_my_time_work_label.
-- See sibling REVERSIBLE.md for the destructive-backfill caveat on benchCategory.

-- 4. Drop new composite unique index, restore the original (week, project, date).
DROP INDEX IF EXISTS "timesheet_entries_timesheetWeekId_projectId_benchCategory_w_key";
CREATE UNIQUE INDEX "timesheet_entries_timesheetWeekId_projectId_date_key"
  ON "timesheet_entries" ("timesheetWeekId", "projectId", "date");

-- 3. Drop new columns.
ALTER TABLE "timesheet_entries"
  DROP COLUMN IF EXISTS "workItemId",
  DROP COLUMN IF EXISTS "workLabel";

-- 2. Revert benchCategory to nullable, drop default. Note: existing '' rows
--    that were originally NULL pre-migration cannot be distinguished — the
--    migration's NULL→'' backfill is one-way (see REVERSIBLE.md).
ALTER TABLE "timesheet_entries"
  ALTER COLUMN "benchCategory" DROP NOT NULL,
  ALTER COLUMN "benchCategory" DROP DEFAULT;
