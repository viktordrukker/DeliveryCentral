-- F-74 / D-103 round 27 — actor-audit columns on PulseReport + IntegrationSyncState
--
-- Two more aggregates with full createdAt/updatedAt but no canonical
-- actor-audit pair. PulseReport tracks weekly project-pulse submissions
-- (PM cadence); IntegrationSyncState records sync cursors per
-- provider/resource (M365 + Radius + Jira + JSM + LDAP).
--
-- PulseReport already has `submittedByPersonId` (the form submitter) —
-- distinct from the canonical "who created/last-edited the row"
-- semantic. Adding the pair brings it into uniform shape.
--
-- Note: PulseReport's mapped table is `pulse_reports` (snake_case).
--
-- REVERSIBLE: see rollback.sql.

-- pulse_reports (PulseReport) -------------------------------------------

ALTER TABLE "pulse_reports"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "pulse_reports"
  ADD CONSTRAINT "pulse_reports_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pulse_reports"
  ADD CONSTRAINT "pulse_reports_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "pulse_reports_createdByPersonId_idx"
  ON "pulse_reports" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "pulse_reports_updatedByPersonId_idx"
  ON "pulse_reports" ("updatedByPersonId");

-- IntegrationSyncState --------------------------------------------------

ALTER TABLE "IntegrationSyncState"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "IntegrationSyncState"
  ADD CONSTRAINT "IntegrationSyncState_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IntegrationSyncState"
  ADD CONSTRAINT "IntegrationSyncState_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "IntegrationSyncState_createdByPersonId_idx"
  ON "IntegrationSyncState" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "IntegrationSyncState_updatedByPersonId_idx"
  ON "IntegrationSyncState" ("updatedByPersonId");
