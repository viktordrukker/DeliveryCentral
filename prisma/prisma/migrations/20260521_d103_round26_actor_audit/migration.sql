-- F-72 / D-103 round 26 — actor-audit columns on PersonResourcePoolMembership + MetadataEntry
--
-- Two more aggregates with full createdAt/updatedAt but no actor-audit pair.
-- PersonResourcePoolMembership tracks resource-pool assignments (RM workspace);
-- MetadataEntry holds tenant-customizable dictionary values (Engineering / HR /
-- Finance taxonomies). Both need "who reshaped this" answerable without
-- audit-log scans.
--
-- REVERSIBLE: see rollback.sql.

-- PersonResourcePoolMembership ------------------------------------------

ALTER TABLE "PersonResourcePoolMembership"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "PersonResourcePoolMembership"
  ADD CONSTRAINT "PersonResourcePoolMembership_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PersonResourcePoolMembership"
  ADD CONSTRAINT "PersonResourcePoolMembership_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PersonResourcePoolMembership_createdByPersonId_idx"
  ON "PersonResourcePoolMembership" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "PersonResourcePoolMembership_updatedByPersonId_idx"
  ON "PersonResourcePoolMembership" ("updatedByPersonId");

-- MetadataEntry ---------------------------------------------------------

ALTER TABLE "MetadataEntry"
  ADD COLUMN IF NOT EXISTS "createdByPersonId" UUID,
  ADD COLUMN IF NOT EXISTS "updatedByPersonId" UUID;

ALTER TABLE "MetadataEntry"
  ADD CONSTRAINT "MetadataEntry_createdByPersonId_fkey"
  FOREIGN KEY ("createdByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MetadataEntry"
  ADD CONSTRAINT "MetadataEntry_updatedByPersonId_fkey"
  FOREIGN KEY ("updatedByPersonId") REFERENCES "Person"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "MetadataEntry_createdByPersonId_idx"
  ON "MetadataEntry" ("createdByPersonId");

CREATE INDEX IF NOT EXISTS "MetadataEntry_updatedByPersonId_idx"
  ON "MetadataEntry" ("updatedByPersonId");
