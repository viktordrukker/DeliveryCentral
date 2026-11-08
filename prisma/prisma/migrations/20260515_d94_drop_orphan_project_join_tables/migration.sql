-- F-10.2 / D-94 — drop orphaned project_technologies + project_tags join tables.
--
-- Forward: drop the two join tables. Audit (2026-05-15) confirmed zero
-- write references in `src/`, `frontend/src/`, `test/`, `prisma/seeds/`,
-- and no FK from any other table. `Project.tagList[]` + `techStack[]`
-- arrays remain the de-facto source of truth.
--
-- Reversible: rollback re-creates both tables with the original schema
-- (id uuid PK + projectId FK Cascade + value column + createdAt +
-- composite UNIQUE + value index).

DROP TABLE IF EXISTS "project_technologies";
DROP TABLE IF EXISTS "project_tags";
