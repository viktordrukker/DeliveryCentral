-- F-88 / D-103 round 37 — second createdByPersonId bundle (5 aggregates)
--
-- Pattern: immutable rows (createdAt only). Each gets createdByPersonId
-- + FK + index. Bundled for CI/CD efficiency.
--
-- Aggregates:
--   CaseParticipant       — admin/PM adds a person to a case
--   OutboxEvent           — service producer / request principal
--   WorkEvidenceLink      — admin attaches external evidence link
--   in_app_notifications  — system broadcasts (recipient distinct from creator)
--   fiscal_periods        — admin-derived from FiscalCalendar setup
--
-- Mixed table mapping: PascalCase except in_app_notifications + fiscal_periods.
--
-- REVERSIBLE: see rollback.sql.

-- CaseParticipant -------------------------------------------------------

ALTER TABLE "CaseParticipant"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "CaseParticipant"
  ADD CONSTRAINT "CaseParticipant_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CaseParticipant_createdByPersonId_idx"
  ON "CaseParticipant" ("createdByPersonId");

-- OutboxEvent -----------------------------------------------------------

ALTER TABLE "OutboxEvent"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "OutboxEvent"
  ADD CONSTRAINT "OutboxEvent_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "OutboxEvent_createdByPersonId_idx"
  ON "OutboxEvent" ("createdByPersonId");

-- WorkEvidenceLink ------------------------------------------------------

ALTER TABLE "WorkEvidenceLink"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "WorkEvidenceLink"
  ADD CONSTRAINT "WorkEvidenceLink_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "WorkEvidenceLink_createdByPersonId_idx"
  ON "WorkEvidenceLink" ("createdByPersonId");

-- in_app_notifications (InAppNotification) -------------------------------

ALTER TABLE "in_app_notifications"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "in_app_notifications"
  ADD CONSTRAINT "in_app_notifications_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "in_app_notifications_createdByPersonId_idx"
  ON "in_app_notifications" ("createdByPersonId");

-- fiscal_periods (FiscalPeriod) -----------------------------------------

ALTER TABLE "fiscal_periods"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID;

ALTER TABLE "fiscal_periods"
  ADD CONSTRAINT "fiscal_periods_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "fiscal_periods_createdByPersonId_idx"
  ON "fiscal_periods" ("createdByPersonId");
