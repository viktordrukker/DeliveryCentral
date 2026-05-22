-- Rollback for F-88 / D-103 round 37 — second createdByPersonId bundle

DROP INDEX IF EXISTS "fiscal_periods_createdByPersonId_idx";
DROP INDEX IF EXISTS "in_app_notifications_createdByPersonId_idx";
DROP INDEX IF EXISTS "WorkEvidenceLink_createdByPersonId_idx";
DROP INDEX IF EXISTS "OutboxEvent_createdByPersonId_idx";
DROP INDEX IF EXISTS "CaseParticipant_createdByPersonId_idx";

ALTER TABLE "fiscal_periods"
  DROP CONSTRAINT IF EXISTS "fiscal_periods_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "in_app_notifications"
  DROP CONSTRAINT IF EXISTS "in_app_notifications_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "WorkEvidenceLink"
  DROP CONSTRAINT IF EXISTS "WorkEvidenceLink_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "OutboxEvent"
  DROP CONSTRAINT IF EXISTS "OutboxEvent_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "CaseParticipant"
  DROP CONSTRAINT IF EXISTS "CaseParticipant_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "createdByPersonId";
