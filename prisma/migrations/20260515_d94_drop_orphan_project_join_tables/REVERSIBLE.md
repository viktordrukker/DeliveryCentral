# F-10.2 / D-94 — drop orphaned project_technologies + project_tags

## Forward
Drops the `project_technologies` + `project_tags` join tables. Both
were created in earlier sprints to back `Project.technologies[]` and
`Project.tagList[]` collections, but the audit (2026-05-15) confirmed
zero write references across `src/`, `frontend/src/`, `test/`,
`prisma/seeds/`. `Project.tags[]` + `techStack[]` arrays on `Project`
remain the de-facto source of truth.

## Backward
`rollback.sql` re-creates both tables with the original shape:
- `id uuid PK default gen_random_uuid()`
- `projectId uuid FK → projects(id) ON DELETE CASCADE ON UPDATE CASCADE`
- value column (`technology` / `tag` text)
- `createdAt timestamptz(3) default now()`
- composite `UNIQUE (projectId, value)` + `INDEX (value)`

## Reversibility test
- Apply forward → `\d project_technologies` returns "does not exist".
- Apply backward → tables re-appear with original constraints.
- Forward again → idempotent (`DROP TABLE IF EXISTS`).
- Backward again → idempotent (`CREATE TABLE IF NOT EXISTS`).
- Pre-existing data is destroyed by the forward migration; recovery
  from a snapshot is required if rows existed (none did at apply time).
