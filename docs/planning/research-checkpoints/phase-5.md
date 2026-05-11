# Phase 5 Checkpoint — Customization Debt Register

**Run date:** 2026-05-10
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/customization-debt-register.md](../customization-debt-register.md) — 13 new debt items + 11 already-correct positives + migration order + ~21 proposed L1 catalog keys.

## Counts

| Metric | Target | Actual |
|---|---|---|
| Layers covered | L0/L1/L2/L3/L4 | all 5 |
| Source paths scanned | `src/modules/*` services + `frontend/src/lib/labels.ts` + role-manifest + radiator + notifications | done |
| Debt items registered (new) | — | **13** |
| Already-correct items recorded (positive findings) | — | **11** |
| Net-new L1 PlatformSetting keys proposed | — | ~21 |
| Net-new L2 dictionaries proposed | — | 1 (`risk-review-cadence`) |
| L4 workflow definitions proposed | — | 0 (infra exists; CUST-7 future) |

## Findings summary (≤300 words)

**11 already-correct positives** — services that look like debt at first glance but are actually customizable:
- Notification recipients / SMTP / templates (env + DB)
- Radiator threshold defaults (DB-backed via `radiator-threshold.service.ts:22-43`; constants in `radiator-scorers.ts` are fallbacks)
- Help articles / tips (DB tables)
- WorkflowDefinition schema (ready, just not populated)
- Frontend `labels.ts` (11 of 11 groups are L0-correct)
- Grade dictionary (L2-seeded; no `>= G10` branching anywhere)
- `route-manifest.ts` 18 named role-list constants
- Slate min/max, SLA budgets, director-approval threshold (already L1 per WO-1.7/WO-2.3/WO-3.x)

**13 new debt items found:**

- **L1 (11):** Staffing-suggestions skill weights + proficiency thresholds + recency window/modifier; SLA-sweep pre-breach levels (0.5/0.75) + risk-score threshold (15); Nudge-sweeper 4 windows (60min/48h/72h/24h); Project-risk defaults (3/3) + critical threshold (15); Closure budget threshold (10%); Repeated role-list patterns (3 sets, 75+ controllers).
- **L2 (1):** Risk-review-cadence days (7/14/30/90) — fold into D-107 enum→dictionary migration as `value:{days:int}` on each entry.
- **L0 housekeeping (1):** Add `Grade` TS const for type safety; the L2 dictionary is already correct.
- **Companion (1):** Frontend risk-enum display labels — wait for D-107 to land, then read `entry.displayName`.

**Two contradictions reconciled** between subagents:
- Radiator-scorers `DEFAULT_*` constants: not debt (they're fallback defaults; live config is in DB).
- Slate min/max + SLA budgets: not debt (already L1).

## Skills invoked

- `tech-debt-tracker` and `code-review-excellence` — methodology inlined: classify each finding L0..L4 per the §14.1 four-layer model; demand a *write site* before flagging "hardcoded" (so a one-time seed array isn't mis-classified as debt); cross-reference HARDEN_WIRING_MAP §14.2's existing in-flight items rather than re-mint.
- `software-architecture` (concept) — applied to the L0+ vs L1 vs L2 trade-off for repeated role-list patterns (D-130 has three migration paths at different costs).
- The spec-named `engineering:code-review` and `product-management:write-spec` plugins are not installed; methodology was inlined.

## Tracker append plan (on user approval)

A new sub-heading `### Phase 5 — Customization debt (docs/planning/customization-debt-register.md)` will be appended to the existing `## Research Findings (D-85+)` section.

| New D-id | Description |
|---|---|
| D-122 | [L1] `StaffingSuggestionsService` skill importance weights (0.5/1.0/2.0) + proficiency match thresholds (1.0/0.6/0.3/0) — 7 PlatformSetting keys |
| D-123 | [L1] `StaffingSuggestionsService` recent-role window (12 months) + recency modifier (1.2) — 2 keys |
| D-124 | [L1] `AssignmentSlaSweepService` pre-breach warning levels (0.5, 0.75) — already commented as TODO; 2 keys |
| D-125 | [L1] `AssignmentSlaSweepService` risk-score breach threshold (15) — 1 key |
| D-126 | [L1] `NudgeSweeperService` four windows: 60min sweep, 48h proposal-ack, 72h timesheet, 24h dedup — 4 keys |
| D-127 | [L1] `ProjectRiskService` default probability/impact (3/3) + critical-score threshold (15) — 3 keys; adjacent to PM-06 |
| D-128 | [L2] `ProjectRiskService` cadence-to-days (7/14/30/90) — fold into D-107 `risk-review-cadence` MetadataDictionary as `value:{days:int}` per entry |
| D-129 | [L1] `ProjectClosureReadinessService` budget variance threshold (>10%) — 1 key |
| D-130 | [L0+ → L1] Three repeated `@RequireRoles(...)` role-list patterns (24×, 29×, 22×). Step 1: extract to named constants in `src/shared/auth/role-presets.ts` (cheap, eliminates drift). Step 2: drive from `responsibilityMatrix.*.roles` PlatformSetting. Step 3: fold into ResponsibilityRule (S-05) |
| D-131 | [L2 companion] Frontend risk-enum display labels missing in `labels.ts` (RiskCategory/RiskStatus/RiskType/RiskStrategy used in `RisksIssuesTab.tsx:33` and `RiskRegister.tsx:30-31`); after D-107 lands, FE reads `entry.displayName` |
| D-132 | [TYPE-SAFETY] Add `Grade` TS const (`src/shared/lookups/grades.ts` exporting `['G7'..'G14'] as const`) for type-safe DTOs/forms; mirrors the `PlatformRole` pattern. Grade L2 seeding is already correct |

(11 items; counter ends at D-132.)

## Open questions / next-session inputs

- **D-130 path choice:** the three migration steps (named-constants → PlatformSetting → ResponsibilityRule) get progressively more correct but more expensive. Recommend shipping step 1 (named constants) immediately as a pure refactor, deferring steps 2-3 until ResponsibilityRule (S-05) lands. Confirm with user.
- **D-128 timing:** depends on D-107 (enum→dictionary migration). If D-107 is bundled into Sprint 5 per HARDEN_WIRING_MAP §14.5 mapping, D-128 lands with it.
- **Phase 6 input:** the UI normalization audit is next. Several findings here (notably D-130 and the frontend label gaps in D-131) overlap with Phase 6 scope; consider consolidating during Phase 6 rather than scheduling separately.

## Exit conditions hit

- ✅ Per-file hardcode list with classification
- ✅ Migration order (cheap wins first)
- ✅ PlatformSetting catalog additions proposed
- ✅ HARDEN_WIRING_MAP §14.2 cross-references (no re-mints)
- ✅ Already-correct positives recorded so future audits don't re-flag

**Stop here.** Awaiting validation gate before tracker append.
