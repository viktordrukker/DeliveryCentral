# Phase DS — Outstandings (CLOSED)

**Phase:** DS — **CLOSED**
**Last updated:** 2026-04-28
**Conformance baseline:** **0 violations** across 453 files (down from 239 at DS-1 reset, **−100%**)
**Source-of-truth metric:** `node scripts/check-ds-conformance.cjs --report`

The Phase DS standardization is **complete**. All 6 conformance rules sit at ERROR severity locked at zero. Every applicable consumer is migrated to the DS atom set; no raw `<button>`, raw `<table>`, raw `button`/`button--*` className, raw `<a className="button…">`, raw `window.confirm`, or raw `window.alert` can land in routes/features without explicit override.

## Headline state

| Category | Built | Migrated | Status |
|---|---|---|---|
| **DS atoms** | ✅ 11/11 | n/a | complete |
| **DS molecules** | ✅ 7/7 | n/a | complete |
| **DS surfaces** | ✅ 7/7 | 14/16 surfaces migrated | 2 inline panels (Group A — wait for MasterDetailLayout); not a Phase DS gap |
| **DS table** | ✅ 3/3 + drag-select props + `fullSpanRow` prop | All consumers migrated | complete |
| **DS layouts** | ✅ 6/6 | 8/8 grammar exemplars | complete |
| **DS theme** | ✅ 3/3 | n/a | complete |
| **DescriptionList atom** | ✅ shipped | All callers migrated | complete |
| **DataFreshness component** | ✅ extracted | All 5 dashboard callers | complete |
| **Conformance ratchet** | ✅ 6 rules; **6 ERROR-locked at zero** | n/a | complete |

## Conformance ratchet — all 6 rules at ERROR severity, zero baseline 🔒

| Rule | Severity | Count | Status |
|---|---|---:|---|
| `no-link-button-className` | 🔒 ERROR | 0 | locked since DS-1 |
| `no-window-confirm` | 🔒 ERROR | 0 | locked |
| `no-window-alert` | 🔒 ERROR | 0 | locked |
| `no-button-className` | 🔒 ERROR | 0 | promoted 2026-04-28 (was 18) |
| `no-raw-button` | 🔒 ERROR | 0 | promoted 2026-04-28 (was 87) |
| `no-raw-table` | 🔒 ERROR | 0 | **promoted 2026-04-28 (was 87, then 1, now 0)** |

## DS Table additive props (this program)

To unblock matrix carve-outs without forcing `<MatrixTable>` as a separate atom, three additive prop families were added to DS Table:

```ts
interface TableProps<TRow> {
  // … existing props …

  // Phase DS-7-2 — drag-select pattern (chart explorer)
  onRowMouseDown?: (row: TRow, index: number, event: React.MouseEvent) => void;
  onRowMouseEnter?: (row: TRow, index: number) => void;
  rowStyle?: (row: TRow, index: number) => React.CSSProperties | undefined;

  // Phase DS-7-3 — full-span banner / section-header / empty-state rows
  // (MyTimePage calendar exemplar)
  fullSpanRow?: (row: TRow, index: number) => React.ReactNode | null | undefined;
}
```

Combined with existing primitives (`cellStyle`, `headerClassName`, `footer`, `rowClassName`), these covered every matrix migration shipped this program — no `<MatrixTable>` atom needed.

## Decided NOT to migrate (carve-outs, with rationale)

These are explicit policy carve-outs documented in the conformance script's allowlist. They do not appear in the violation count and are not part of the closure criteria.

| Pattern | Where | Why |
|---|---|---|
| Auth pages keep MUI | LoginPage, ResetPasswordPage, ForgotPasswordPage, TwoFactorSetupPage | Bundle weight paid once; MUI auth ergonomics good. |
| StatusBadge `Chip` keeps MUI | `components/common/StatusBadge.tsx` | DS Chip atom not yet built. |
| AppShell hamburger + DEMO panel | `components/layout/AppShell.tsx` | Excluded via `ALLOWED_DIR_PREFIXES`. Structural shell furniture. |
| `<ConfirmDialog>` interior | `components/common/ConfirmDialog.tsx` | In `ALLOWED_FILES` — built ON DS Modal. |
| `<SrOnlyTable>` raw `<table>` | `components/charts/SrOnlyTable.tsx` | Accessibility primitive (WCAG 1.3.1). |
| Stories `*.stories.tsx` | All Ladle stories | Exempt by file-extension allowlist. |
| Test files `*.test.tsx` | All test files | Exempt by file-extension allowlist. |

## Sweep velocity reference

Cumulative across the DS sweep program (2026-04-27 → 2026-04-28):
- DS-1 → DS-7 phases: full
- ~85 dash-compact-tables migrated across ~65 files
- ~15 raw `<table className="data-table">` migrated
- **25** raw chart/heatmap/timeline/calendar/planner tables migrated to DS Table
- 87 → 0 raw-button violations (rule promoted to ERROR)
- 18 → 0 button-className violations (rule promoted to ERROR)
- 87 → 0 raw-table violations (rule promoted to ERROR — final iteration)
- DescriptionList + DataFreshness atoms shipped + all callers migrated
- DataTable.tsx deleted (zero callers)
- SrOnlyTable added to allowlist
- TabBar, TipBalloon, SectionCard, ContextMenu, CommandPalette, ChartExportMenu, ExportButton, ViewToggle, DateRangePreset internally migrated to DS atoms
- TeamList, IntegrationCard, DictionaryList, TemplateList, MetadataDictionaryList, AdminPanelPage migrated to DS Button (list-item-as-button pattern)
- WeeklyStatusForm, PulseReportForm, ScoreHeatmap, RadiatorChartTabs, PulseWidget custom toggle groups migrated to DS Button
- PlanningDropCell + BoardCell + ProjectTimeline.WeekCell refactored from `<td>` to `<div>` (composable inside DS Table)
- ProjectTimeline ProjectRow inlined into a `Column.render` function
- WorkforcePlanner refactored: month-header strip + DS Table grid + sticky-right Δ FTE column + cell-content `<div>` (preserves drag-and-drop simulation, cell-detail popover, draft-assignment modal, force-assign popover, inline bench chips)
- DS Table extended with `onRowMouseDown` / `onRowMouseEnter` / `rowStyle` (drag-select) and `fullSpanRow` (banner rows)
- **Conformance: 239 → 0 (−239, −100%)**

## Closure summary

Phase DS started at 239 violations across ~150 files. The work was delivered across 7 phase-substages plus a final sweep program that:
1. Built the DS atom / molecule / surface / table / layout layer (95% before this session)
2. Extracted the DescriptionList atom and DataFreshness component
3. Extended DS Table with drag-select and full-span-row props (instead of a separate `<MatrixTable>` atom)
4. Migrated every matrix file in the codebase — including drag-select chart tables, calendar grids with sticky cells and section-header colSpan, multi-row-thead workforce planners, inline-edit timesheet grids, and an 860-line drag-and-drop simulation grid
5. Promoted all 6 conformance rules to ERROR severity

There is **no further Phase DS work**. The conformance ratchet enforces no regression. New code added to `frontend/src/routes/**` and `frontend/src/features/**` cannot land with raw `<button>`, raw `<table>`, raw button-className-pattern, raw `<a className="button…">`, raw `window.confirm`, or raw `window.alert` without an explicit allowlist entry.
