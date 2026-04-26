DROP TRIGGER IF EXISTS "in_app_notifications_dm2_dualmaintain" ON "in_app_notifications";
DROP FUNCTION IF EXISTS "in_app_notifications_dm2_dualmaintain"();
DROP INDEX IF EXISTS "in_app_notifications_publicId_key";
DROP INDEX IF EXISTS "in_app_notifications_id_new_key";
ALTER TABLE "in_app_notifications" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "in_app_notifications" DROP COLUMN IF EXISTS "id_new";
