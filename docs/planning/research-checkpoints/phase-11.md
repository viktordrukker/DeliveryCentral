# Phase 11 + 12 Checkpoint — Master plan, xlsx roadmap, quality gate

**Run date:** 2026-05-10
**Status:** complete; Phase 12 quality gate passed; awaiting final user validation gate.
**Artifacts:**
- [docs/planning/NEXT_ITERATION_PLAN.md](../NEXT_ITERATION_PLAN.md) — 9-goal master plan with current/target/migration/acceptance/sprint/effort/risks/deps per goal + executive summary + cross-cutting roadmap (Mermaid Gantt) + risk register + DoD per goal + HARDEN_BRIEF cross-reference.
- [docs/planning/next-iteration-roadmap.xlsx](../next-iteration-roadmap.xlsx) — 5 sheets: Tasks (91 rows), Risk register (19), JTBD matrix (40), Customization debt (32), HARDEN coverage (42).
- [/tmp/build-roadmap-xlsx.cjs](../../../tmp/build-roadmap-xlsx.cjs) — one-shot Node script that produced the xlsx (uses frontend's installed `xlsx` package).

## Counts

| Metric | Target | Actual |
|---|---|---|
| Goals in NEXT_ITERATION_PLAN.md | 9 | **9** (Goal 1–9 with mandatory structure) |
| Tasks in xlsx Sheet 1 | ≥50 | **91** |
| JTBDs scored | 8 roles × 5 = 40 | **40/40** (2 RED, 13 AMBER, 25 GREEN) |
| Flow duplicates with verdicts | ≥5 | **11** (`flow-audit.md`) |
| Customization debt items | ≥30 | **32** (xlsx Sheet 4) |
| UI normalization items | ≥20 | **63** (Phase 18 standardization changelog cumulative) |
| Risk-register rows | — | **19** (xlsx Sheet 2) |
| HARDEN coverage rows | — | **42** (xlsx Sheet 5) |

## Phase 12 quality gate

The original spec lists 7 acceptance gates that must ALL be true before declaring done. Each verified:

| Gate | Pass | Evidence |
|---|---|---|
| All 9 audit artifacts exist in `docs/planning/` | ✅ | `flow-audit.md`, `functional-duplication-register.md`, `data-quality-audit.md`, `jtbd-validation-matrix.md`, `customization-debt-register.md`, `ui-normalization-audit.md`, `tab-and-nav-audit.md`, `scalability-modularity-audit.md`, `real-org-readiness-gap.md` (+ `synthesis-themes.md` from Phase 10, `NEXT_ITERATION_PLAN.md` + xlsx from Phase 11) |
| `NEXT_ITERATION_PLAN.md` covers all 9 user goals with mandatory structure | ✅ | `grep -cE "^## Goal [1-9]"` = 9; each has Current state / Target state / Migration / Acceptance / Sprint mapping / Effort / Risks / Dependencies |
| Roadmap xlsx ≥50 tasks all mapped to sprint + effort | ✅ | 91 tasks; every row has `sprint` (S0..S5 or Backlog) and `effort` (S/M/L/XL) |
| Every JTBD scored GREEN/AMBER/RED with closing recommendation | ✅ | xlsx Sheet 3 has 40/40 rows scored; closing-recommendation column populated for all non-GREEN |
| ≥5 flow duplicates identified with KEEP/DEPRECATE/MERGE verdicts | ✅ | `flow-audit.md` has 11 verdict-tagged rows |
| ≥30 customization debt items registered with layer classification | ✅ | xlsx Sheet 4 has 32 rows; each has L0/L1/L2/L0+→L1 layer column |
| ≥20 UI normalization wins documented | ✅ | `phase18-standardization-changelog.md` has 63 per-page standardization log entries cumulative |

**All 7 gates pass.** Phase 12 declares the iteration complete pending user review.

## Findings summary (≤300 words)

**The master plan ships in the shape Phase 10's synthesis predicted.** 24 themes mapped to 9 goals — Goal 8 (real-org readiness) absorbs T-01/T-02/T-03/T-05/T-06/T-07/T-23 (the entire Sprint 0 P0 stack); Goal 5 (customization) absorbs T-04/T-09/T-10; Goal 9 (scale) absorbs T-08/T-11/T-12/T-13/T-14. Sprint 0 contains 4 P0 themes in full (T-07 locale, T-02 SSO, T-06 multi-currency, T-05 D-160a quick fix) plus T-01a multi-tenant scope (8 priority models) and T-03 GDPR ADR. Sprint 1 finishes T-01b long-tail + T-03 implementation + ships T-08 D-110 FK indexes, T-12 hot-path queries, T-11 outbox + DB pool, T-18 approval-flow gaps, T-20 dashboard quality.

**Capacity check surfaced the realistic sprint shape.** At 2 engineers × 2-week sprints (~40 person-days/sprint), Sprint 1 and Sprint 2 are over-budget at the high end. The plan documents 3 deferrable options for stakeholder choice (add 3rd engineer, defer T-04 to S3, drop T-21 to S3). This was the most important honesty check Phase 11 surfaced — the spec's encouragement of "≥50 tasks" and "9 goals × full structure" produces a richer plan than 2 engineers can ship in 6 sprints, and pretending otherwise sets up a mid-sprint descope.

**HARDEN_BRIEF is cross-referenced not absorbed** (per stakeholder direction). Sheet 5 of the xlsx maps every Phase 1–9 D-id to its closing HARDEN_BRIEF item where one exists. Notable extensions: T-01 covers the 80 unscoped models (HARDEN F6 keeps the 25 scoped); T-04 D-158 extends ResponsibilityRule to read endpoints (HARDEN HD-4 covered mutations only); T-11 D-142 wires producers (HARDEN HD-7 shipped the schema skeleton).

**T-02 SCIM 2.0 deferred to backlog** per stakeholder choice. T-03 GDPR strategy locked to **redact-payload v1**; cryptographic-forgetting v2 is parked as an upgrade path for high-bar customers.

## Skills invoked (host-built-in only)

- The spec's `product-management:write-spec` and `anthropic-skills:xlsx` plugin skills are not installed; methodology was inlined.
- Local skills the work drew on:
  - `business-analyst` — for the executive-summary framing and the 9-goal "current → target → migration → acceptance" structure.
  - `senior-architect` — for the cross-cutting decision sequencing in §6 and the Mermaid Gantt.
  - `risk-manager` — for the 19-row risk register format (id / goal / risk / likelihood / impact / mitigation).
  - `concise-planning` — for the per-goal effort coding S/M/L/XL.
  - SheetJS `xlsx` (already an approved frontend dependency per CLAUDE.md) — used directly via Node script to author the 5-sheet workbook.
- **Subagent dispatch: 0.** All inputs were Phase 10's synthesis-themes.md plus the 9 audit docs already in repo.

## Tracker append plan (on user approval)

Phase 11 produces no new tracker items; the master plan + xlsx are the authoring artifacts. The tracker already lists:
- 87 D-items (D-85..D-171) under `## Research Findings (D-85+)` — Phases 1–9.
- 24 themes (T-01..T-24) — Phase 10 (appended this session).

**Recommended append on this approval:** add a new sub-heading `### Phase 11 — Master plan + roadmap (docs/planning/NEXT_ITERATION_PLAN.md + next-iteration-roadmap.xlsx)` inside the existing `## Research Findings (D-85+)` section, immediately after the Phase 10 sub-heading. Body: one-paragraph preamble pointing at the two artifacts + the Phase 12 gate result, plus a single line per goal mapping it to its primary themes. No new D-ids or T-ids.

## Open questions / next-session inputs (Phase 11 → execution)

The plan is ready to drive sprint planning. Open questions stakeholders should answer **before Sprint 0 kickoff**:

1. **Capacity confirmation.** S1 and S2 are over-budget at 2 engineers × 2-week sprints. Pre-agree a deferrable list (T-04 → S3, T-21 → S3, T-09 → S3) OR commit to a 3rd engineer for S1+S2. Without this, mid-sprint descoping is likely.
2. **OIDC IdP target.** Plan assumes Okta dev account for the test-tenant canary. If Entra is the target, the OIDC handler implementation work is the same shape; the test setup differs.
3. **GDPR jurisdictional scope.** Redact-payload v1 satisfies GDPR Art. 17. If the customer is also subject to LGPD (Brazil) or PIPEDA (Canada), confirm the same v1 strategy is acceptable. (No code change needed; just a contractual confirmation.)
4. **FxRate seed source.** D-164 ships the model + service. Where do rates come from? Manual admin seed (cheapest), scheduled import from open.er-api.com (fastest), or paid feed (most accurate)? Decision affects T-06 effort estimate ±2 person-days.
5. **`fiscalYearStart` change protection.** R-19 says "Validate that no project has open ProjectBudget rows when admin changes the setting". Confirm: should the change be admin-only with a 1-week notice period, or admin-only same-day with full re-rollup of all open budgets?
6. **DS-5 / MasterDetailLayout decision (T-22 D-134).** Phase 11 left this as "schedule OR formally retire". Stakeholder pick before Sprint 3.
7. **Bulk-import (T-23) priority.** Plan slots in Sprint 4. If the first real customer is enterprise + onboarding-immediate, T-23 may need to promote to Sprint 1.

## Exit conditions hit

- ✅ All 7 Phase 12 quality gates pass
- ✅ NEXT_ITERATION_PLAN.md follows the mandatory structure for all 9 goals
- ✅ next-iteration-roadmap.xlsx has 5 sheets per spec
- ✅ Capacity check honestly surfaces over-budget sprints (S1, S2) — does not pretend otherwise
- ✅ HARDEN_BRIEF cross-references documented per stakeholder direction
- ✅ Stakeholder inputs from Phase 11 gate (engineer count, HARDEN posture, GDPR strategy, SCIM posture) reflected in the plan

**Stop here.** Awaiting final user validation before declaring the 11-phase research program closed.
