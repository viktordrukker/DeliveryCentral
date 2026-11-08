-- F-25 / D-97 — drop the duplicate `Project.leadPmPersonId` column.
--
-- `Project` has carried two UUID columns pointing at the same Person
-- (the project manager): `projectManagerId` (47 referenced sites, the
-- canonical, FK-backed via `ProjectManager` relation) and
-- `leadPmPersonId` (1 referenced site — a dual-write in
-- `update-project.service.ts:92` — no FK, no index, no readers).
--
-- This migration drops the shadow column. The dual-write disappears
-- in the same PR; downstream code is unaffected because nothing reads
-- the column.
--
-- Reversible: rollback re-adds the column (nullable, no FK) and
-- backfills from `projectManagerId` so the shape matches what it
-- looked like before this PR.

ALTER TABLE "Project"
  DROP COLUMN IF EXISTS "leadPmPersonId";
