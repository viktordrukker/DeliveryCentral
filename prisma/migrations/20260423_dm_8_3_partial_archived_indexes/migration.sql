-- DM-8-3 — partial `WHERE archivedAt IS NULL` indexes on hot tables.
--
-- Every list query in the app filters out archived rows. A regular
-- index on archivedAt + key doesn't help much because archivedAt is
-- usually NULL. A PARTIAL index `WHERE archivedAt IS NULL` is smaller
-- (active-only rows) and directly matches the app's default query
-- shape.
--
-- Tables covered: the hot read paths. Leaves dictionary + config
-- tables (MetadataDictionary, CustomFieldDefinition, etc.) alone —
-- those are rarely-read.
--
-- Classification: REVERSIBLE.

CREATE INDEX IF NOT EXISTS "Person_active_idx"
  ON "Person" (id) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Project_active_idx"
  ON "Project" (id) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "ProjectAssignment_active_idx"
  ON "ProjectAssignment" (id) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "CaseRecord_active_idx"
  ON "CaseRecord" (id) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "OrgUnit_active_idx"
  ON "OrgUnit" (id) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Position_active_idx"
  ON "Position" (id) WHERE "archivedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "ResourcePool_active_idx"
  ON "ResourcePool" (id) WHERE "archivedAt" IS NULL;
