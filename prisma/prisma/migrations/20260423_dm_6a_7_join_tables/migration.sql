-- DM-6a-7 — join tables for `Project.techStack`, `Project.tags`,
-- `Vendor.skillAreas`.
--
-- Replaces three denormalized `text[]` columns with proper join
-- tables. Zero rows currently populate the `text[]` values (verified),
-- so no data migration. DM-6b-1 drops the `text[]` columns.
--
-- Classification: REVERSIBLE.

CREATE TABLE IF NOT EXISTS "project_technologies" (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" uuid        NOT NULL,
  technology  text        NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "project_technologies_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "project_technologies_projectId_technology_key"
    UNIQUE ("projectId", technology)
);
CREATE INDEX IF NOT EXISTS "project_technologies_technology_idx"
  ON "project_technologies" (technology);

CREATE TABLE IF NOT EXISTS "project_tags" (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectId" uuid        NOT NULL,
  tag         text        NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "project_tags_projectId_fkey" FOREIGN KEY ("projectId")
    REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "project_tags_projectId_tag_key" UNIQUE ("projectId", tag)
);
CREATE INDEX IF NOT EXISTS "project_tags_tag_idx" ON "project_tags" (tag);

CREATE TABLE IF NOT EXISTS "vendor_skill_areas" (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "vendorId"  uuid        NOT NULL,
  "skillArea" text        NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT "vendor_skill_areas_vendorId_fkey" FOREIGN KEY ("vendorId")
    REFERENCES vendors(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT "vendor_skill_areas_vendorId_skillArea_key"
    UNIQUE ("vendorId", "skillArea")
);
CREATE INDEX IF NOT EXISTS "vendor_skill_areas_skillArea_idx"
  ON "vendor_skill_areas" ("skillArea");
