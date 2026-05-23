# F-7 Architectural Ratchet Check-in #2 — 2026-05-15

Closes **F-7.7** from `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`. Records the architectural-ratchet baselines after Sprint F-7 (Locale-Agnostic Finalization). Pairs with the F-6 check-in (`f-6-ratchet-checkin-2026-05-15.md`).

## Ratchet baselines — current vs F-6 check-in vs Phase 11 origin

| Ratchet | Phase 11 | F-6 check-in (2026-05-15 am) | F-7 check-in (this doc) | Δ |
|---|---:|---:|---:|---|
| Hardcoded role literals | 1041 | 42 | **42** | unchanged (no controller-level work this sprint) |
| Controller-uuid-leak | 47 | 55 | **55** | unchanged (no new controllers in F-7) |
| Schema-convention violations | — | 131 | **131** | unchanged |
| FK-index coverage gaps | 16 | 0 | **0** | unchanged (new tables ship indexed) |
| Migration classification (DM-R-4) | — | 114 | **117** | +3 new migrations (D-163 / D-164 / D-160b) |
| DM-R-13 contract describe blocks | — | 114 | **117** | +3 matching migrations |

Net: Sprint F-7 was entirely additive — new tables, new services, new flags. No controller surface changed, no roles touched. The existing ratchets stay clean.

## What Sprint F-7 shipped

| PR | Story | Surface |
|----|---|---|
| #64 | F-7.1 / D-161 — tenant-tz/week-aware `getWeekStart` | `src/shared/temporal/week-of.ts` + PulseService wiring |
| #65 | F-7.2 / D-163 — multi-region `PublicHoliday` | DROP `'AU'` default + service multi-region API |
| #66 | F-7.3 / D-165 — `Intl.NumberFormat` + `date-fns-tz` | `frontend/src/lib/locale.ts` |
| #67 | F-7.4 / D-164 — `FxRate` model + service (flag-gated) | `fx_rates` table + `FxRateService` |
| #68 | F-7.5 / D-160b — `FiscalCalendar` entity (flag-gated) | `fiscal_calendars` + `fiscal_periods` + `FiscalCalendarService` |
| #69 | F-7.6 — locale-flip US ↔ GB tests + operator runbook | `test/unit/shared/locale-flip.spec.ts` + `docs/testing/locale-flip-2026-05-15.md` |
| #70 | F-7.7 — this doc + close-true | docs only |

## Toggles flipped this sprint

None. F-7.4 (`flag.feature.financial.multiCurrency.enabled`) and F-7.5 (`flag.feature.financial.fiscalCalendar.entity.enabled`) both stay OFF — they ship the entity layer ready to flip when a multi-currency or quarterly-rollup tenant onboards.

## DM-R ratchet state at sprint close

- DM-R-2 `.schema-hash`: `b2b17abafd1b52adc2eab1a6113a25e4ef8bcdc6e82abbca23c95f58b4d5e2ea` (refreshed after F-7.5)
- DM-R-4: 117 migrations classified cleanly
- DM-R-13: 117 contract describe blocks
- DM-R-22: hash chain still validates (no changes in F-7)

## Tests added

- F-7.1: 12 (`week-of.spec.ts`)
- F-7.2: 7 (`public-holiday.service.spec.ts`)
- F-7.3: 10 (`frontend/src/lib/locale.test.ts`)
- F-7.4: 9 (`fx-rate.service.spec.ts`)
- F-7.5: 9 (`fiscal-calendar.service.spec.ts`)
- F-7.6: 8 (`locale-flip.spec.ts`)
- F-7.7: 0 (docs only)

**Total new tests this sprint: 55.**

## Strict CI/CD rule held throughout

Every PR: pre-merge CI green → auto-merge → post-merge `build-and-stage` green → staging `/api/health/deep` ready. Recoveries this sprint:

- **PR #64** existing pulse-team-trend test broke when `PulseService` got a 4th constructor arg (PlatformSettingsService). Fix: stub the service in the test fixture.
- **PR #66** `npm ci` failed because `package-lock.json` didn't include `date-fns-tz`. Fix: `npm install date-fns-tz@3.2.0 --package-lock-only` to update the lock without touching the root-owned `node_modules`. Plus a transient Docker registry 502 on the smoke test, recovered via `gh run rerun --failed`.
- **PR #67** initial FxRate migration used custom index/FK names + Postgres-side `DEFAULT gen_random_uuid()`; `prisma migrate diff` flagged it. Fix: rename indexes/FKs to Prisma's auto-generated conventions, drop the Postgres default.
- **PRs #67/#68** DM-R-2 schema-hash refresh after schema additions (standard pattern).

## What's NOT in F-7 (intentional defer)

- The "convert all 120 raw `new Date()` calls in `frontend/src/`" sweep from the F-7.3 plan paragraph. Mechanical migration — ride a separate ratchet rather than risk a 120-file regression in the same PR as the primitive.
- Wiring `FinancialService` to actually use `FxRateService` for reports. With `multiCurrency` OFF the wire is a no-op; follow-up sweep adds consumers when the flag promotes.
- Live browser walk against staging. Captured in `docs/testing/locale-flip-2026-05-15.md`; an operator with cluster access can run it once.
- `FiscalCalendar` seed data. Service is ready; admin-driven seeding lands when the flag flips.

## What's next

Per `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md` the sprint plan ends at F-7. After F-7.7 close-true, the open work is the residual deferrals above + any Cat-3 / Appendix-A items the team prioritizes.

Recommended next-up:
1. **Outbox consumer audit** — verify the `flag.outboxEnabled` flip (F-6.5) actually moved fan-out off the request thread on staging; check OutboxEvent table growth + publisher tick metrics.
2. **Controller-uuid-leak back-walk** — bring the baseline from 55 → ≤43 (the Phase 11 target). 12 newly-added DTOs introduced during F-3/F-4 need publicId companions.
3. **D-167 v2** — cryptographic forgetting if a high-bar bank customer asks. Today's v1 (F-5.5 redact-payload) covers GDPR Article 17; v2 destroys a per-row key so the chain never changes.
