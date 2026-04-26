-- DM-4-2 pilot — promote `WorkEvidence.evidenceType` from text to enum.
--
-- This is the canonical pattern for every DM-4-2 enum promotion in the
-- plan (13 string-typed status / kind fields). Subsequent migrations
-- copy this shape.
--
-- Dev-scale strategy (< 10 k rows): direct `ALTER COLUMN TYPE <enum>
-- USING col::<enum>`. Production-scale (> 1 M rows) uses a shadow-column
-- pattern — see the DM-4-2 section of dm2-expand-contract-runbook.md.
--
-- Values captured from current dev DB:
--   JIRA_WORKLOG, MANUAL_ENTRY, TIMESHEET_ENTRY
--
-- Classification: REVERSIBLE. Rollback casts enum → text; data
-- round-trips losslessly because enum labels are the same strings.

CREATE TYPE "WorkEvidenceType" AS ENUM (
  'JIRA_WORKLOG',
  'MANUAL_ENTRY',
  'TIMESHEET_ENTRY'
);

ALTER TABLE "WorkEvidence"
  ALTER COLUMN "evidenceType" TYPE "WorkEvidenceType"
  USING "evidenceType"::"WorkEvidenceType";
