-- ds-trunk-10 — per-person notification digest + quiet-hours settings
--
-- Adds a side table keyed by personId for the two new sections of the /me
-- Settings tab (Digest schedule radio + Quiet hours time-range). Absent row
-- = defaults apply, so existing persons need no backfill.
--
-- Idempotent per CLAUDE.md memory feedback-migrations-must-be-idempotent.

-- ── DigestSchedule enum ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DigestSchedule') THEN
    CREATE TYPE "DigestSchedule" AS ENUM ('IMMEDIATE', 'DAILY_9AM', 'WEEKLY_MON_9AM');
  END IF;
END
$$;

-- ── person_notification_digest table ──────────────────────────────────────
-- updatedAt: no DB-level DEFAULT; Prisma `@updatedAt` writes the value
-- client-side on every update, matching schema.prisma's expectation.
CREATE TABLE IF NOT EXISTS "person_notification_digest" (
  "personId"            UUID            PRIMARY KEY,
  "digestSchedule"      "DigestSchedule" NOT NULL DEFAULT 'IMMEDIATE',
  "quietHoursStart"     TEXT            NULL,
  "quietHoursEnd"       TEXT            NULL,
  "quietHoursEmailOnly" BOOLEAN         NOT NULL DEFAULT TRUE,
  "updatedAt"           TIMESTAMPTZ(3)  NOT NULL
);

-- ── Foreign key to Person(id) — matches Prisma's auto-generated naming ────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'person_notification_digest_personId_fkey'
  ) THEN
    ALTER TABLE "person_notification_digest"
      ADD CONSTRAINT "person_notification_digest_personId_fkey"
      FOREIGN KEY ("personId") REFERENCES "Person"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- ── Sanity-check format constraint on HH:MM time strings ──────────────────
-- Empty / NULL allowed; populated value must match 'HH:MM' 24h pattern.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'person_notification_digest_quiet_hours_start_format_check'
  ) THEN
    ALTER TABLE "person_notification_digest"
      ADD CONSTRAINT "person_notification_digest_quiet_hours_start_format_check"
      CHECK ("quietHoursStart" IS NULL OR "quietHoursStart" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'person_notification_digest_quiet_hours_end_format_check'
  ) THEN
    ALTER TABLE "person_notification_digest"
      ADD CONSTRAINT "person_notification_digest_quiet_hours_end_format_check"
      CHECK ("quietHoursEnd" IS NULL OR "quietHoursEnd" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
  END IF;
  -- Either both ends set or both null — no half-configured windows.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'person_notification_digest_quiet_hours_pairing_check'
  ) THEN
    ALTER TABLE "person_notification_digest"
      ADD CONSTRAINT "person_notification_digest_quiet_hours_pairing_check"
      CHECK (
        ("quietHoursStart" IS NULL AND "quietHoursEnd" IS NULL)
        OR ("quietHoursStart" IS NOT NULL AND "quietHoursEnd" IS NOT NULL)
      );
  END IF;
END
$$;
