DROP TRIGGER IF EXISTS "staffing_requests_dm2_dualmaintain" ON "staffing_requests";
DROP FUNCTION IF EXISTS "staffing_requests_dm2_dualmaintain"();
DROP INDEX IF EXISTS "staffing_requests_publicId_key";
DROP INDEX IF EXISTS "staffing_requests_id_new_key";
ALTER TABLE "staffing_requests" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "staffing_requests" DROP COLUMN IF EXISTS "id_new";
