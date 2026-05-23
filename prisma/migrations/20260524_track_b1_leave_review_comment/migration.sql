-- Track B.1 — capture the reviewer's rejection reason on LeaveRequest.
--
-- Adds a nullable `reviewComment` column so the manager Leave Decision
-- Drawer can persist a one-line justification when rejecting. Approves
-- may set it too (optional). NULL = no comment; default for every
-- existing row.
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent.

ALTER TABLE "leave_requests"
  ADD COLUMN IF NOT EXISTS "reviewComment" TEXT NULL;
