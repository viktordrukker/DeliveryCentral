-- F-4.5 / C1-EMP-CASE — add EMPLOYEE_ISSUE to CaseTypeKey enum.
--
-- Postgres ALTER TYPE ADD VALUE is non-transactional, non-reversible,
-- and idempotent only via the IF NOT EXISTS clause (PG12+, which the
-- project targets). No corresponding DROP is possible without rebuilding
-- the type — hence FORWARD_ONLY.
--
-- After this migration: BE controllers/DTOs that gate caseTypeKey on the
-- 4-value union accept EMPLOYEE_ISSUE; the seed inserts a CaseType row
-- mapping EMPLOYEE_ISSUE → "Employee issue".

ALTER TYPE "CaseTypeKey" ADD VALUE IF NOT EXISTS 'EMPLOYEE_ISSUE';
