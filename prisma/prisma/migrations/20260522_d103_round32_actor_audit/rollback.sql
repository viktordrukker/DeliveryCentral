-- Rollback for F-83 / D-103 round 32 — ProjectRagSnapshot + CaseStep actor-audit

DROP INDEX IF EXISTS "CaseStep_updatedByPersonId_idx";
DROP INDEX IF EXISTS "CaseStep_createdByPersonId_idx";
DROP INDEX IF EXISTS "project_rag_snapshots_updatedByPersonId_idx";
DROP INDEX IF EXISTS "project_rag_snapshots_createdByPersonId_idx";

ALTER TABLE "CaseStep"
  DROP CONSTRAINT IF EXISTS "CaseStep_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "CaseStep_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

ALTER TABLE "project_rag_snapshots"
  DROP CONSTRAINT IF EXISTS "project_rag_snapshots_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "project_rag_snapshots_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";
