DROP TRIGGER IF EXISTS "person_cost_rates_dm2_dualmaintain" ON "person_cost_rates";
DROP FUNCTION IF EXISTS "person_cost_rates_dm2_dualmaintain"();
DROP INDEX IF EXISTS "person_cost_rates_publicId_key";
DROP INDEX IF EXISTS "person_cost_rates_id_new_key";
ALTER TABLE "person_cost_rates" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "person_cost_rates" DROP COLUMN IF EXISTS "id_new";
