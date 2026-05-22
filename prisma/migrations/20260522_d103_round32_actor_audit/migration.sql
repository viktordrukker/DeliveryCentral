-- F-83 / D-103 round 32 — actor-audit columns on ProjectRagSnapshot + CaseStep
--
-- ProjectRagSnapshot (mapped table: project_rag_snapshots) records weekly
-- RAG status per project (PM writes, RM reads). It already carries
-- `recordedByPersonId` — distinct from canonical "who created/last-edited
-- the row" semantic. CaseStep holds workflow-step state on each case.
-- Both edit surfaces want canonical actor-audit observability.
--
-- REVERSIBLE: see rollback.sql.

-- project_rag_snapshots (ProjectRagSnapshot) ----------------------------

ALTER TABLE "project_rag_snapshots"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "project_rag_snapshots"
  ADD CONSTRAINT "project_rag_snapshots_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_rag_snapshots"
  ADD CONSTRAINT "project_rag_snapshots_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "project_rag_snapshots_createdByPersonId_idx"
  ON "project_rag_snapshots" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "project_rag_snapshots_updatedByPersonId_idx"
  ON "project_rag_snapshots" ("updatedByPersonId");

-- CaseStep --------------------------------------------------------------

ALTER TABLE "CaseStep"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "CaseStep"
  ADD CONSTRAINT "CaseStep_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CaseStep"
  ADD CONSTRAINT "CaseStep_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CaseStep_createdByPersonId_idx"
  ON "CaseStep" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "CaseStep_updatedByPersonId_idx"
  ON "CaseStep" ("updatedByPersonId");
