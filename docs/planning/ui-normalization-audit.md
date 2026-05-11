# UI Normalization Audit (Phase 6)

**Run date:** 2026-05-10
**Method:** This audit is intentionally thin because **Phase DS** (`docs/planning/ds-outstandings.md`, marked CLOSED 2026-04-28) and **Phase 18** (`docs/planning/phase18-standardization-changelog.md`, 339 lines, 53 cluster entries across 8 sub-clusters A–H) already deliver the substance of what the spec calls for under Phase 6. This Phase 6 deliverable runs the live conformance scripts, compares against those existing artifacts, and surfaces only the residual / regression items that aren't already tracked.

Tools used:
- `node scripts/check-ds-conformance.cjs --report` — DS conformance ratchet across 6 ERROR-locked rules
- `npm run tokens:check` — design-token guardrail (raw-hex outside `design-tokens.ts`)
- Cross-reference of `docs/planning/phase18-standardization-changelog.md` (cluster status), `docs/planning/ds-deferred-items.md` (Group A/F/G register), `scripts/ds-conformance-baseline.json` (live baseline = empty)

---

## Live conformance state (this branch, 2026-05-10)

```
Total scanned files:    485
Violations seen:        1
Baseline entries:       0
Error-tier occurrences: 1

Per-rule breakdown:
  🔒 ERROR  no-raw-button                total=1   baseline=0   new=0
  🔒 ERROR  no-button-className          total=0   baseline=0   new=0
  🔒 ERROR  no-link-button-className     total=0   baseline=0   new=0
  🔒 ERROR  no-raw-table                 total=0   baseline=0   new=0
  🔒 ERROR  no-window-confirm            total=0   baseline=0   new=0
  🔒 ERROR  no-window-alert              total=0   baseline=0   new=0
```

**`npm run tokens:check`** — passes (`Design token guardrail passed.`).

**Headline:** 5 of 6 conformance rules clean at zero. **One regression** since `ds-outstandings.md` (CLOSED) declared baseline=0: `frontend/src/routes/my-time/MyTimePage.tsx:821` is a raw `<button>` for the row-delete `×` icon. The author used inline styles (`background: 'transparent', border: 'none', color: 'var(--color-text-muted)'`) to mimic a transparent icon button — this is exactly the case the DS atoms (`<Button variant="ghost">` or a dedicated icon-button) are meant to cover.

The conformance script flags it as ERROR (not WARN) because the rule was promoted at DS closure. **Either CI is not running this check on every PR**, or the violation slipped in via a workflow that bypasses the lint. Worth verifying as part of the fix.

---

## Page-grammar conformance (cross-reference Phase 18)

`docs/planning/phase18-standardization-changelog.md` records grammar conformance for 53 named pages across 8 clusters. Spot-check of cluster A (dashboards):

| Page | Grammar | Status per Phase 18 changelog |
|---|---|---|
| DashboardPage (Workload Overview) | Decision Dashboard | ✓ — REFERENCE page |
| PlannedVsActualPage | Decision Dashboard | ✓ — REBUILT |
| EmployeeDashboardPage | Decision Dashboard | ✓ — Conformant (employee JTBD-shaped) |
| ProjectManagerDashboardPage | Decision Dashboard | ✓ |
| ResourceManagerDashboardPage | Decision Dashboard | ✓ — minor `var(--color-chart-5, #8b5cf6)` fallback in baseline |
| HrDashboardPage | Decision Dashboard | ✓ — minor `#fff` in inline badges (in token baseline) |
| DeliveryManagerDashboardPage | Decision Dashboard | ✓ functionally — **gap: no test file** (per 18-A-09) |
| DirectorDashboardPage | Decision Dashboard | ✓ |

All 8 dashboards conform to grammar #1 (Decision Dashboard). The full per-page audit for clusters B–H is already in `phase18-standardization-changelog.md` — re-running it here would duplicate the source-of-truth record.

**No new page grammars proposed.** The 8 grammars at `docs/planning/phase18-page-grammars.md` (Decision Dashboard, List-Detail Workflow, Detail Surface, Create/Edit Form, Operational Queue, Analysis Surface, Admin Control Surface, Auth Form) cover every page surveyed; no orphan patterns surfaced.

---

## Deferred-items state (cross-reference `ds-deferred-items.md`)

| Group | Status | Items remaining |
|---|---|---|
| A — Inline-panel "drawers" | **deferred to DS-5** | 2 components: `DepartmentSidebarDrawer.tsx` (231 LoC) + `PersonSidebarDrawer.tsx` (244 LoC). Both pending the DS-5 / MasterDetailLayout architecture decision. |
| B — Complex planner popovers | ✅ done 2026-04-27 | — |
| C — Form modals | ✅ all 8 done 2026-04-27 | — |
| D — DS-1-7 codemod residuals | ✅ done 2026-04-27 | — |
| E — Orphaned legacy CSS | ✅ done 2026-04-27 | — |
| F — DS-3 follow-ups | ✅ done 2026-04-27 | Combobox upgrade conditionally gated (HTML5 required → custom validation tradeoff) |
| G — DS-4 advanced features | partial | Several `<Table>` / `<DataView>` advanced features reserved on the API but not yet implemented (virtualization, mobile UX, inline editing) |

