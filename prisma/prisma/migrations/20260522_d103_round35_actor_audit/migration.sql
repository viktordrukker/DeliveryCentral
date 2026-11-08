-- F-86 / D-103 round 35 — actor-audit on M365DirectoryReconciliationRecord + RadiusReconciliationRecord
--
-- Both are external-system reconciliation rows (M365 directory sync,
-- Radius account sync). Admin resolves conflicts manually so canonical
-- actor-audit pair is high-value observability.
--
-- REVERSIBLE: see rollback.sql.

-- M365DirectoryReconciliationRecord -------------------------------------

ALTER TABLE "M365DirectoryReconciliationRecord"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "M365DirectoryReconciliationRecord"
  ADD CONSTRAINT "M365DirectoryReconciliationRecord_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "M365DirectoryReconciliationRecord"
  ADD CONSTRAINT "M365DirectoryReconciliationRecord_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "M365DirectoryReconciliationRecord_createdByPersonId_idx"
  ON "M365DirectoryReconciliationRecord" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "M365DirectoryReconciliationRecord_updatedByPersonId_idx"
  ON "M365DirectoryReconciliationRecord" ("updatedByPersonId");

-- RadiusReconciliationRecord --------------------------------------------

ALTER TABLE "RadiusReconciliationRecord"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "RadiusReconciliationRecord"
  ADD CONSTRAINT "RadiusReconciliationRecord_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RadiusReconciliationRecord"
  ADD CONSTRAINT "RadiusReconciliationRecord_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "RadiusReconciliationRecord_createdByPersonId_idx"
  ON "RadiusReconciliationRecord" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "RadiusReconciliationRecord_updatedByPersonId_idx"
  ON "RadiusReconciliationRecord" ("updatedByPersonId");
