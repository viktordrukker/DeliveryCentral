DROP TRIGGER IF EXISTS "timesheet_weeks_dm2_dualmaintain" ON "timesheet_weeks";
DROP FUNCTION IF EXISTS "timesheet_weeks_dm2_dualmaintain"();
DROP INDEX IF EXISTS "timesheet_weeks_publicId_key";
DROP INDEX IF EXISTS "timesheet_weeks_id_new_key";
ALTER TABLE "timesheet_weeks" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "timesheet_weeks" DROP COLUMN IF EXISTS "id_new";
