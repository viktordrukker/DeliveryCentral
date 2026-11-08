-- F-10.3 / D-103 + F-10.4 / D-104 — rollback. Idempotent.

-- D-103 reverse: ProjectAssignment
DROP INDEX IF EXISTS "ProjectAssignment_updatedByPersonId_idx";
DROP INDEX IF EXISTS "ProjectAssignment_createdByPersonId_idx";
ALTER TABLE "ProjectAssignment"
  DROP CONSTRAINT IF EXISTS "ProjectAssignment_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "ProjectAssignment_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

-- D-103 reverse: Project
DROP INDEX IF EXISTS "Project_updatedByPersonId_idx";
DROP INDEX IF EXISTS "Project_createdByPersonId_idx";
ALTER TABLE "Project"
  DROP CONSTRAINT IF EXISTS "Project_updatedByPersonId_fkey",
  DROP CONSTRAINT IF EXISTS "Project_createdByPersonId_fkey",
  DROP COLUMN IF EXISTS "updatedByPersonId",
  DROP COLUMN IF EXISTS "createdByPersonId";

-- D-104 reverse: staffing_request_fulfilments
ALTER TABLE "staffing_request_fulfilments"
  DROP COLUMN IF EXISTS "updatedAt",
  DROP COLUMN IF EXISTS "createdAt";

-- D-104 reverse: person_release_approvals
ALTER TABLE "person_release_approvals"
  DROP COLUMN IF EXISTS "updatedAt",
  DROP COLUMN IF EXISTS "createdAt";
