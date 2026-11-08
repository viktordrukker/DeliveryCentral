-- F-78 / D-103 round 29 — actor-audit columns on EntityLayoutDefinition + HelpTip
--
-- EntityLayoutDefinition holds tenant-scoped UI layout JSON; HelpTip
-- holds inline contextual help fragments. Both have full createdAt/
-- updatedAt timestamps; neither carries actor-audit columns today.
-- Admin edits in both surfaces are observability-relevant.
--
-- REVERSIBLE: see rollback.sql.

-- EntityLayoutDefinition ------------------------------------------------

ALTER TABLE "EntityLayoutDefinition"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "EntityLayoutDefinition"
  ADD CONSTRAINT "EntityLayoutDefinition_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EntityLayoutDefinition"
  ADD CONSTRAINT "EntityLayoutDefinition_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "EntityLayoutDefinition_createdByPersonId_idx"
  ON "EntityLayoutDefinition" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "EntityLayoutDefinition_updatedByPersonId_idx"
  ON "EntityLayoutDefinition" ("updatedByPersonId");

-- HelpTip ---------------------------------------------------------------

ALTER TABLE "help_tips"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "help_tips"
  ADD CONSTRAINT "help_tips_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "help_tips"
  ADD CONSTRAINT "help_tips_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "help_tips_createdByPersonId_idx"
  ON "help_tips" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "help_tips_updatedByPersonId_idx"
  ON "help_tips" ("updatedByPersonId");
