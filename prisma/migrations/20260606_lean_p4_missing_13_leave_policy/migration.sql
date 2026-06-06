-- LEAN-P4-missing-13 — Admin LeavePolicy CRUD.
--
-- Backs the /admin Leave Policies surface so tenant admins can configure
-- leave types' default entitlement, max carry-over, and the approval-chain
-- role list from the UI instead of hard-coded constants. The
-- LeaveBalanceService picks up `accrualPerYear` as the default
-- entitlement when ensuring a balance row for a (person, year, type).
--
-- Schema:
--   leave_policies (id, publicId, name, leaveType, accrualPerYear,
--                   maxCarryOver, approvalChain text[], active,
--                   createdAt, updatedAt, createdByPersonId,
--                   updatedByPersonId)
--
-- Indexes:
--   leave_policies_leaveType_active_idx        — list active by type
--   leave_policies_createdByPersonId_idx       — D-103 actor-audit
--   leave_policies_updatedByPersonId_idx       — D-103 actor-audit
--   leave_policies_publicId_key (unique)       — DM-2.5 publicId egress
--
-- FKs:
--   leave_policies_createdByPersonId_fkey → Person(id) ON DELETE SET NULL
--   leave_policies_updatedByPersonId_fkey → Person(id) ON DELETE SET NULL
--
-- Idempotent (CLAUDE.md memory feedback-migrations-must-be-idempotent):
--   * CREATE TABLE / CREATE INDEX use IF NOT EXISTS.
--   * FK adds are wrapped in DO $$ … EXCEPTION blocks.
--
-- REVERSIBLE (DM-R-4). See REVERSIBLE.md.

CREATE TABLE IF NOT EXISTS "leave_policies" (
  "id"                UUID NOT NULL,
  "publicId"          VARCHAR(32),
  "name"              TEXT NOT NULL,
  "leaveType"         "LeaveRequestType" NOT NULL,
  "accrualPerYear"    INTEGER NOT NULL,
  "maxCarryOver"      INTEGER NOT NULL,
  "approvalChain"     TEXT[] NOT NULL,
  "active"            BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"         TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ(3) NOT NULL,
  "createdByPersonId" UUID,
  "updatedByPersonId" UUID,
  CONSTRAINT "leave_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "leave_policies_publicId_key"
  ON "leave_policies" ("publicId");

CREATE INDEX IF NOT EXISTS "leave_policies_leaveType_active_idx"
  ON "leave_policies" ("leaveType", "active");

CREATE INDEX IF NOT EXISTS "leave_policies_createdByPersonId_idx"
  ON "leave_policies" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "leave_policies_updatedByPersonId_idx"
  ON "leave_policies" ("updatedByPersonId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_policies_createdByPersonId_fkey'
  ) THEN
    ALTER TABLE "leave_policies"
      ADD CONSTRAINT "leave_policies_createdByPersonId_fkey"
      FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leave_policies_updatedByPersonId_fkey'
  ) THEN
    ALTER TABLE "leave_policies"
      ADD CONSTRAINT "leave_policies_updatedByPersonId_fkey"
      FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
