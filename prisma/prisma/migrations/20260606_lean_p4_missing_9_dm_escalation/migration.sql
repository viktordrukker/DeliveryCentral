-- LEAN-P4-missing-9 — DM escalation approval flow.
--
-- Adds `dm_escalations` table + `DmEscalationStatus` enum.
-- A DM rejection escalates here; a Director either confirms (rejection
-- sticks) or overrides (DM must re-approve). `sourceKind` + `sourceId`
-- are opaque pointers (timesheet | work-hour | milestone | leave) — no
-- FKs because the upstream surfaces are heterogeneous.
--
-- Idempotent (CLAUDE.md memory feedback-migrations-must-be-idempotent):
--   * Enum creation wrapped in `DO $$ ... EXCEPTION WHEN duplicate_object`.
--   * Table create uses `IF NOT EXISTS`.
--   * Every FK + index uses `IF NOT EXISTS` / DO-EXCEPTION.
--
-- REVERSIBLE (DM-R-4). See REVERSIBLE.md.

-- =====================================================================
-- 1. DmEscalationStatus enum
-- =====================================================================

DO $$
BEGIN
  CREATE TYPE "DmEscalationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'OVERRIDDEN', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- =====================================================================
-- 2. dm_escalations table
-- =====================================================================

CREATE TABLE IF NOT EXISTS "dm_escalations" (
  "id"                  UUID PRIMARY KEY,
  "publicId"            VARCHAR(32),
  "sourceKind"          TEXT NOT NULL,
  "sourceId"            UUID NOT NULL,
  "escalatedByPersonId" UUID NOT NULL,
  "escalatedToPersonId" UUID,
  "reason"              TEXT NOT NULL,
  "status"              "DmEscalationStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedAt"          TIMESTAMPTZ(3),
  "resolvedByPersonId"  UUID,
  "resolutionNotes"     TEXT,
  "createdAt"           TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ(3) NOT NULL
);

-- =====================================================================
-- 3. Indexes
-- =====================================================================

CREATE UNIQUE INDEX IF NOT EXISTS "dm_escalations_publicId_key"
  ON "dm_escalations" ("publicId");

CREATE INDEX IF NOT EXISTS "dm_escalations_status_createdAt_idx"
  ON "dm_escalations" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "dm_escalations_escalatedByPersonId_status_idx"
  ON "dm_escalations" ("escalatedByPersonId", "status");

CREATE INDEX IF NOT EXISTS "dm_escalations_escalatedToPersonId_status_idx"
  ON "dm_escalations" ("escalatedToPersonId", "status");

CREATE INDEX IF NOT EXISTS "dm_escalations_resolvedByPersonId_idx"
  ON "dm_escalations" ("resolvedByPersonId");

-- =====================================================================
-- 4. Foreign keys
-- =====================================================================

DO $$
BEGIN
  ALTER TABLE "dm_escalations"
    ADD CONSTRAINT "dm_escalations_escalatedByPersonId_fkey"
    FOREIGN KEY ("escalatedByPersonId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TABLE "dm_escalations"
    ADD CONSTRAINT "dm_escalations_escalatedToPersonId_fkey"
    FOREIGN KEY ("escalatedToPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TABLE "dm_escalations"
    ADD CONSTRAINT "dm_escalations_resolvedByPersonId_fkey"
    FOREIGN KEY ("resolvedByPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;
