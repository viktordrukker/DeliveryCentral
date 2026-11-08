-- DM-6a-7 rollback.

DROP INDEX IF EXISTS "vendor_skill_areas_skillArea_idx";
DROP TABLE IF EXISTS "vendor_skill_areas";

DROP INDEX IF EXISTS "project_tags_tag_idx";
DROP TABLE IF EXISTS "project_tags";

DROP INDEX IF EXISTS "project_technologies_technology_idx";
DROP TABLE IF EXISTS "project_technologies";
