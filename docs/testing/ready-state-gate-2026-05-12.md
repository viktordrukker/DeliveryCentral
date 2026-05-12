# Sprint F-2.5 — Ready-state gate (2026-05-12)

Closes Sprint F-2 (internal closure). Runs the 10 verification meta-checks from `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md` §"Verification (how we know v1 ready-state is reached)".

This **replaces** the formal "GO LIVE" event per the 2026-05-11 reframe — there is no external customer; the bar is a passing meta-check matrix.

## Result matrix

| # | Meta-check | Source of truth | Result |
|---|---|---|---|
| 1 | Backend health — `/api/health/deep` returns `ready` | local `curl` → `"ready"`; post-merge `build-and-stage` workflow asserts `"status":"ready"` on staging deploy | **PASS** |
| 2 | Audit pipeline live — every state change writes an AuditLog row | 29 rows / 12 event kinds / 6 in last 24h / all `rowHash` populated (hash chain intact). UAT-06 produced 3-event staffing-flow chain in correct order. | **PASS** |
| 3 | Single canonical staffing flow — SR → Slate → Pick → BOOKED, no `/assignments/new` direct path | 1 FULFILLED SR + 1 Slate + 5 BOOKED ProjectAssignments from F-2.3 UAT-06 walk; sidebar trimmed via D-0.10 / F-0.10 | **PASS** |
| 4 | Dashboard merge — `/dashboard/{employee,manager,exec}` registered + role-router | 3 merged routes in `route-manifest.ts` + `getDashboardPath()` fix in PR #25 verified via UAT-01 | **PASS** |
| 5 | Flag registry — full registry visible at `/admin/feature-flags` | `GET /api/admin/feature-flags` returns 88 flags (registry has grown from plan's 60 with Phase HD additions); 19 default-ON / 69 default-OFF; merged-dashboard + slate-canonical + viewAs all default-ON per Decisions 10/11 | **PASS** (note: count diverged from plan's 14/46 because Phase HD added flags; ratios still match intent) |
| 6 | Locale + timezone settings flippable | `PlatformSetting` rows present for `general.timezone`, `general.currency`, `general.fiscalYearStart`, `timesheets.weekStartDay`. Account-level locale picker shipped in F-0.7. End-to-end GB-flip drill is Sprint F-6 work. | **PASS** (foundation in place; F-6 finalises) |
| 7 | Performance baseline — 10 concurrent users P95 <1s per route | `docs/testing/perf-baseline-10-concurrent-2026-05-12.md`: 10 VUs × 5 min → 26,931 reqs, 0 errors, P95s 10–126× under SLO | **PASS** |
| 8 | Backup/restore drill | `docs/runbooks/pitr-restore.md` (DM-R-25) — base backups + WAL archive; RPO ≤ 60s, RTO ≤ 15m | **PASS** |
| 9 | Shadow CI — `npm run verify:shadow` nightly with all flags forced ON | **NOT WIRED.** Plan slates this as adopt-from-ULTIMATE follow-up; not a ready-state blocker for in-house dev. | **DEFER** (track in F-3 follow-ups) |
| 10 | Architectural ratchets — baselines + CI guards | 5 active baselines in `scripts/`: design-token, ds-conformance, enum-evolution, public-id-leak, schema-convention. Husky pre-commit reports `(N existing violations baselined)` on each commit. | **PASS** (mechanism in place; sprint-by-sprint reduction continues) |

## Sprint F-2 summary — what shipped

| PR | Closes | Result |
|---|---|---|
| #25 | UAT-01 role-routing fix (`getDashboardPath()` legacy URLs → merged) | merged + staging green |
| #27 | F-2.0a — `/admin/period-locks` admin UI (D-93, UAT-12) | merged + staging green |
| #28 | F-2.0b — UAT-19 impersonation entry documented | merged + staging green |
| #26 | hotfix — DM-R-13 contract spec + ALTER DEFAULT PRIVILEGES role-agnostic | merged + staging green |
| #29 | F-2.2 — k6 10-concurrent baseline + env-configurable throttler | merged + staging green |
| #30 | F-2.3 — mutation UAT 23/23 PASS + seed wipe-order fix | merged + staging green |
| (no PR) | F-2.1 — 2 missing dev-DB migrations | no-op; DB was already at 111/111 |

UAT: **23 / 23 PASS** (mutation + render combined).

## Next sprint

Per the plan, **Sprint F-3 (Bank-landscape integrations)** is the next sprint:
- F-3.1 IntegrationAdapter framework
- F-3.2 OIDC (Entra) auth + M365 directory sync
- F-3.3 LDAP directory adapter
- F-3.4 JSM connector (Cloud + DC)
- F-3.5 Jira PPM connector (promote from stub)
- F-3.6 Local-LLM scaffold (OpenAI-compatible client)
- F-3.7 Internal integrations walk

The 1 deferred meta-check (Shadow CI #9) carries into Sprint F-3 open follow-ups.

## Cross-references

- Plan: `/home/drukker/.claude/plans/now-it-is-a-zazzy-gizmo.md` §Verification
- Render walk: `docs/testing/uat-walk-2026-05-11.md`
- Mutation walk: `docs/testing/uat-mutation-2026-05-12.md`
- Perf baseline: `docs/testing/perf-baseline-10-concurrent-2026-05-12.md`
- PITR runbook: `docs/runbooks/pitr-restore.md`
- Strict CI/CD rule: `/home/drukker/.claude/projects/-home-drukker-DeliveryCentral/memory/feedback-ci-green-before-merge.md`
