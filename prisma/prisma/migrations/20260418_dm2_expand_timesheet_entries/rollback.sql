DROP TRIGGER IF EXISTS "timesheet_entries_dm2_dualmaintain" ON "timesheet_entries";
DROP FUNCTION IF EXISTS "timesheet_entries_dm2_dualmaintain"();
DROP INDEX IF EXISTS "timesheet_entries_id_new_key";
ALTER TABLE "timesheet_entries" DROP COLUMN IF EXISTS "id_new";
