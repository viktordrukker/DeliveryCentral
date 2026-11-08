-- HD-10 rollback — drops the pre-breach timestamp columns.
ALTER TABLE "ProjectAssignment" DROP COLUMN IF EXISTS "slaWarnedAt75pct";
ALTER TABLE "ProjectAssignment" DROP COLUMN IF EXISTS "slaWarnedAt50pct";
