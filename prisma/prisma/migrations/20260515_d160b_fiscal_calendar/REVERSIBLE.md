# F-7.5 / D-160b — FiscalCalendar + FiscalPeriod

## Forward
Creates `fiscal_calendars` and `fiscal_periods` so tenant fiscal years can be modelled as real entities (replacing the D-160a "single `fiscalYearStart` number" quick-fix). Each calendar has 12 monthly periods grouped into 4 quarters; an optional `regionCode` supports multi-region tenants ("GB" vs "US").

Gated by `flag.feature.financial.fiscalCalendar.entity.enabled` (default OFF). Until that flips, financial reports keep consuming the simpler D-160a path; the tables sit empty.

## Backward
`rollback.sql` drops both tables and all indexes. Cascading FK from `fiscal_periods.calendarId` to `fiscal_calendars.id` is dropped automatically with the table. No external dependencies — neither table is referenced by other tables in v1.

## Reversibility test
- Apply forward → both tables appear with full index set.
- Apply forward again → no-op (`CREATE TABLE IF NOT EXISTS` + `duplicate_object` guards).
- Apply backward → both tables gone, FK with them.
- Apply backward again → no-op.
