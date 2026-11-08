-- DM-4-2b — extend CaseTypeKey with OVERTIME_EXCEPTION.
--
-- The overtime module (overtime-summary.service:247) queries
-- `caseType: { key: 'OVERTIME_EXCEPTION' }` but the previous DM-4-2
-- enum promotion only captured the 4 values present in dev DB
-- (OFFBOARDING, ONBOARDING, PERFORMANCE, TRANSFER). Adding the
-- additional label honors the code's intent without changing behaviour
-- (no CaseType row with this key exists, so the query simply finds
-- nothing — same as before).
--
-- Single-step `ADD VALUE IF NOT EXISTS` is safe; this is a pure
-- additive operation. Not a rename, so DM-R-6's single-step-rename
-- gate is unaffected.
--
-- Classification: REVERSIBLE (conceptually — but Postgres cannot drop
-- a single enum label without rewriting the type, so the rollback
-- goes through the rename-and-recreate dance).

ALTER TYPE "CaseTypeKey" ADD VALUE IF NOT EXISTS 'OVERTIME_EXCEPTION';
