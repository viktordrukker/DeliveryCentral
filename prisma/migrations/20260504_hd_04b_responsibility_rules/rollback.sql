-- HD-4 rollback — drops the responsibility-rule store.
DROP INDEX IF EXISTS "responsibility_rules_tenantId_idx";
DROP INDEX IF EXISTS "responsibility_rules_targetPersonId_idx";
DROP INDEX IF EXISTS "responsibility_rules_action_scope_active_priority_idx";
DROP TABLE IF EXISTS "responsibility_rules";
DROP TYPE IF EXISTS "ResponsibilityResolutionMode";
DROP TYPE IF EXISTS "ResponsibilityScope";
DROP TYPE IF EXISTS "ResponsibilityActionKind";
