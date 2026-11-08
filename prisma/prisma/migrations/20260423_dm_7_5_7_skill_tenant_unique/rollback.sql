-- DM-7.5-7 rollback.
DROP INDEX IF EXISTS "skills_tenantId_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "skills_name_key" ON "skills" ("name");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skills_tenantId_fkey') THEN
    ALTER TABLE "skills" DROP CONSTRAINT "skills_tenantId_fkey";
  END IF;
END
$$;
DROP INDEX IF EXISTS "skills_tenantId_idx";
ALTER TABLE "skills" DROP COLUMN IF EXISTS "tenantId";
