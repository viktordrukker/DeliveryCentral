-- DM-8-7 — pg_trgm GIN indexes for sub-second fuzzy search.
--
-- Current state: `SELECT ... WHERE name ILIKE '%foo%'` scans the whole
-- table. pg_trgm + GIN drops the worst case from O(N) to O(log N +
-- k) for reasonable selectivity. Index size is 3-4x the text-column
-- size — fine for the tables below.
--
-- Covered columns (matches the DM-R strategic plan §J.34):
--   Project.name
--   ProjectRisk.title
--   CaseRecord.summary
--   Person.displayName
--
-- Classification: REVERSIBLE. DROP EXTENSION IF EXISTS is safe because
-- no constraint references pg_trgm operators — only indexes that we
-- also drop.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Project_name_trgm_idx"
  ON "Project" USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "project_risks_title_trgm_idx"
  ON "project_risks" USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "CaseRecord_summary_trgm_idx"
  ON "CaseRecord" USING gin (summary gin_trgm_ops)
  WHERE summary IS NOT NULL;

CREATE INDEX IF NOT EXISTS "Person_displayName_trgm_idx"
  ON "Person" USING gin ("displayName" gin_trgm_ops);

COMMENT ON INDEX "Project_name_trgm_idx" IS
  'DM-8-7 — trigram GIN index for ILIKE/%similarity% queries on Project.name.';
