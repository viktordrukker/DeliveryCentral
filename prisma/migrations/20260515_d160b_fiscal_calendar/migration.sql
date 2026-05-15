-- F-7.5 / D-160b — Fiscal Calendar entities.
--
-- Two tables: `fiscal_calendars` (one row per tenant FY) and
-- `fiscal_periods` (12 monthly rows per calendar, grouped into 4
-- quarters). Index + FK names follow Prisma conventions.
--
-- Forward: create both tables + indexes + FKs.
-- Rollback: drop them in dependency order.

CREATE TABLE IF NOT EXISTS "fiscal_calendars" (
  "id"          UUID NOT NULL,
  "name"        TEXT NOT NULL,
  "fiscalYear"  INTEGER NOT NULL,
  "startDate"   DATE NOT NULL,
  "endDate"     DATE NOT NULL,
  "regionCode"  TEXT,
  "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "fiscal_calendars_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_calendars_name_key"
  ON "fiscal_calendars" ("name");

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_calendars_fiscalYear_regionCode_key"
  ON "fiscal_calendars" ("fiscalYear", "regionCode");

CREATE INDEX IF NOT EXISTS "fiscal_calendars_startDate_endDate_idx"
  ON "fiscal_calendars" ("startDate", "endDate");

CREATE TABLE IF NOT EXISTS "fiscal_periods" (
  "id"            UUID NOT NULL,
  "calendarId"    UUID NOT NULL,
  "periodNumber"  INTEGER NOT NULL,
  "quarter"       INTEGER NOT NULL,
  "startDate"     DATE NOT NULL,
  "endDate"       DATE NOT NULL,
  "label"         TEXT,
  "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_calendarId_fkey"
    FOREIGN KEY ("calendarId") REFERENCES "fiscal_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_periods_calendarId_periodNumber_key"
  ON "fiscal_periods" ("calendarId", "periodNumber");

CREATE INDEX IF NOT EXISTS "fiscal_periods_calendarId_startDate_idx"
  ON "fiscal_periods" ("calendarId", "startDate");
