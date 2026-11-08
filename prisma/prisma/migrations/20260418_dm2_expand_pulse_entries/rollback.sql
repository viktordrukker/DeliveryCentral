DROP TRIGGER IF EXISTS "pulse_entries_dm2_dualmaintain" ON "pulse_entries";
DROP FUNCTION IF EXISTS "pulse_entries_dm2_dualmaintain"();
DROP INDEX IF EXISTS "pulse_entries_id_new_key";
ALTER TABLE "pulse_entries" DROP COLUMN IF EXISTS "id_new";
