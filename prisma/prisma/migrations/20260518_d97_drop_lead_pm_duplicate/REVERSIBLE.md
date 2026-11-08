# F-25 / D-97 — drop duplicate `Project.leadPmPersonId` column

## Forward

Drops the shadow `leadPmPersonId` column from `Project`. The canonical
column is `projectManagerId` (47 referenced sites, FK-backed via the
`ProjectManager` relation, has an index). `leadPmPersonId` was carried
in parallel with no FK, no index, no readers — only a dual-write in
`update-project.service.ts:92` writing the same value as
`projectManagerId`. The dual-write is removed in the same PR.

## Backward

`rollback.sql` re-adds the column (nullable UUID, no FK, no index) and
backfills from `projectManagerId` so legacy code that reads the shadow
column sees a consistent value matching the canonical one.

## Reversibility test

- Apply forward → `\d "Project"` no longer shows `leadPmPersonId`.
- Apply backward → column is back; existing rows have it populated
  from `projectManagerId`.
- Forward again → idempotent (`DROP COLUMN IF EXISTS`).
- Backward again → idempotent (`ADD COLUMN IF NOT EXISTS` + safe UPDATE).
