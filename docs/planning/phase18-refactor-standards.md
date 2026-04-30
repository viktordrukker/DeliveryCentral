# Phase 18 — Refactor Standards & Verification

**Created:** 2026-04-14

This document defines the mandatory constraints and verification template for every page-cluster task in Phase 18.

---

## 1. Do-Not-Regress Shared Primitives (18-0-03)

Every page refactor MUST use the following shared primitives. Introducing bespoke alternatives is a bug.

> **Phase DS supersedes raw primitives.** Phase DS shipped DS atoms / molecules / surfaces / table at [`@/components/ds`](../../frontend/src/components/ds/) and compound layouts at [`@/components/layout`](../../frontend/src/components/layout/). The full API reference + decision matrix is at [`ds-api-reference.md`](ds-api-reference.md). The tables below cover what's still owned by `@/components/common`.

### DS components (Phase DS — see [`ds-api-reference.md`](ds-api-reference.md))

| Primitive | Import | Usage |
|-----------|--------|-------|
| `Button` | `@/components/ds` | All actionable buttons. 7 variants × 4 sizes. Polymorphic (`as="a"`, `as={Link}`). No raw `<button>` (DS-7 guardrail). |
| `IconButton`, `Link` | `@/components/ds` | Icon-only buttons / in-content links. |
| `Input`, `Textarea`, `Select` | `@/components/ds` | Form atoms. Wrap in `<FormField>` for label/error chrome. |
| `Checkbox`, `Radio`, `Switch`, `CheckboxGroup`, `RadioGroup` | `@/components/ds` | Boolean inputs and grouped variants. |
| `DatePicker`, `DateRangePicker`, `Combobox`, `SearchInput` | `@/components/ds` | Specialized form molecules. |
| `Spinner`, `Skeleton` | `@/components/ds` | Loading affordances. |
| `Modal`, `FormModal`, `Drawer`, `Sheet`, `Popover`, `MenuPopover` | `@/components/ds` | All overlay surfaces. No `window.confirm` / `window.alert` (DS-7 ERROR-tier). |
| `Table`, `DataView` | `@/components/ds` | All tabular data. `<DataView>` for the standard case (filter / sort / page / select); `<Table>` for bespoke chrome. No raw `<table>` (DS-7 WARNING with baseline). |
| `FormField` | `@/components/ds` | Field shell — label + hint + error + required marker. |
| `DetailLayout` | `@/components/layout/DetailLayout` | Detail-Surface grammar wrapper. Other compound layouts (Dashboard / List / FormPage / Analysis / Admin / AuthShell) scheduled as follow-up. |
| `ThemeProvider`, `useThemePreference` | `@/components/ds` | Theme infrastructure. |

### Page-grammar primitives (owned by `@/components/common` — composed by DS layouts)

| Primitive | Import | Usage |
|-----------|--------|-------|
| `StatusBadge` | `@/components/common/StatusBadge` | All semantic status indicators (active, warning, danger, info, neutral). No inline badge markup. |
| `SectionCard` | `@/components/common/SectionCard` | All content section framing. |
| `PageContainer` | `@/components/common/PageContainer` | Layout shell for every page. |
| `PageHeader` | `@/components/common/PageHeader` | Top-of-page header. Consumed by `<DetailLayout>`. |
| `Breadcrumb` | `@/components/common/Breadcrumb` | Navigation breadcrumbs on detail pages. Consumed by `<DetailLayout>`. |
| `TabBar` | `@/components/common/TabBar` | Tab navigation. Consumed by `<DetailLayout>`. |
| `EmptyState` | `@/components/common/EmptyState` | All empty-data conditions. Must include a forward action (UX Law 2). |
| `ErrorState` | `@/components/common/ErrorState` | All error conditions. |
| `LoadingState` | `@/components/common/LoadingState` | All loading states. Use `variant="skeleton"` for dashboards. |
| `TipBalloon` / `TipTrigger` | `@/components/common/TipBalloon` | Contextual help tooltips. Every dashboard hero and action section should have one. |
| `FilterBar` | `@/components/common/FilterBar` | URL-persisted filters on list pages (when not using `<DataView>`'s built-in filter row). |
| `ConfirmDialog` | `@/components/common/ConfirmDialog` | All destructive actions. Built on the DS `<Modal>`. No `window.confirm()` (DS-7 ERROR-tier). |
| `design-tokens.ts` | `@/styles/design-tokens.ts` | Source of truth for visual tokens. No raw color literals outside token files. |

### Conformance guardrails

Two ratcheting checkers gate every PR — see [`ds-conformance-ratchet.md`](ds-conformance-ratchet.md):

- **`npm run tokens:check`** — raw-color guardrail. Update `scripts/design-token-baseline.json` with explicit justification when unavoidable.
- **`npm run ds:check`** — DS conformance. 6 rules (3 ERROR-tier locked at zero, 3 WARNING-tier with baselines). Promotion to ERROR happens automatically once a baseline reaches zero.

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
