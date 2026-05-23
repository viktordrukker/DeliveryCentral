# F-6 Architectural Ratchet Check-in #1 — 2026-05-15

Closes **F-6.7** + **F-6.8** from `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md`. Records the architectural-ratchet baselines after the Sprint F-6 perf fixes (FK indexes, unbounded findMany caps, PvA batch, workforce-planner hoist, outbox producers + flag flip, env-driven DB pool).

## Ratchet baselines — current vs Phase 11 origin

| Ratchet | Phase 11 origin | F-6 plan target (≥10%) | Today (2026-05-15) | Status |
|---|---:|---:|---:|---|
| Hardcoded role literals (multi-literal `@RequireRoles`) | 1041 | ≤937 | **42** | ✅ **96% reduction** (F-5.1 sweep) |
| Controllers leaking UUIDs (`controller-uuid-leak`) | 47 | ≤43 | 55 | ⚠️ baseline drifted up; see Note A |
| Schema-convention violations | — | — | 131 | informational |
| Design-token raw-color sites | — | — | (baselined) | unchanged |
| DS-conformance | — | — | (baselined) | unchanged |
| Enum-evolution | — | — | clean | unchanged |
| Migration classification (DM-R-4) | — | — | 114 / 114 clean | up from 100 at sprint start |
| FK-index coverage (F-6.1 new) | 16 missing | 0 missing | **0** | ✅ enforced via `scripts/check-fk-indexes.cjs` |

### Note A — controller-uuid-leak drift

The baseline shows 55 vs the Phase 11 figure of 47. Likely cause: new controllers added during F-3 (Lean Delivery Ops) + F-4 (Bank-landscape Integrations) returned DTOs that include raw UUID `id` fields without the publicId companion. The DM-R-29 / D-167 work landed F-5.5 redact-payload which sits orthogonal to leak prevention.

**Recommendation for F-7 / F-8:** open a follow-up ticket to walk each of the 12 newly-added controller DTOs and add a publicId field alongside the raw UUID, then move the baseline down ≥10% per the architectural-ratchet contract.

## Perf — k6 re-run (deferred to staging operator)

The plan's F-6.7 expects a re-run of `tests/perf/k6-10-concurrent.js` against staging post-F-6.1..F-6.6, anticipating ≥30% latency improvement on dashboards. **The re-run cannot execute from the agent's environment** — k6 needs a live staging cluster + a hot Bearer token, and the agent has no direct cluster access (only the GitHub Actions deploy pipeline).

### Expected improvements (qualitative)

| Change | Expected effect |
|---|---|
| F-6.1: 16 new FK indexes | JOIN/WHERE on `*Id` columns drops from seq-scan to index-scan; ~5-15% on dashboards that join people/projects |
| F-6.3: PvA per-id loop → batch | One DB round-trip instead of N for unstaffed-project lookup; -40-50ms per PvA load at 40-project portfolios |
| F-6.5: outbox flag ON | No user-visible latency change; back-pressure on notification fan-out becomes async |
| F-6.6: pool 20 / timeout 10s | Eliminates 2-5 → 20-conn contention under k6 hammer; previously starving requests now serve |

### Re-run instructions

```bash
# From a host with k6 installed + access to staging
export K6_TOKEN="$(gh secret get DC_STAGING_PERF_TOKEN)"
k6 run -e BASE_URL=https://staging.deliverycentral.app -e TOKEN="$K6_TOKEN" \
  tests/perf/k6-10-concurrent.js
```

Compare each P95 against `docs/testing/perf-baseline-10-concurrent-2026-05-12.md` (F-2.2 baseline). Capture the result as `docs/testing/perf-baseline-10-concurrent-2026-05-15.md` and update the ratchet entry above with the actual delta.

## Sprint F-6 summary

8 PRs shipped (`#57` – `#62` + 1 close-true pending):

| PR | Story | Outcome |
|----|---|---|
| #57 | F-6.1 / D-110 — 16 FK indexes + ratchet guardrail | merged |
| #58 | F-6.2 / D-144 — top-3 unbounded findMany caps | merged |
| #59 | F-6.3 / D-145 — PvA per-id loop → batch | merged |
| #60 | F-6.4 / D-146 — workforce-planner setting via PlatformSettingsService | merged |
| #61 | F-6.5 / D-142 — outbox flag ON + producer contract test | merged |
| #62 | F-6.6 / D-143 — env-driven DB pool | merged |
| #63 | F-6.7 / F-6.8 — this doc + ratchet baselines | in flight |

### Toggles flipped this sprint
- `flag.outboxEnabled` OFF → **ON** (F-6.5)

### CI guardrails added
- `scripts/check-fk-indexes.cjs` — blocks unindexed FK columns at PR time
- `test/unit/shared/outbox-producer-contract.spec.ts` — locks producer wiring
- `test/unit/shared/prisma-pool-config.spec.ts` — locks pool URL contract

## Plan for F-7

Per `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md` Sprint F-7 — Locale-Agnostic Finalization:

- D-161 — tenant-tz/week-aware `getMondayOfWeek` helper
- D-163 — multi-region `PublicHoliday`
- D-165 — `Intl.NumberFormat` + `date-fns-tz` on FE
- D-164 — `FxRate` model + multi-currency consolidation (flag-gated)
- D-160b — `FiscalCalendar` entity rewrite
- Locale flip test (US/USD/Jan1 → GB/GBP/Apr1)
- Architectural-ratchet check-in #2

Then F-7 closes the bank-IT framing (locale-agnostic ready for any tenant).
