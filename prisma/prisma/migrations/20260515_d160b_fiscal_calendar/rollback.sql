-- F-7.5 rollback — drop the FiscalCalendar entities.
DROP INDEX IF EXISTS "fiscal_periods_calendarId_startDate_idx";
DROP INDEX IF EXISTS "fiscal_periods_calendarId_periodNumber_key";
DROP TABLE IF EXISTS "fiscal_periods";
DROP INDEX IF EXISTS "fiscal_calendars_startDate_endDate_idx";
DROP INDEX IF EXISTS "fiscal_calendars_fiscalYear_regionCode_key";
DROP INDEX IF EXISTS "fiscal_calendars_name_key";
DROP TABLE IF EXISTS "fiscal_calendars";
