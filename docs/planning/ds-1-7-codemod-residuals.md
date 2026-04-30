# Phase DS-1-7 — Codemod Residuals

The DS-1-7 codemod ([scripts/codemod-ds-button.cjs](../../scripts/codemod-ds-button.cjs)) handles **static** `className="button button--…"` patterns only. Dynamic classNames (template literals, ternary expressions) are intentionally left for a manual sweep. This document is the punch list.

**Scope:** 35 occurrences across 18 files (vs. 387 static patterns the codemod swept automatically).

**Run** `node scripts/codemod-ds-button.cjs --dry-run` from the repo root to regenerate the live list; this doc is a snapshot.

---

## Pattern groups

### A. Toggle button group (`primary` when active, `secondary` otherwise)

The dominant residual pattern is a tab/toggle group:

```tsx
{['chart','table'].map((view) => (
  <button
    type="button"
    className={`button button--sm ${current === view ? 'button--primary' : 'button--secondary'}`}
    onClick={() => setCurrent(view)}
  >
    {view}
  </button>
))}
```

**Recommended migration:**

```tsx
{['chart','table'].map((view) => (
  <Button
    key={view}
    size="sm"
    variant={current === view ? 'primary' : 'secondary'}
    onClick={() => setCurrent(view)}
  >
    {view}
  </Button>
))}
```

Files (12 occurrences in 6 files):
- [frontend/src/components/charts/ReconciliationOverviewChart.tsx](../../frontend/src/components/charts/ReconciliationOverviewChart.tsx) — 2
- [frontend/src/components/charts/VarianceExplorerChart.tsx](../../frontend/src/components/charts/VarianceExplorerChart.tsx) — 3
- [frontend/src/components/charts/WorkforceOverviewChart.tsx](../../frontend/src/components/charts/WorkforceOverviewChart.tsx) — 2
- [frontend/src/routes/dashboard/PlannedVsActualPage.tsx](../../frontend/src/routes/dashboard/PlannedVsActualPage.tsx) — 9 (largest concentration; 5 toggles + 4 detail-tab buttons)
- [frontend/src/routes/admin/VendorRegistryPage.tsx](../../frontend/src/routes/admin/VendorRegistryPage.tsx) — 1 (`isActive ? secondary : primary` — note inverted polarity)
- [frontend/src/components/projects/ProjectLifecycleForm.tsx](../../frontend/src/components/projects/ProjectLifecycleForm.tsx) — 1

### B. `button--project-detail` legacy variant (project detail tabs)

```tsx
<button className={zoom === 'week' ? 'button--project-detail button--primary' : 'button--project-detail'}>
```

`button--project-detail` is a CSS class for the tab-style buttons inside ProjectDetailPage. Migration options:
1. Add a `tab` variant to `<Button>` and keep the existing CSS hooked on the new variant.
2. Replace with `<Tabs>` (DS-3 component, not yet built) — most semantically correct.

Recommend **option 2** — wait for DS-3, do these in the same PR.

Files:
- [frontend/src/components/projects/InteractiveGantt.tsx](../../frontend/src/components/projects/InteractiveGantt.tsx) — 2
- [frontend/src/components/projects/OverrideModal.tsx](../../frontend/src/components/projects/OverrideModal.tsx) — 1
- [frontend/src/components/projects/PulseActivityStream.tsx](../../frontend/src/components/projects/PulseActivityStream.tsx) — 1
- [frontend/src/components/projects/PulseExceptionConsole.tsx](../../frontend/src/components/projects/PulseExceptionConsole.tsx) — 1
- [frontend/src/components/projects/ReportingTierPicker.tsx](../../frontend/src/components/projects/ReportingTierPicker.tsx) — 1

### C. Computed-tone (data-driven variant)

```tsx
className={`button button--sm button--${ba.tone ?? 'secondary'}`}
```

The variant is derived from data. Migration:

```tsx
<Button size="sm" variant={ba.tone ?? 'secondary'}>…</Button>
```

But this requires the `tone` field's possible values to be a subset of `ButtonVariant`. If a callsite emits something the new `Button` doesn't accept (e.g., `button--info`), either extend `ButtonVariant` or coerce.

Files:
- [frontend/src/components/common/ActionDataTable.tsx](../../frontend/src/components/common/ActionDataTable.tsx) — 3 (`ba.tone`, `f.active`, `qa.tone`)
- [frontend/src/components/common/PaginationControls.tsx](../../frontend/src/components/common/PaginationControls.tsx) — 1

### D. Toggle group with horizon weeks / sim mode

```tsx
className={horizon === h.weeks ? 'button button--sm' : 'button button--secondary button--sm'}
```

Same shape as Group A but using a different boolean test (active = primary by absence of `button--secondary`). Translation:

```tsx
<Button size="sm" variant={horizon === h.weeks ? 'primary' : 'secondary'}>…</Button>
```

Files:
- [frontend/src/components/staffing-desk/ProjectTimeline.tsx](../../frontend/src/components/staffing-desk/ProjectTimeline.tsx) — 2
- [frontend/src/components/staffing-desk/WorkforcePlanner.tsx](../../frontend/src/components/staffing-desk/WorkforcePlanner.tsx) — 2
- [frontend/src/components/staffing-desk/StaffingDeskViewSwitcher.tsx](../../frontend/src/components/staffing-desk/StaffingDeskViewSwitcher.tsx) — 1

### E. False positives (regex over-reported)

The codemod's residual reporter caught two static-className buttons in pages with template-literal markers elsewhere. These are already migrate-eligible; a follow-up codemod sweep will pick them up:

- [frontend/src/routes/my-time/MyTimePage.tsx](../../frontend/src/routes/my-time/MyTimePage.tsx) — 1 (static, multi-line `onClick={() => { … }}` confused the residual finder; the regex didn't catch it as a primary match because of leading whitespace before `<button`)
- [frontend/src/routes/time-management/TimeManagementPage.tsx](../../frontend/src/routes/time-management/TimeManagementPage.tsx) — 1 (same shape)

Confirmed by inspection — these are static `className="button button--secondary button--sm"` strings; the codemod's primary regex didn't match because the file ALSO has dynamic-className buttons that the finder reports first. Fix: re-run the codemod after the dynamic ones in the same files are converted, or transform manually.

---

## Suggested execution order

1. **A + D first** — toggle groups are the most common pattern; can be done in one PR.
2. **C** (`ActionDataTable`, `PaginationControls`) — these are shared components used across many pages; touching them validates the variant-by-data pattern.
3. **B last** — wait for DS-3 `Tabs` component; replace `button--project-detail` callsites with proper tabs.
4. **E** — sweep with the codemod after A/D land in those files (or just edit by hand — only 2 lines).

After all groups are complete, `node scripts/codemod-ds-button.cjs --dry-run` should report `Residual occurrences: 0`.

This unblocks DS-1-6's ESLint baseline collapse to zero.
