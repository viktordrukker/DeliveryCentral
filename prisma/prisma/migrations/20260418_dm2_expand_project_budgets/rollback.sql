DROP TRIGGER IF EXISTS "project_budgets_dm2_dualmaintain" ON "project_budgets";
DROP FUNCTION IF EXISTS "project_budgets_dm2_dualmaintain"();
DROP INDEX IF EXISTS "project_budgets_publicId_key";
DROP INDEX IF EXISTS "project_budgets_id_new_key";
ALTER TABLE "project_budgets" DROP COLUMN IF EXISTS "publicId";
ALTER TABLE "project_budgets" DROP COLUMN IF EXISTS "id_new";
