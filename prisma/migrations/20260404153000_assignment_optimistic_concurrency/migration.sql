ALTER TABLE "ProjectAssignment"
ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

UPDATE "ProjectAssignment"
SET "version" = 1
WHERE "version" IS NULL;