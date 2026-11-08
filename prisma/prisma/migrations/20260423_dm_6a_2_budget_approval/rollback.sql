-- DM-6a-2 rollback. Data-loss: drops all BudgetApproval rows.

DROP INDEX IF EXISTS "budget_approvals_requestedByPersonId_idx";
DROP INDEX IF EXISTS "budget_approvals_status_idx";
DROP INDEX IF EXISTS "budget_approvals_projectBudgetId_idx";
DROP TABLE IF EXISTS "budget_approvals";
DROP TYPE IF EXISTS "BudgetApprovalStatus";
