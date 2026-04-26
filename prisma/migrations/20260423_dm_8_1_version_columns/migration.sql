-- DM-8-1 — add `version Int` to every mutable aggregate root.
--
-- Optimistic-concurrency control: repositories enforce the WHERE
-- `version = ?` predicate on updates + `version: { increment: 1 }`.
-- Two concurrent UPDATEs see the same version; only the first
-- succeeds, the second gets a zero-row result that the repo surfaces
-- as a P2025 "record to update not found" — correct signal for a
-- retry-or-reconcile flow in the service layer.
--
-- Aggregates targeted (not already carrying a `version` column):
--   Person, OrgUnit, CaseRecord, WorkEvidence,
--   leave_requests, staffing_requests, project_budgets,
--   project_risks.
--
-- NOT NULL with default 1 so existing rows start at 1 without
-- requiring a backfill statement. Repository code adopts the check
-- in a follow-up PR; adding the column now is non-invasive.
--
-- Classification: REVERSIBLE.

ALTER TABLE "Person"              ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "OrgUnit"             ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "CaseRecord"          ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "WorkEvidence"        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "leave_requests"      ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "staffing_requests"   ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "project_budgets"     ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
ALTER TABLE "project_risks"       ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
