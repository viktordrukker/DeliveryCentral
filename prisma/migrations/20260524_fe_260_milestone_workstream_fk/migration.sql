-- FE-#260 — typed FK ProjectMilestone.workstreamId → project_workstreams.id.
--
-- The `workstreamId` column already exists (added with the V2-0 workstream
-- stub) but ran without a foreign-key constraint or covering index. The Pulse
-- Gantt swimlanes need to group milestones by workstream, and the FK
-- protects against orphaned references when a workstream is dropped.
--
-- Backfill: existing rows already reference valid workstreams (the column
-- was populated by the V2-0 seed) OR are NULL. No data movement required.
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent.

-- ── Foreign key ───────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_milestones_workstreamId_fkey'
  ) THEN
    ALTER TABLE "project_milestones"
      ADD CONSTRAINT "project_milestones_workstreamId_fkey"
      FOREIGN KEY ("workstreamId") REFERENCES "project_workstreams"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- ── Covering index (DM-R required for every FK column) ───────────────────
CREATE INDEX IF NOT EXISTS "project_milestones_workstreamId_idx"
  ON "project_milestones" ("workstreamId");
