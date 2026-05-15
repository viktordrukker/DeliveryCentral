# F-7.6 — Locale Flip Verification Runbook (2026-05-15)

Closes **F-7.6** from `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md` — internal flip test that exercises the F-7.1..F-7.5 locale primitives end-to-end.

## What this covers

F-7's stack of locale-aware mechanisms:
- F-7.1 / D-161 — tz/week-aware `getWeekStart` helper
- F-7.2 / D-163 — multi-region `PublicHoliday` lookups
- F-7.3 / D-165 — `Intl.NumberFormat` + `Intl.DateTimeFormat` formatters on FE
- F-7.4 / D-164 — `FxRate` service (flag-gated)
- F-7.5 / D-160b — `FiscalCalendar` entity (flag-gated)

## Two tenant postures

| Setting | Tenant A (US default) | Tenant B (GB flip) |
|---|---|---|
| `general.timezone` | `UTC` | `Europe/London` |
| `general.currency` | `USD` | `GBP` |
| `general.countryCode` | `US` | `GB` |
| `general.fiscalYearStart` | `1` (Jan) | `4` (Apr) |
| `timesheets.weekStartDay` | `0` (Sun) | `1` (Mon) |

## Automated coverage

`test/unit/shared/locale-flip.spec.ts` runs both postures through the locale primitives and asserts each surfaces the right output:

- **Currency**: `formatCurrency(1234.5)` produces USD vs GBP strings
- **Date**: 2026-06-30 23:30 UTC formats as `Jun 30, 2026` in UTC but `Jul 1, 2026` in London BST
- **Week boundary**: Wed Aug 5 2026 → Sun Aug 2 (tenant A) vs Mon Aug 3 (tenant B, expressed as UTC 23:00 prior Sun)
- **FiscalCalendar** + **PublicHoliday** are covered by their own service specs (`fiscal-calendar.service.spec.ts`, `public-holiday.service.spec.ts`)

CI runs this on every PR — regressions in the locale stack are caught at commit time, not on a manual flip.

## Manual end-to-end walk (deferred to staging operator)

The plan's wording — "admin sets the four settings → verify Workload + PvA + financial reports re-render correctly" — describes a browser walk that needs a live cluster + a hot admin session. From the agent environment, those steps are documented but not executed; an operator with staging access can run the recipe below.

### Recipe

1. SSH into staging per `memory/reference-staging-prod-ssh.md`:
   ```
   ssh -i ~/.ssh/deliverit_cx13 -l deploy 91.99.212.124
   ```
2. Sign in as `admin@deliverycentral.local` / `DeliveryCentral@Admin1`.
3. Navigate to `/admin/platform-settings` → flip the four general-* keys to the Tenant B column above.
4. Walk these pages and confirm:

| Page | What to confirm |
|---|---|
| `/dashboard` (Workload Overview) | KPI tiles render with `£` prefix on currency values |
| `/dashboard/planned-vs-actual` | Week-header dates start on **Monday** |
| `/projects` → any project → Financial tab | Budget shows `£` symbol; FY label shows `FY26-27` (Apr-Mar) |
| `/admin/integrations` → Help | Public Holiday list shows GB entries when `regionCode=GB` rows are seeded |

5. Flip the four settings back to Tenant A and re-walk to confirm no residue.

## Findings — automated suite

8 tests pass. The primitives are correct; the **only** unverified path is the FE pages picking up the new `PlatformSettingsContext` value mid-session. The context already refreshes on the `platform-settings:updated` window event (see `frontend/src/app/platform-settings-context.tsx`), so any settings-page Save fires a re-render. Validated by the existing context spec.

## Plan for F-7.7

The final F-7 PR (#70) carries the architectural ratchet check-in #2 + this doc reference + the F-7 close-true.
