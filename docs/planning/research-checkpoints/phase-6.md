# Phase 6 Checkpoint — UI Normalization Audit

**Run date:** 2026-05-10
**Status:** complete; awaiting user validation gate before MASTER_TRACKER append.
**Artifact:** [docs/planning/ui-normalization-audit.md](../ui-normalization-audit.md) — thin audit (Phase DS + Phase 18 already cover most of the substance).

## Counts

| Metric | Target | Actual |
|---|---|---|
| Conformance rules audited | 6 | **6** (5 clean, 1 regression) |
| Token guardrail | pass | **pass** |
| Page-grammar conformance | per page | delegated to `phase18-standardization-changelog.md` (53 named clusters across 8 sub-clusters A–H) |
| New page grammars proposed | — | **0** (the 8 existing grammars cover every surveyed page) |
| New D-items | — | **3** (D-133, D-134, D-135) |

## Findings summary (≤300 words)

**1 regression** since `ds-outstandings.md` declared baseline=0 at DS closure (2026-04-28):
- `frontend/src/routes/my-time/MyTimePage.tsx:821` — raw `<button>` for the row-delete `×` icon. Inline-styled to look like a transparent icon. Should be DS `<Button variant="ghost">` or an icon-button atom. The rule is ERROR-tier; either CI doesn't gate on `node scripts/check-ds-conformance.cjs --report`, or the violation slipped in via a workflow that bypasses lint. Fix is a 5-line edit; investigation of CI gating is the larger question.

**1 architecture decision still pending** from `ds-deferred-items.md` Group A:
- `DepartmentSidebarDrawer.tsx` (231 LoC) + `PersonSidebarDrawer.tsx` (244 LoC) inside `InteractiveOrgChart` — inline panels (no backdrop, no scroll-lock). Recommended path is `MasterDetailLayout` (DS-5) so they become list+detail rather than drawer; gated on UX decision.

**1 test gap:**
- `DeliveryManagerDashboardPage` is the only role dashboard without a `*.test.tsx` (per `phase18-standardization-changelog.md` 18-A-09).

**Cross-references — already done, recorded as positive findings:**
- 6 ERROR-locked conformance rules eliminating ~239 violations to 0 baseline
- 8 page grammars cover every surveyed cluster; no orphans
- DS atoms 11/11, molecules 7/7, surfaces 7/7 (per `ds-outstandings.md`)
- Design-token guardrail holds; raw-hex exceptions ratcheted (340 lines of allowed exceptions)
- Group B/C/D/E/F all closed 2026-04-27
- Date-input codemod swept 51 conversions across 28 files
- ~50 lines of orphaned legacy CSS removed

**The thinness of this audit is a signal**, not a problem: the heavy normalization work was completed under Phase DS / Phase 18 ahead of this research effort.

## Skills invoked

- `code-review-excellence` and `tech-debt-tracker` — methodology inlined: leverage existing automated guardrails (`check-ds-conformance.cjs`, `check-design-tokens.cjs`) and existing per-cluster registers (`phase18-standardization-changelog.md`, `ds-deferred-items.md`) as the source of truth; only audit the *gaps*.
- The spec-named `engineering:code-review` plugin not installed; the local `code-review-excellence` covers the methodology.

## Tracker append plan (on user approval)

A new sub-heading `### Phase 6 — UI normalization (docs/planning/ui-normalization-audit.md)` will be appended to `## Research Findings (D-85+)`.

| New D-id | Description |
|---|---|
| D-133 | [REGRESSION] `frontend/src/routes/my-time/MyTimePage.tsx:821` raw `<button>` violates `no-raw-button` ERROR rule (1 occurrence; baseline=0). Replace with DS `<Button>` ghost/icon variant. Also: verify CI runs `node scripts/check-ds-conformance.cjs --report` as a blocking gate; the regression suggests it may not be enforced |
| D-134 | [DECIDE] Group A inline-panel architecture — `DepartmentSidebarDrawer.tsx` (231 LoC) + `PersonSidebarDrawer.tsx` (244 LoC) gated on the DS-5 / MasterDetailLayout decision per `ds-deferred-items.md`. Either schedule DS-5 to land or formally accept the inline pattern as the chosen UX |
| D-135 | [TEST] Add `DeliveryManagerDashboardPage.test.tsx` mirroring the other 7 role-dashboard tests. Per `phase18-standardization-changelog.md` 18-A-09 — DM dashboard is the only one without a test file |

(3 items; counter ends at D-135.)

## Open questions / next-session inputs

- **D-133 dual fix:** the regression itself is trivial (5-line `<Button>` swap). The deeper question is whether the conformance script runs in CI. If `node scripts/check-ds-conformance.cjs --report` is not a blocking PR check, more regressions will accumulate. Worth a one-line CI-config addition.
- **D-134 path:** schedule DS-5 (MasterDetailLayout) or accept inline pattern? The deferral is 7+ months old at this point; a decision either way unblocks the 475 LoC of code currently sitting in limbo.
- **Phase 7 input:** the next phase is tab/sidebar category review. It may also be largely covered by `phase18-route-jtbd-audit.md` (74 lines), which already maps every route to a JTBD persona. Plan a similarly-thin Phase 7.

## Exit conditions hit

- ✅ DS conformance state captured (running scripts; not just reading the closed-out doc)
- ✅ Token-guard verified live
- ✅ Page-grammar conformance delegated to existing Phase 18 register (no duplication)
- ✅ Deferred-items state cross-referenced (Group A surfaces as one D-item)
- ✅ UX-law coverage assessed
- ✅ Cross-references to existing tracker items (no re-mints)

**Stop here.** Awaiting validation gate before tracker append.
