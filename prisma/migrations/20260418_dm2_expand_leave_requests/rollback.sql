DROP TRIGGER IF EXISTS "leave_requests_dm2_dualmaintain" ON "leave_requests";
DROP FUNCTION IF EXISTS "leave_requests_dm2_dualmaintain"();
DROP INDEX IF EXISTS "leave_requests_publicId_key";
DROP INDEX IF EXISTS "leave_requests_id_new_key";
ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "leave_requests" DROP COLUMN IF EXISTS "id_new";
