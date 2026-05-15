# F-7.2 / D-163 — PublicHoliday drop AU default

## Forward
Clears the implicit `'AU'` column default on `public_holidays.countryCode`. Existing rows are untouched. New INSERTs must specify a value.

The application layer (`PublicHolidayService`) consults the `general.countryCode` PlatformSetting for the tenant default, falling back to `'AU'` when unset — so behaviour for tenants that haven't yet picked a region is unchanged.

## Backward
`rollback.sql` re-applies the `'AU'` default. Safe to run at any time — defaults are pure metadata; row data is never destroyed by adding or dropping one.

## Reversibility test
- Apply forward → `\d public_holidays` shows no default on `countryCode`.
- Apply backward → default returns.
- Forward again → no-op (Postgres accepts `DROP DEFAULT` even when none is set).
- Backward again → no-op (idempotent re-set).
