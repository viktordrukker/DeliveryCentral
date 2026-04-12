CREATE TABLE IF NOT EXISTS "project_budgets" (
  "id"          TEXT            NOT NULL,
  "projectId"   TEXT            NOT NULL,
  "fiscalYear"  INTEGER         NOT NULL,
  "capexBudget" DECIMAL(15, 2)  NOT NULL DEFAULT 0,
  "opexBudget"  DECIMAL(15, 2)  NOT NULL DEFAULT 0,
  "updatedAt"   TIMESTAMP(3)    NOT NULL,
  CONSTRAINT "project_budgets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_budgets_projectId_fiscalYear_key" UNIQUE ("projectId", "fiscalYear")
);
