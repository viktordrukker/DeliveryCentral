-- DM-6a-2 — BudgetApproval model.
--
-- Every ProjectBudget change (capex/opex commit, vendorBudget raise,
-- EAC adjustment) should flow through an explicit approval. Prior
-- state: implicit, via AuditLog only, no queryable state. After: a
-- dedicated BudgetApproval row per decision, linked to the budget via
-- FK (`onDelete: Restrict` — never lose approvals if a budget is
-- deleted; the budget deletion is the one that needs to move to the
-- "archive" column instead).
--
-- Classification: REVERSIBLE.

CREATE TYPE "BudgetApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE IF NOT EXISTS "budget_approvals" (
  id                     uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectBudgetId"      text                  NOT NULL,
  status                 "BudgetApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "requestedByPersonId"  uuid                  NOT NULL,
  "decidedByPersonId"    uuid,
  "decisionAt"           timestamptz,
  "decisionReason"       text,
  "requestedAt"          timestamptz           NOT NULL DEFAULT NOW(),
  "requestedChange"      jsonb,
  "createdAt"            timestamptz           NOT NULL DEFAULT NOW(),
  "updatedAt"            timestamptz           NOT NULL DEFAULT NOW(),
  CONSTRAINT "budget_approvals_projectBudgetId_fkey"
    FOREIGN KEY ("projectBudgetId") REFERENCES "project_budgets"(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "budget_approvals_requestedByPersonId_fkey"
    FOREIGN KEY ("requestedByPersonId") REFERENCES "Person"(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT "budget_approvals_decidedByPersonId_fkey"
    FOREIGN KEY ("decidedByPersonId") REFERENCES "Person"(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "budget_approvals_projectBudgetId_idx" ON "budget_approvals" ("projectBudgetId");
CREATE INDEX IF NOT EXISTS "budget_approvals_status_idx" ON "budget_approvals" (status);
CREATE INDEX IF NOT EXISTS "budget_approvals_requestedByPersonId_idx" ON "budget_approvals" ("requestedByPersonId");

COMMENT ON TABLE "budget_approvals" IS
  'DM-6a-2 — queryable approval state per ProjectBudget change. Append-only in practice; status transitions PENDING → (APPROVED | REJECTED).';
