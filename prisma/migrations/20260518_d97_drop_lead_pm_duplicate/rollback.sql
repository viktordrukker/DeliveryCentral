-- Rollback for 20260518_d97_drop_lead_pm_duplicate.
--
-- Re-adds `leadPmPersonId` as a nullable UUID with no FK and no index,
-- matching the original shape, then backfills from `projectManagerId`
-- so old code that does the dual-read sees a consistent value.

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "leadPmPersonId" UUID;

UPDATE "Project"
   SET "leadPmPersonId" = "projectManagerId"
 WHERE "leadPmPersonId" IS NULL
   AND "projectManagerId" IS NOT NULL;