The only item that needs an explicit Phase 6 D-item is **Group A**: it's gated on a UX architecture decision, not engineering work. Group G is engineering-only and tracked inside DS-4 follow-up planning.

---

## UX-law spot checks

The 10 UX laws at `.claude/rules/ux-laws.md` are partially covered by automated rules:

| Law | Coverage |
|---|---|
| Law 1: Three-click rule | Not automated — Phase 4 walker confirms most JTBDs reach action in ≤3 clicks |
| Law 2: No dead-end screens | Partially via `EmptyState` + `ErrorState` primitives (DS-2 surfaces) — every empty/error path uses one of these by lint |
| Law 3: No context loss after actions | Not automated — relies on `useTitleBarActions` discipline |
| Law 4: Action-data adjacency | Implicit via DS layout primitives (`SectionCard`, `dash-action-section__summary`) |
| Law 5: Filter persistence via URL | Not automated — no lint enforces it |
| Law 6: No duplicated user input | Not automated |
| Law 7: One-screen approval | Phase 4 walker confirms most approval pages fit |
| Law 8: One-screen exception resolution | Phase 4 walker confirms PvA's resolve flow loses context → CLAUDE.md pitfall #14 + D-121 (silent RBAC errors) overlap |
| Law 9: Every KPI is a clickable drilldown | Partially — `KpiStripItem` accepts `href`; Phase 4 walker shows most KPIs link out |
| Law 10: Workspace continuity | Not automated |

**No new D-items proposed for UX laws** — laws 1, 5, 6, 10 are inherently per-page judgement calls covered by the Phase 18 standardization template. Where Phase 4's walker found violations (D-121's silent RBAC errors), they're already captured.

---

## New D-item proposals (Phase 6)

| New D-id | Description |
|---|---|
| D-133 | [REGRESSION] DS conformance — `frontend/src/routes/my-time/MyTimePage.tsx:821` raw `<button>` for the row-delete icon violates `no-raw-button` (ERROR-tier). 1 occurrence; baseline=0; this is a regression since DS closure. Replace with DS `<Button>` (ghost or icon variant) and verify CI runs `node scripts/check-ds-conformance.cjs --report` as a blocking check on every PR. |
| D-134 | [DECIDE] Group A inline-panel architecture — `DepartmentSidebarDrawer.tsx` (231 LoC) and `PersonSidebarDrawer.tsx` (244 LoC) inside `InteractiveOrgChart` are inline content (no backdrop, no scroll-lock). Per `ds-deferred-items.md`, the recommended path is to build `MasterDetailLayout` (DS-5) and have these become a list+detail composition rather than retro-fitting them as Drawers. Decision needed: schedule DS-5 or accept the inline pattern as the chosen UX. |
| D-135 | [TEST] `DeliveryManagerDashboardPage` is the only role dashboard without a `*.test.tsx` file (per `phase18-standardization-changelog.md` 18-A-09). Add test mirroring the existing 7 dashboard test files (KPI strip + data loading + error state). |

---

## Top normalization wins (already realized)

For completeness — most of the spec's "top 20 normalization wins" were delivered during Phase DS itself. Recorded here as positive findings:

- **6 ERROR-locked conformance rules** (no-raw-button, no-button-className, no-link-button-className, no-raw-table, no-window-confirm, no-window-alert) — eliminate ~239 violations to 0 baseline at DS-1 reset.
- **8 page grammars** documented and exemplified — every page in 53 named clusters maps to one.
- **DS atoms 11/11**, **molecules 7/7**, **surfaces 7/7** built and migrated (per `ds-outstandings.md`).
- **Design-token guardrail** (`scripts/check-design-tokens.cjs`) holds; raw-hex exceptions are explicitly ratcheted in `scripts/design-token-baseline.json` (340 lines of known/allowed exceptions).
- **Date-input sweep:** 51 conversions across 28 files via `scripts/codemod-ds-datepicker.cjs`.
- **Group E orphaned CSS removal:** ~50 lines of legacy CSS dropped from `global.css` (4159 → 4109).

---

## Phase 6 acceptance status

- ✅ Conformance state captured (1 regression + 5 clean rules + token guard pass)
- ✅ 8 page grammars verified to cover all surveyed clusters; no new grammar proposed
- ✅ Cross-references to Phase DS / Phase 18 / ds-deferred-items registers (no duplication)
- ✅ Per-cluster grammar status delegated to `phase18-standardization-changelog.md` (source of truth for the 53-cluster matrix)
- ✅ UX-law coverage assessed; no new D-items beyond the partial automated coverage already in place
- ✅ 3 new closing recommendations (D-133..D-135)

**Net new findings for Phase 6:** 3 D-items; one regression (small, fixable in <30 min), one decision (Group A architecture), one test gap (DeliveryManagerDashboardPage). The thinness of this audit is a positive signal — Phase DS / Phase 18 closed the substantive work first.

**Next:** AskUserQuestion → "Phase 6 complete; append D-133..D-135?"
