# dash-compact-table sweep — migration playbook

**Phase:** DS-4-14 (Group H item 8)
**Last updated:** 2026-04-27

This document is the source of truth for migrating the remaining ~80 raw `<table className="dash-compact-table">` callsites to the DS `<Table>` primitive. The sweep is "easy — high volume": each file is mostly mechanical, but column shapes vary too much for a single regex codemod, so each conversion is per-file.

## Status

- **At DS-4-14 launch (2026-04-27):** 91 callsites across 49 files
- **After first batch (2026-04-27):** 82 callsites across 48 files (9 migrated, -10%)

### Migrated batch — 2026-04-27 (representative dashboards)

| File | Before | After | Notes |
|---|---:|---:|---|
| `routes/projects/ProjectDashboardPage.tsx` | 4 | 1 | Project Summary kept as raw `<table>` (key-value pattern, see §"Patterns to leave alone") |
| `routes/dashboard/DirectorDashboardPage.tsx` | 3 | 0 | All proper-tabular |
| `routes/dashboard/DeliveryManagerDashboardPage.tsx` | 4 | 1 | PortfolioHealth table kept as raw `<table>` (expandable rows — see §"Patterns to leave alone") |

### Remaining work — incremental

The remaining 82 callsites should be swept **as their owning page is touched** for any other DS reason — DS-5 layouts, feature work, etc. The conformance baseline currently holds raw `<button>`/`<a>`/`window.confirm` violations but does NOT yet baseline raw `<table>` (no rule for it yet — added in DS-7-1). When DS-7-1 lands, all remaining `<table>` callsites get baselined and the rule flips from warning → error once the baseline reaches zero.

## Conversion patterns

### Pattern A — proper-tabular (the mechanical case)

Source:
```tsx
<table className="dash-compact-table">
  <thead>
    <tr>
      <th>Header A</th>
      <th style={NUM}>Header B</th>
    </tr>
  </thead>
  <tbody>
    {items.map((item) => (
      <tr key={item.id}>
        <td>{item.a}</td>
        <td style={NUM}>{item.b}</td>
      </tr>
    ))}
  </tbody>
</table>
```

Target:
```tsx
<Table
  variant="compact"
  columns={[
    { key: 'a', title: 'Header A', getValue: (item) => item.a, render: (item) => item.a },
    { key: 'b', title: 'Header B', align: 'right', getValue: (item) => item.b, render: (item) => <span style={NUM}>{item.b}</span> },
  ] as Column<typeof items[number]>[]}
  rows={items}
  getRowKey={(item) => item.id}
/>
```

Key rules:
- Add `Table, type Column` to the existing `@/components/ds` import.
- `align: 'right'` replaces `style={NUM}` on `<th>` elements (NUM = `{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }`). Cells retain `style={NUM}` for the numeric font feature.
- `width` columns map directly: `<th style={{ width: 120 }}>` → `width: 120` on the Column.
- Cast: `as Column<typeof items[number]>[]` is the cleanest TypeScript-narrowing form when columns are inline. For module-scope column arrays use the explicit interface.
- `onRowClick={(item) => navigate(...)}` replaces `<tr style={{ cursor: 'pointer' }} onClick={...}>` — DS Table handles cursor + role + Enter/Space + hover chrome via the `--interactive` modifier.
- `data-testid` from the legacy `<table>` becomes `testId` on the DS Table.

### Pattern B — static-row tables (small, hand-written rows)

Source:
```tsx
<table className="dash-compact-table">
  <thead>...</thead>
  <tbody>
    <tr><td>Green</td><td>{ps.green}</td></tr>
    <tr><td>Amber</td><td>{ps.amber}</td></tr>
    <tr><td>Red</td><td>{ps.red}</td></tr>
  </tbody>
</table>
```

Target — build an array literal for rows:
```tsx
<Table
  variant="compact"
  columns={[
    { key: 'label', title: 'Status', getValue: (r) => r.label, render: (r) => r.label },
    { key: 'count', title: 'Count', align: 'right', getValue: (r) => r.count, render: (r) => <span style={NUM}>{r.count}</span> },
  ] as Column<{ label: string; count: number }>[]}
  rows={[
    { label: 'Green', count: ps.green },
    { label: 'Amber', count: ps.amber },
    { label: 'Red', count: ps.red },
  ]}
  getRowKey={(r) => r.label}
/>
```

## Patterns to leave alone (raw `<table>` is the right answer)

### Key-value description tables

Two-column "label : value" tables with no thead and no tbody.map (e.g. ProjectDashboardPage's Project Summary):

```tsx
<table className="dash-compact-table">
  <tbody>
    <tr><td style={{ fontWeight: 500 }}>Name</td><td>{project.name}</td></tr>
    <tr><td style={{ fontWeight: 500 }}>Code</td><td>{project.projectCode}</td></tr>
    <tr><td style={{ fontWeight: 500 }}>Status</td><td>{project.status}</td></tr>
  </tbody>
</table>
```

This is a **description list**, not a tabular dataset — DS Table doesn't fit. Either:
1. Leave as raw `<table>` (current decision)
2. Convert to a `<dl>`/`<dt>`/`<dd>` description list — needs a new DS atom (`<DescriptionList>` or similar). Out of scope for DS-4.

A future DS atom for description-list semantics will close this gap.

### Tables with expandable rows

Master-detail patterns where each row can expand to show a sub-section (e.g. DeliveryManagerDashboardPage's `PortfolioHealthHistoryTable` with embedded chart). DS Table doesn't yet support per-row expansion (reserved for DS-4-6 future work). Leave as raw `<table>` until DS-4-6 ships an `expandedRow?: (row) => ReactNode` prop.

### Tables with `colSpan`/`rowSpan` cells

Multi-cell column merging (rare). DS Table assumes one cell per column per row. Leave as raw `<table>`.

## Verification per-file

After each file's migration:
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json` — 0 new errors expected (29 host-side pre-existing only).
- `node scripts/check-ds-conformance.cjs --report` — no new violations expected; line drift on baselined entries needs `--write-baseline`.

## When to do this work

- **Right time**: when you're already in the file for another DS reason (DS-5 layout migration, feature work).
- **Wrong time**: doing all 82 in one pass without owning the surrounding pages — too risky to review.

The DS Table primitive is fit-for-purpose; the only blocker now is the per-file mechanical work, and that's lighter when it ride-alongs with other touches to the same file.
