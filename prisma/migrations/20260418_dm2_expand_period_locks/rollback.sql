DROP TRIGGER IF EXISTS "period_locks_dm2_dualmaintain" ON "period_locks";
DROP FUNCTION IF EXISTS "period_locks_dm2_dualmaintain"();
DROP INDEX IF EXISTS "period_locks_publicId_key";
DROP INDEX IF EXISTS "period_locks_id_new_key";
ALTER TABLE "period_locks" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "period_locks" DROP COLUMN IF EXISTS "id_new";
