DROP TRIGGER IF EXISTS "staffing_request_fulfilments_dm2_dualmaintain" ON "staffing_request_fulfilments";
DROP FUNCTION IF EXISTS "staffing_request_fulfilments_dm2_dualmaintain"();
DROP INDEX IF EXISTS "staffing_request_fulfilments_id_new_key";
ALTER TABLE "staffing_request_fulfilments" DROP COLUMN IF EXISTS "id_new";
