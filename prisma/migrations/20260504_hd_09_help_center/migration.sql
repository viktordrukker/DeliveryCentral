-- HD-9 — Help Center MVP (J11). Four tables: articles, route-pinned
-- tips, per-user feedback, per-user onboarding-tour progress.

CREATE TABLE IF NOT EXISTS "help_articles" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug"           TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "summary"        TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "tags"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isPublished"    BOOLEAN NOT NULL DEFAULT FALSE,
  "authorPersonId" UUID,
  "tenantId"       UUID,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"     TIMESTAMPTZ(3),
  CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_articles_slug_key') THEN
    ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_slug_key" UNIQUE ("slug");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_articles_authorPersonId_fkey') THEN
    ALTER TABLE "help_articles"
      ADD CONSTRAINT "help_articles_authorPersonId_fkey"
      FOREIGN KEY ("authorPersonId") REFERENCES "Person"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_articles_tenantId_fkey') THEN
    ALTER TABLE "help_articles"
      ADD CONSTRAINT "help_articles_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "help_articles_isPublished_archivedAt_idx"
  ON "help_articles" ("isPublished", "archivedAt");
CREATE INDEX IF NOT EXISTS "help_articles_tenantId_idx" ON "help_articles" ("tenantId");
CREATE INDEX IF NOT EXISTS "help_articles_authorPersonId_idx"
  ON "help_articles" ("authorPersonId");

CREATE TABLE IF NOT EXISTS "help_tips" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "key"          TEXT NOT NULL,
  "routePath"    TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "body"         TEXT NOT NULL,
  "articleId"    UUID,
  "displayOrder" INTEGER NOT NULL DEFAULT 100,
  "isActive"     BOOLEAN NOT NULL DEFAULT TRUE,
  "tenantId"     UUID,
  "createdAt"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"   TIMESTAMPTZ(3),
  CONSTRAINT "help_tips_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_tips_key_key') THEN
    ALTER TABLE "help_tips" ADD CONSTRAINT "help_tips_key_key" UNIQUE ("key");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_tips_articleId_fkey') THEN
    ALTER TABLE "help_tips"
      ADD CONSTRAINT "help_tips_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "help_articles"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_tips_tenantId_fkey') THEN
    ALTER TABLE "help_tips"
      ADD CONSTRAINT "help_tips_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "help_tips_routePath_isActive_idx"
  ON "help_tips" ("routePath", "isActive");
CREATE INDEX IF NOT EXISTS "help_tips_articleId_idx" ON "help_tips" ("articleId");
CREATE INDEX IF NOT EXISTS "help_tips_tenantId_idx" ON "help_tips" ("tenantId");

CREATE TABLE IF NOT EXISTS "help_feedback" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "articleId"     UUID NOT NULL,
  "actorPersonId" UUID,
  "wasHelpful"    BOOLEAN NOT NULL,
  "comment"       TEXT,
  "tenantId"      UUID,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "help_feedback_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_feedback_articleId_fkey') THEN
    ALTER TABLE "help_feedback"
      ADD CONSTRAINT "help_feedback_articleId_fkey"
      FOREIGN KEY ("articleId") REFERENCES "help_articles"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_feedback_actorPersonId_fkey') THEN
    ALTER TABLE "help_feedback"
      ADD CONSTRAINT "help_feedback_actorPersonId_fkey"
      FOREIGN KEY ("actorPersonId") REFERENCES "Person"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'help_feedback_tenantId_fkey') THEN
    ALTER TABLE "help_feedback"
      ADD CONSTRAINT "help_feedback_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "help_feedback_articleId_createdAt_idx"
  ON "help_feedback" ("articleId", "createdAt");
CREATE INDEX IF NOT EXISTS "help_feedback_actorPersonId_idx"
  ON "help_feedback" ("actorPersonId");
CREATE INDEX IF NOT EXISTS "help_feedback_tenantId_idx" ON "help_feedback" ("tenantId");

CREATE TABLE IF NOT EXISTS "onboarding_tour_progress" (
  "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
  "personId"       UUID NOT NULL,
  "tourKey"        TEXT NOT NULL,
  "completedSteps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dismissedAt"    TIMESTAMPTZ(3),
  "completedAt"    TIMESTAMPTZ(3),
  "tenantId"       UUID,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "onboarding_tour_progress_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_tour_progress_personId_tourKey_key') THEN
    ALTER TABLE "onboarding_tour_progress"
      ADD CONSTRAINT "onboarding_tour_progress_personId_tourKey_key"
      UNIQUE ("personId", "tourKey");
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_tour_progress_personId_fkey') THEN
    ALTER TABLE "onboarding_tour_progress"
      ADD CONSTRAINT "onboarding_tour_progress_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"("id")
      ON UPDATE CASCADE ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'onboarding_tour_progress_tenantId_fkey') THEN
    ALTER TABLE "onboarding_tour_progress"
      ADD CONSTRAINT "onboarding_tour_progress_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "onboarding_tour_progress_tourKey_idx"
  ON "onboarding_tour_progress" ("tourKey");
CREATE INDEX IF NOT EXISTS "onboarding_tour_progress_tenantId_idx"
  ON "onboarding_tour_progress" ("tenantId");
