-- F-7.2 / D-163 — drop the implicit 'AU' default on PublicHoliday.countryCode.
--
-- Forward: clear the column default. Existing rows are untouched (their
-- countryCode value is preserved). New INSERTs must specify a value;
-- the application service (`PublicHolidayService`) resolves the tenant
-- default from `general.countryCode` PlatformSetting and falls back to
-- 'AU' for backwards compat when the setting is unset.
--
-- Reversible: the rollback re-applies the default.

ALTER TABLE "public_holidays"
  ALTER COLUMN "countryCode" DROP DEFAULT;
