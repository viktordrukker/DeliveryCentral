-- F-21 / D-104 — finish framework-time timestamps on
-- `project_activation_approvals`. The table has `requestedAt` +
-- `decidedAt` business-time columns; this adds the standard
-- `createdAt` + `updatedAt` framework-time pair so the model
-- conforms to the schema-conventions baseline applied to the rest
-- of the registry aggregates.
--
-- Continues the F-10.4 pattern (which covered
-- `person_release_approvals` + `staffing_request_fulfilments`).
-- Existing rows are backfilled from `requestedAt` to preserve
-- ordering invariants.
--
-- Reversible: rollback drops both columns.

ALTER TABLE "project_activation_approvals"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing rows: createdAt mirrors requestedAt; updatedAt
-- mirrors decidedAt when present, otherwise requestedAt.
UPDATE "project_activation_approvals"
   SET "createdAt" = "requestedAt",
       "updatedAt" = COALESCE("decidedAt", "requestedAt")
 WHERE "createdAt" = "updatedAt" AND "createdAt" >= CURRENT_TIMESTAMP - INTERVAL '5 minutes';
