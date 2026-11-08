-- HD-9 rollback — drops the four Help Center tables in reverse
-- dependency order (feedback + tip + progress reference articles).

DROP INDEX IF EXISTS "onboarding_tour_progress_tenantId_idx";
DROP INDEX IF EXISTS "onboarding_tour_progress_tourKey_idx";
DROP TABLE IF EXISTS "onboarding_tour_progress";

DROP INDEX IF EXISTS "help_feedback_tenantId_idx";
DROP INDEX IF EXISTS "help_feedback_actorPersonId_idx";
DROP INDEX IF EXISTS "help_feedback_articleId_createdAt_idx";
DROP TABLE IF EXISTS "help_feedback";

DROP INDEX IF EXISTS "help_tips_tenantId_idx";
DROP INDEX IF EXISTS "help_tips_articleId_idx";
DROP INDEX IF EXISTS "help_tips_routePath_isActive_idx";
DROP TABLE IF EXISTS "help_tips";

DROP INDEX IF EXISTS "help_articles_authorPersonId_idx";
DROP INDEX IF EXISTS "help_articles_tenantId_idx";
DROP INDEX IF EXISTS "help_articles_isPublished_archivedAt_idx";
DROP TABLE IF EXISTS "help_articles";
