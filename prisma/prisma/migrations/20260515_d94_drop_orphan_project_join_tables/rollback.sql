-- F-10.2 / D-94 — rollback: re-create the dropped join tables.
-- Idempotent: safe to run repeatedly.

CREATE TABLE IF NOT EXISTS "project_technologies" (
  "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
  "projectId"  UUID         NOT NULL,
  "technology" TEXT         NOT NULL,
  "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "project_technologies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_technologies_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_technologies_projectId_technology_key"
  ON "project_technologies" ("projectId", "technology");

CREATE INDEX IF NOT EXISTS "project_technologies_technology_idx"
  ON "project_technologies" ("technology");

CREATE TABLE IF NOT EXISTS "project_tags" (
  "id"        UUID         NOT NULL DEFAULT gen_random_uuid(),
  "projectId" UUID         NOT NULL,
  "tag"       TEXT         NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "project_tags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_tags_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_tags_projectId_tag_key"
  ON "project_tags" ("projectId", "tag");

CREATE INDEX IF NOT EXISTS "project_tags_tag_idx"
  ON "project_tags" ("tag");
