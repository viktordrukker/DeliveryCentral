# Phase 18 — Refactor Standards & Verification

**Created:** 2026-04-14

This document defines the mandatory constraints and verification template for every page-cluster task in Phase 18.

---

## 1. Do-Not-Regress Shared Primitives (18-0-03)

Every page refactor MUST use the following shared primitives. Introducing bespoke alternatives is a bug.

| Primitive | Import | Usage |
|-----------|--------|-------|
| `DataTable` | `@/components/common/DataTable` | All tabular data. No raw `<table>` elements in page files. |
| `StatusBadge` | `@/components/common/StatusBadge` | All semantic status indicators (active, warning, danger, info, neutral). No inline badge markup. |
| `SectionCard` | `@/components/common/SectionCard` | All content section framing. |
| `PageContainer` | `@/components/common/PageContainer` | Layout shell for every page. |
| `EmptyState` | `@/components/common/EmptyState` | All empty-data conditions. Must include a forward action (UX Law 2). |
| `ErrorState` | `@/components/common/ErrorState` | All error conditions. |
| `LoadingState` | `@/components/common/LoadingState` | All loading states. Use `variant="skeleton"` for dashboards. |
| `TipBalloon` / `TipTrigger` | `@/components/common/TipBalloon` | Contextual help tooltips. Every dashboard hero and action section should have one. |
| `FilterBar` | `@/components/common/FilterBar` | URL-persisted filters on list pages. |
| `ConfirmDialog` | `@/components/common/ConfirmDialog` | All destructive actions. No `window.confirm()`. |
| `design-tokens.ts` | `@/styles/design-tokens.ts` | Source of truth for visual tokens. No raw color literals outside token files. |

### Token guardrail

`npm run tokens:check` must pass after every page change. If a new raw color is unavoidable, update `scripts/design-token-baseline.json` with an explicit justification.

### Route manifest

All role-gated routes must use constants from `@/app/route-manifest.ts`. No local role arrays.

---

## 2. Verification Template (18-0-04)

Every page-cluster task must verify the following before marking the task complete:

### A. Route-level smoke checks
- [ ] Page loads without console errors
- [ ] Page renders expected structural zones per its grammar
- [ ] `data-testid` attributes present for key sections (KPI strip, hero chart, action table)

### B. Role visibility checks
- [ ] Route is accessible by allowed roles (per route manifest)
- [ ] Route is hidden from forbidden roles (sidebar + direct URL)
- [ ] No visible-but-forbidden or forbidden-but-visible regressions

### C. Empty/error/loading states
- [ ] Loading state shows skeleton or spinner
- [ ] Error state shows message with retry/forward action
- [ ] Empty state shows descriptive message with forward action

### D. Preserved filter state
- [ ] Filters stored in URL search params (UX Law 5)
- [ ] Navigating to detail and pressing Back restores filtered view
- [ ] "Clear all" explicitly resets filters

### E. JTBD assertion
- [ ] At least one critical JTBD outcome is verified per affected page
- [ ] JTBD reference from `docs/testing/EXHAUSTIVE_JTBD_LIST.md` or `docs/testing/jtbd-matrix.json`

### F. Shared primitive compliance
- [ ] Uses `DataTable` for all tables
- [ ] Uses `StatusBadge` for all status indicators
- [ ] Uses `SectionCard` for all sections
- [ ] No raw color literals added
- [ ] `npm run tokens:check` passes
- [ ] No new local role arrays (uses route-manifest imports)

### G. Test coverage
- [ ] Unit test file exists alongside the page component
- [ ] Tests verify: structural zones render, KPIs show values, empty/error states work
- [ ] `npm --prefix frontend run test` passes with no regressions

---

## 3. Context Continuity Requirement (18-0-05)

Every list/detail redesign must preserve navigation context:

### Mandatory behaviors

1. **Filtered navigation survives detail pages.** When a user filters a list, clicks a row to view detail, then presses Back, the filtered view must restore. Implementation: filters live in URL search params.

2. **Back links restore exact filtered context.** Detail pages that link back to their parent list must append the preserved filter params.

3. **Breadcrumb context.** Detail pages should display a breadcrumb showing the navigation path (e.g., Projects > Atlas ERP Rollout > Budget).

4. **Drilldown context.** When navigating from a dashboard KPI to a filtered list, the filter params must be set on the target URL so the user sees exactly the subset the KPI represents.

5. **Post-action continuity (UX Law 3).** After create/update/delete, stay in working context. Show a success toast with next-action suggestions instead of navigating away.

### Standing acceptance criteria

For every Phase 18 cluster task that touches list-detail navigation:
- [ ] Clicking a row in a filtered list and pressing Back restores the filter state
- [ ] Dashboard KPI drilldowns land on a pre-filtered list
- [ ] Detail pages include a breadcrumb or clear back-link
- [ ] Post-action behavior shows toast + stays on current page (unless creation redirects to new entity)
