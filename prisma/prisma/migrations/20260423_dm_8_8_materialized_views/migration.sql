-- DM-8-8 — materialized views for common rollups.
--
-- `read_models` schema isolates derived data; app_reporting reads
-- from here for heavy analytics without touching OLTP tables. Every
-- MV declares an operator refresh path (REFRESH MATERIALIZED VIEW
-- CONCURRENTLY <name>) which requires at least one UNIQUE index on
-- the MV — added here.
--
-- Two seed views:
--   read_models.mv_project_weekly_roster
--     (weekStart, projectId, personId, allocationPercent)
--   read_models.mv_person_week_hours
--     (weekStart, personId, totalHours)
--
-- Refresh strategy: manually via DomainEvent-driven worker (future)
-- or via pg_cron (future); today the MVs stay stale until an
-- operator refreshes them. Operator dashboards surface staleness
-- via a timestamp column.
--
-- Classification: REVERSIBLE.

CREATE SCHEMA IF NOT EXISTS read_models;

-- Grants so app_reader + app_reporting see the views.
GRANT USAGE ON SCHEMA read_models TO app_reader, app_reporting, app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA read_models GRANT SELECT ON TABLES TO app_reader, app_reporting, app_runtime;

-- ====================================================
-- mv_project_weekly_roster: who worked on what, per week
-- ====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS read_models.mv_project_weekly_roster AS
  SELECT
    date_trunc('week', pa."validFrom")::date AS "weekStart",
    pa."projectId",
    pa."personId",
    MAX(pa."allocationPercent")::numeric(5,2) AS "allocationPercent",
    COUNT(*) AS "assignmentCount",
    NOW() AS "refreshedAt"
  FROM "ProjectAssignment" pa
  WHERE pa."archivedAt" IS NULL
    AND pa."personId" IS NOT NULL
  GROUP BY date_trunc('week', pa."validFrom"), pa."projectId", pa."personId"
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS "mv_project_weekly_roster_pk"
  ON read_models.mv_project_weekly_roster ("weekStart", "projectId", "personId");
CREATE INDEX IF NOT EXISTS "mv_project_weekly_roster_project_idx"
  ON read_models.mv_project_weekly_roster ("projectId");
CREATE INDEX IF NOT EXISTS "mv_project_weekly_roster_person_idx"
  ON read_models.mv_project_weekly_roster ("personId");

-- ====================================================
-- mv_person_week_hours: hours submitted, per person per week
-- ====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS read_models.mv_person_week_hours AS
  SELECT
    tw."weekStart"::date AS "weekStart",
    tw."personId",
    COALESCE(SUM(te.hours), 0)::numeric(8,2) AS "totalHours",
    COUNT(te.id) AS "entryCount",
    NOW() AS "refreshedAt"
  FROM timesheet_weeks tw
  LEFT JOIN timesheet_entries te ON te."timesheetWeekId" = tw.id
  GROUP BY tw."weekStart", tw."personId"
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS "mv_person_week_hours_pk"
  ON read_models.mv_person_week_hours ("weekStart", "personId");
CREATE INDEX IF NOT EXISTS "mv_person_week_hours_person_idx"
  ON read_models.mv_person_week_hours ("personId");

COMMENT ON MATERIALIZED VIEW read_models.mv_project_weekly_roster IS
  'DM-8-8 — rollup of ProjectAssignment by week. Refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY read_models.mv_project_weekly_roster.';
COMMENT ON MATERIALIZED VIEW read_models.mv_person_week_hours IS
  'DM-8-8 — weekly hours per person from timesheet_weeks + timesheet_entries.';
