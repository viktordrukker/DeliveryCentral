# Phase DS — Deferred Items Register

This is the **single source of truth** for everything in Phase DS that has been intentionally deferred from its original turn. Each entry records:

- where it lives (file paths + LoC)
- why it was deferred
- what shape its second-pass migration takes
- where it sits in the recommended execution order
- any blockers that must clear first

Run `node scripts/check-ds-conformance.cjs --report` to see the live conformance baseline this register reduces over time. Final state (when every item below is migrated): baseline shrinks from **239 → 0**, and each guardrail rule promotes from warning to error.

---

## Group A — Inline-panel "drawers" (DS-2-5 carry-over) — 2 items, ~475 LoC

These are **not** real overlay drawers. They render as inline content inside the org-chart container, with no backdrop and no body-scroll lock. Migrating them to `<Drawer>` is a UX semantic change (true overlay + backdrop appears over the org chart) — not a behavior-preserving swap.

| File | LoC | Surface today | If migrated to `<Drawer>` |
|---|---|---|---|
| [DepartmentSidebarDrawer.tsx](../../frontend/src/components/org/DepartmentSidebarDrawer.tsx) | 231 | Inline right-column panel inside [`InteractiveOrgChart`](../../frontend/src/components/org/InteractiveOrgChart.tsx) | Becomes a true overlay: backdrop appears over the org chart, click-outside dismisses, body scroll locks, mobile fills the screen |
| [PersonSidebarDrawer.tsx](../../frontend/src/components/org/PersonSidebarDrawer.tsx) | 244 | Sister component for person nodes | Same UX shift |

**Recommended path:** defer to **DS-5** (compound layouts). The right home is likely `MasterDetailLayout` — list of org units / people on the left, detail panel on the right, no "drawer" concept at all. Decision should be made when DS-5 is in flight, not retro-fitted to DS-2.

**Blocker:** none — purely a design call.

---

## ~~Group B — Complex planner popovers (DS-2-6 carry-over) — 2 items, ~320 LoC~~ ✅ DONE 2026-04-27

Tightly coupled to `PlannerSimulation` state and the planner grid. Both consumed by [WorkforcePlanner.tsx](../../frontend/src/components/staffing-desk/WorkforcePlanner.tsx).

| File | LoC | Today's shape | Target shape | Status |
|---|---|---|---|---|
| ~~[PlannerCellDetailPopover.tsx](../../frontend/src/components/staffing-desk/PlannerCellDetailPopover.tsx)~~ | ~~185~~ | ~~Custom backdrop overlay (`S_BACKDROP`, position: fixed, z-index 88) — modal-shaped despite the "popover" name~~ | ~~`<Modal size="md">`. Spawns `PlannerExtendAssignmentModal` internally — that internal call needs to lift to the parent `WorkforcePlanner` to avoid stacked-modal flicker~~ | ✅ migrated 2026-04-27 — `<Modal size="md">`; `onExtend` callback lifts `PlannerExtendAssignmentModal` to parent `WorkforcePlanner` (no stacked-modal flicker); all action chrome (Remove/Accept/Reject/Extend/Release) converted to `<Button>` atoms; cleared 2 raw-button conformance violations |
| ~~[PlannerForceAssignPopover.tsx](../../frontend/src/components/staffing-desk/PlannerForceAssignPopover.tsx)~~ | ~~134~~ | ~~Same custom-backdrop pattern~~ | ~~`<Modal size="sm">` with reason picker inside the body. Reason form has conditional fields based on `ForceAssignReasonType` — preserve those exactly~~ | ✅ migrated 2026-04-27 — `<Modal size="md">` (sized up — content needs the breathing room); FormField + Select + Textarea atoms; preserved tone color (danger/warning) in title for BLOCKED/MISMATCH; conditional Note field for `OTHER` reason preserved |

**Result:** Both surfaces are functionally centered modals despite the legacy "popover" name in the file. DS shell now owns aria-modal, focus trap, scroll lock, escape close, and mobile auto-fullscreen.

---

## Group C — Form modals (DS-2-7 deferred entirely) — 8 items, ~1946 LoC

All target `<FormModal>` (built in DS-2-4) but vary widely in complexity. **Sorted in recommended migration order** so each PR is one reviewable batch.

### Tier C1 — Simple wraps (4 items, ~700 LoC) — one turn

| # | File | LoC | Callers | Migration sketch |
|---|---|---|---|---|
| ~~1~~ | ~~BatchAssignmentConfirmModal~~ | ~~135~~ | ~~PlannedVsActualPage~~ | ~~`<FormModal>`~~ | ✅ migrated 2026-04-27 — single-submit form, fits FormModal shape cleanly; auto-handles submitting state + dirty-guard |
| ~~2~~ | ~~TeamBuilderModal~~ | ~~174~~ | _none — orphan_ | ~~delete~~ | ✅ deleted 2026-04-27 — confirmed zero callers, removed from `frontend/src/components/staffing-desk/` |
| ~~3~~ | ~~DetailedStatusModal~~ | ~~185~~ | ~~RadiatorTab~~ | ~~`<Modal>` (dual-submit)~~ | ✅ migrated 2026-04-27 — uses `<Modal>` not `<FormModal>` because the form has TWO submit paths (Save draft / Submit detailed). Also converts the legacy `button--project-detail` action buttons in this file to `<Button>` atoms. |
| ~~4~~ | ~~PlannerDraftAssignmentModal~~ | ~~193~~ | ~~WorkforcePlanner~~ | ~~`<Modal>` (dual-submit)~~ | ✅ migrated 2026-04-27 — same dual-submit case (Save draft / Create & request). All field labels migrated to `<FormField>` + DS atoms (`<Select>`, `<Input>`, `<Textarea>`, `<DatePicker>`). |

### Tier C2 — Medium (2 items, ~430 LoC) — half a turn

| # | File | LoC | Callers | Special concerns |
|---|---|---|---|---|
| ~~5~~ | ~~OverrideModal~~ | ~~222~~ | ~~RadiatorTab~~ | ~~`<FormModal submitDisabled={!validReason}>`~~ | ✅ migrated 2026-04-27 — single-submit FormModal; legacy `button--project-detail` score-preset buttons migrated to `<Button variant=primary\|secondary>`; reason-length validation surfaced via FormField `error` prop |
| ~~6~~ | ~~PlannerExtendAssignmentModal~~ | ~~244~~ | ~~PlannerCellDetailPopover, WorkforcePlanner~~ | ~~`<FormModal>` with validate-then-submit~~ | ✅ migrated 2026-04-27 — debounced (250ms) `validateExtension` runs in effect, gates `submitDisabled`. Submit label switches between "Extend" / "Extend anyway" based on soft conflicts. All conflict-row chrome preserved as body content. |

### Tier C3 — Complex (2 items, ~793 LoC) — **each its own turn**

| # | File | LoC | Callers | Why complex |
|---|---|---|---|---|
| ~~7~~ | ~~[CreateAssignmentModal.tsx](../../frontend/src/components/assignments/CreateAssignmentModal.tsx)~~ | ~~315~~ | ~~`PlannedVsActualPage`, `BatchAssignmentConfirmModal`~~ | ~~**Nested confirmations**~~ | ✅ migrated 2026-04-27 — `<Modal>` (3 submit paths + alt HR Case action; FormModal would be wrong shape). Inline overlap-confirm + discard-changes overlays → separate `<ConfirmDialog>` layers (DS stack manages z-index + focus trap stacking). FormFields + DS atoms throughout. Outer/inner split kept. Cleared 2 baseline violations (legacy HR Case raw `<button className="button button--primary">`). New artifacts: [ux-contracts/CreateAssignmentModal.md](ux-contracts/CreateAssignmentModal.md), [e2e/ux-regression/CreateAssignmentModal.spec.ts](../../e2e/ux-regression/CreateAssignmentModal.spec.ts) (smoke-level). |
| ~~8~~ | ~~[DimensionDetailModal.tsx](../../frontend/src/components/projects/DimensionDetailModal.tsx)~~ | ~~**478** (largest in DS-2)~~ | ~~`RadiatorTab`, `PulseReportForm`~~ | ~~Project radiator drill-down~~ | ✅ migrated 2026-04-27 — `<Modal size="xl">` (NOT FormModal — two submit paths). All 16 fieldsets preserved with grouping (Scope/Schedule/Budget/People). Narrative + Override + Reason fields wrapped in `<FormField>` with DS Textarea/Input. Auto-scroll-to-`initialFocusKey` preserved. Sequential override-application semantics preserved (deterministic audit ordering). 2 legacy `button--project-detail` buttons → DS Button (4 baseline violations cleared). New artifacts: [ux-contracts/DimensionDetailModal.md](ux-contracts/DimensionDetailModal.md), [e2e/ux-regression/DimensionDetailModal.spec.ts](../../e2e/ux-regression/DimensionDetailModal.spec.ts). |

---

## Group D — DS-1-7 codemod residuals — 35 occurrences in 18 files

Already documented in detail at [`docs/planning/ds-1-7-codemod-residuals.md`](ds-1-7-codemod-residuals.md). Summary by pattern:

| Pattern group | Count | Recipe | Status |
|---|---|---|---|
| ~~A — Toggle button group~~ | 12 / 6 files | `<Button variant={active ? 'primary' : 'secondary'}>` | ✅ migrated 2026-04-27 |
| ~~B — `button--project-detail` legacy tab~~ | 21 / 10 files (full count larger than initial estimate) | DS Button with variant flip (primary/secondary based on active state) — TabBar component not needed for these toggle-group cases | ✅ migrated 2026-04-27 — 10 files swept (ProjectDetailPage Link buttons, ProjectLifecycleControls, OrganizationConfigPage, PulseReportForm, RadiatorTab, OverallScoreSparkline, PulseExceptionConsole, PulseActivityStream, InteractiveGantt, ReportingTierPicker). Remaining `button--project-detail` references are doc comments only — runtime DOM is clean. |
| ~~C — Computed-tone (data-driven `button--${tone}`)~~ | 4 / 2 files | `<Button variant={ba.tone}>` if values map cleanly | ✅ migrated 2026-04-27 (ActionDataTable + PaginationControls) |
| ~~D — Toggle group with horizon weeks~~ | 5 / 3 files | Same as A | ✅ migrated 2026-04-27 |
| ~~E — False positives (regex over-reported)~~ | 2 / 2 files | Manual edit, 2 lines each | ✅ migrated 2026-04-27 |

**Net result:** conformance baseline 239 → **117** (-122 total, **-51%**). Group D fully closed.

**Order:** ~~A + D first (mechanical, ~1 turn)~~; ~~C (touches shared components — ActionDataTable, PaginationControls — extra care; ~half turn)~~; ~~B last~~ ✅ done 2026-04-27 (DS Button variant-flip pattern fits, no Tabs component needed for the toggle groups); ~~E along the way~~.

---

## ~~Group E — Orphaned legacy CSS (DS-7 cleanup territory)~~ ✅ DONE 2026-04-27

Now-unused CSS classes in [`frontend/src/styles/global.css`](../../frontend/src/styles/global.css) after DS-2 migrations land:

| Class family | Source migration | Status |
|---|---|---|
| ~~`.copy-week-popover`, `.copy-week-popover__actions`~~ | TimesheetPage popover migration (DS-2-6) | ✅ removed 2026-04-27 |
| ~~`.desc-popover-overlay`, `.desc-popover`, `.desc-popover__title`, `.desc-popover__actions`~~ | TimesheetPage popover migration (DS-2-6) | ✅ already removed (no longer in `global.css`) |
| ~~`.confirm-dialog-overlay`, `.confirm-dialog`, `.confirm-dialog__*`~~ | ConfirmDialog rebuild (DS-2-3) | ✅ removed 2026-04-27 — App.tsx Keyboard Shortcuts modal (last consumer) migrated to `<Modal size="sm">` in the same turn |
| ~~`.confirm-dialog__overlay` + `confirm-fade-in` keyframe~~ | DS Modal owns its own animation | ✅ removed 2026-04-27 |

**Result:** ~50 lines removed from `global.css` (4159 → 4109). DS Modal + DS Popover own all this styling now. tsc clean; ds:check baseline unchanged at 229.

**Verification:** `grep -rn "<class-name>" frontend/src` returns zero callsites; safe to remove.

---

## Group F — DS-3 follow-ups (sweep + domain-picker refactor)

Marked separately because they depend on DS-3 atoms landing first.

| Sub-item | Scope |
|---|---|
| ~~DS-3-3 Domain pickers refactor~~ | ~~Single-PR sweep~~ | ✅ migrated 2026-04-27 — `PersonSelect`/`ProjectSelect` now use `<FormField>`+`<Select>` (native `<select required>` preserved); `PeriodSelector` uses `<Button>` atoms. Combobox upgrade gated on UX acceptance (HTML5 required → custom validation tradeoff) |
| ~~DS-3-4 Date-input sweep~~ | ~~Mechanical replace~~ | ✅ migrated 2026-04-27 — codemod-driven, **51 conversions across 28 files**. `scripts/codemod-ds-datepicker.cjs` |

---

## Group G — DS-4 advanced features (built on top of `<Table>` + `<DataView>` MVP)

The DS-4 MVP delivers `<Table>` + `<DataView>` with client/server modes, sort, filter, pagination, bulk + row actions, toolbar, and a unified `Column<TRow>` type. The following additions are reserved props on the API but not yet implemented — each needs its own focused turn because they touch performance, mobile UX, and editing semantics.

| Sub-item | Scope | Risk | Effort |
|---|---|---|---|
| ~~DS-4-3 Auto-virtualization above 200 rows~~ | ~~Inside `DataView`, swap the visible-rows render for a windowed list (~50 rendered, scroll-position driven). Test at 10k.~~ | ✅ done 2026-04-27 — manual windowing in `<Table>` (no new deps); auto-engages in `<DataView>` at 200 rows; 10k Ladle story confirms ~28 `<tr>`s mounted at any time |
| ~~DS-4-4 Mobile card-list mode below md~~ | ~~At `sm` breakpoint, swap the table for a card-per-row list~~ | ✅ done 2026-04-27 — DataView auto-swaps to card-per-row at ≤640px. `cardModeOnMobile?: boolean` prop (default true) for opt-out. Lightweight `useMediaQuery` hook (no MUI). 44px min touch targets, full keyboard nav. Filter-row→Sheet and bulk-select app-bar deferred (additive; most consumers don't use them). |
| ~~DS-4-5 Inline cell edit via `Column.edit`~~ | ~~Add `Column.edit?: ...` Click-to-edit, error revert~~ | ✅ done 2026-04-27 — 5 kinds (text/number/date/select/custom). Self-contained `<EditableCell>` handles state. Enter/blur commits, Escape cancels. Reject `commit()` to keep editor open with inline error. New Ladle `InlineEdit` story exercises all kinds + simulated rejection. |
| DS-4-6 Row reorder + groupBy + aggregations | Three orthogonal features. **Reorder**: `reorderableRows` prop + drag handle column. **Group**: `groupBy: string` prop, expand/collapse state. **Aggregations**: `aggregations: ColumnAgg[]` for footer rows | High | 2 turns (split: row-reorder first, then groupBy/agg) |

---

## Group H — DS-4 table migrations (8 existing tables → `<DataView>`)

The single most consequential set of migrations in Phase DS — collapses 8 different table implementations into 2 (`<Table>` for read-only embeds, `<DataView>` for everything else). After this is done, `EnterpriseTable.tsx` / `GridTable.tsx` / `VirtualTable.tsx` are deleted and `@mui/x-data-grid` is removed from `package.json`.

**Critical migration policy** (per the original plan): every page must produce **identical row sets / sort orders / pagination boundaries / XLSX export bytes** vs. pre-migration. localStorage column-preset keys (`sd-supply`, `sd-demand`, `asn-assignments`, `asn-positions`) must be preserved.

| # | Table | LoC | Caller(s) | Migration shape | Difficulty |
|---|---|---|---|---|---|
| ~~1~~ | ~~[ExceptionQueueTable.tsx](../../frontend/src/components/exceptions/ExceptionQueueTable.tsx)~~ | ~~80~~ | ~~`ExceptionsPage`~~ | ~~`<DataView mode="client">`~~ | ✅ migrated 2026-04-27 — `pageSizeOptions={[1000]}` to keep "render all" behavior; inline `ExceptionActionCell` Resolve/Suppress textarea preserved as a custom render |
| ~~2~~ | ~~[CaseListTable.tsx](../../frontend/src/components/cases/CaseListTable.tsx)~~ | ~~thin wrapper~~ | ~~`CaseDetailsPage`~~ | ~~`<DataView mode="client">` no `viewId`~~ | ✅ migrated 2026-04-27 — `getValue` populated on every column; EmptyState slot exercised; `pageSizeOptions={[1000]}` keeps "render all" |
| 3 | [ActionDataTable.tsx](../../frontend/src/components/common/ActionDataTable.tsx) callsites | ~250 | `DashboardPage`, `PlannedVsActualPage`, others | `<DataView mode="client">` with bulk select + quick-filter toolbar. Validates toolbar slot + pagination footer matches existing dashboard look | Medium |
| ~~4~~ | ~~[ProjectsPage.tsx](../../frontend/src/routes/projects/ProjectsPage.tsx) table~~ | ~~200~~ | ~~`ProjectsPage`~~ | ~~`<DataView mode="client">` with client-side sort + URL filter persistence~~ | ✅ migrated 2026-04-27 — imports swapped from `@/components/common/DataTable` to `@/components/ds`; existing custom health-sort toggle in column header still works (DataView's sort decoration only kicks in for `sortable: true` columns); `pageSizeOptions={[1000]}` matches legacy behavior |
| ~~5~~ | ~~[ProjectDashboardPage.tsx](../../frontend/src/routes/projects/ProjectDashboardPage.tsx) inline-edit cells~~ | ~~n/a~~ | ~~`ProjectDashboardPage`~~ | ~~First consumer of `Column.edit` (DS-4-5).~~ | ✅ closed 2026-04-27 — re-targeted. Audit showed `ProjectDashboardPage` has no inline-edit cells (entry was speculative). Genuine target was [`WorkEvidenceTable.tsx`](../../frontend/src/components/work-evidence/WorkEvidenceTable.tsx) — migrated to `<DataView>` with `Column.edit` on `effortHours` (number) + `summary` (text). New `ColumnEdit.enabledFor?: (row) => boolean` predicate keeps external sources (Jira/Meeting) read-only. Custom `WorkEvidenceEditCell` deleted. |
| ~~6~~ | ~~[StaffingDeskTable.tsx](../../frontend/src/components/staffing-desk/StaffingDeskTable.tsx)~~ | ~~~430~~ | ~~`StaffingDeskPage`~~ | ~~The big one.~~ | ✅ migrated 2026-04-27 — ported to the DS `<Table>` primitive (escape-hatch path, **not** full `<DataView>`). Justification: the UX contract requires bespoke filter UX (text autocomplete, multiselect-with-search + select-all, numeric `>=` operators) and a column configurator with drag-reorder + named presets — both richer than DataView's MVP. **`<Table>` extensions added** (small, generic): `renderFilterCell?: (column, index) => ReactNode` for the second `<thead>` filter row, and `cellProps?: (row, column, index) => Record<…>` for per-cell attribute injection (preserves `data-full` truncation tooltip). **Preserved**: `useColumnVisibility('sd-supply' \| 'sd-demand')` localStorage keys, ColumnConfigurator + drag-reorder + presets, SavedFiltersDropdown, page-owned pagination, `applyInlineFilters`/`computeUniqueValues`, byte-identical column definitions. **Gained**: auto-virtualization above 200 rows (DS-4-3), standardized hover row chrome, Table primitive's sticky header. ~135 lines of raw markup eliminated. |
| ~~7~~ | ~~[AssignmentsWorkflowTable.tsx](../../frontend/src/components/assignments/AssignmentsWorkflowTable.tsx)~~ | ~~~430~~ | ~~`AssignmentsPage`~~ | ~~Drop-in repeat of (6)~~ | ✅ migrated 2026-04-27 — drop-in repeat of DS-4-11 (StaffingDeskTable). Same DS `<Table>` primitive + escape-hatch extensions. Preserved: `useColumnVisibility('asn-assignments' \| 'asn-positions')` localStorage keys, `data-testid="workflow-table"` (consumed by AssignmentsPage.test), `tab-assignments`/`tab-positions` tab test ids, "Next Step" bespoke column, per-tab empty-state copy. |
| 8 | dash-compact-table sweep — 91 raw `<table className="dash-compact-table">` callsites at launch | distributed | many pages | Replace with `<Table variant="compact" />`. Per-file mechanical sweep (codemod-resistant due to varied column shapes). | In progress 2026-04-27 — 9/91 done in representative batch; 82 remaining gated behind incremental "touch + sweep" work. **Playbook**: [ds-dash-compact-table-playbook.md](ds-dash-compact-table-playbook.md). |

**Order:** 1 → 2 → 3 → 4 → 6 → 7 → (DS-4-5) → 5 → 8.

**After all 8 land:**
- ~~Delete `EnterpriseTable.tsx`, `GridTable.tsx`, `VirtualTable.tsx`~~ ✅ done 2026-04-27 — VirtualTable WAS used by BusinessAuditTable; migrated that to DS Table first, then deleted. Also dropped the orphan `common/index.ts` barrel and `useSavedViews.ts` hook.
- ~~`npm uninstall @mui/x-data-grid`~~ ✅ removed from `package.json` 2026-04-27 (lockfile cleanup pending next container `npm install`)
- ~~Run `npm run ds:check --report` and confirm baseline shrunk~~ ✅ baseline 239 → 159 (-80, **-33%**)
- Sweep [`DataTable.tsx`](../../frontend/src/components/common/DataTable.tsx) callers to import from `@/components/ds` instead, then delete the legacy file

---

## Recommended execution order (across remaining DS phases)

_Updated 2026-04-27 — DS-3 atoms and DS-4 MVP shipped; ordering re-flowed accordingly._

1. **Group D / A + D** — mechanical toggle-group sweep (one PR)
2. **Group H / table 1–4** — the easier table migrations (`ExceptionQueue` → `CaseList` → `ActionDataTable` → `ProjectsPage`). Validates the `DataView` API on real callsites before tackling Staffing
3. **DS-3-3** — domain-picker refactor using DS-3 molecules (`PersonSelect`, `ProjectSelect`, `PeriodSelector`)
4. **DS-3-4** — date-input sweep (~21 raw `<input type="date">`)
5. **Tier C1 form modals** (Batch, TeamBuilder verify-or-delete, DetailedStatus, PlannerDraft) — one batch
6. **Tier C2 form modals** (Override, PlannerExtend)
7. ~~**Group B planner popovers** — ForceAssign → CellDetail~~ ✅ done 2026-04-27
8. ~~**Group G / DS-4-3** — auto-virtualization (needed before Staffing migration to handle 10k-row scenarios)~~ ✅ done 2026-04-27
9. ~~**Group H / table 6 + 7** — StaffingDeskTable + AssignmentsWorkflowTable (the biggest migrations)~~ ✅ done 2026-04-27
10. ~~**Group G / DS-4-5** — inline cell edit (unlocks the next item)~~ ✅ done 2026-04-27
11. ~~**Group H / table 5** — ProjectDashboardPage inline-edit cells~~ ✅ re-targeted + done 2026-04-27 — actual target was `WorkEvidenceTable` (ProjectDashboardPage has no inline-edit cells)
12. ~~**Tier C3 form modals** — CreateAssignment + DimensionDetail (separate turns each, each with a UX-regression spec)~~ ✅ done 2026-04-27 — DS-2-7 fully closed (8/8)
13. **Group H / table 8** — dash-compact-table sweep — launched 2026-04-27 with 9/91 in first batch; remainder gated behind incremental sweeps (see [playbook](ds-dash-compact-table-playbook.md))
14. **Group G / DS-4-4** — mobile card-list mode
15. ~~**Group H aftermath** — delete EnterpriseTable / GridTable / VirtualTable / legacy DataTable; remove `@mui/x-data-grid`~~ ✅ partial 2026-04-27 — 4 orphan files deleted + `useSavedViews` deleted + `@mui/x-data-grid` removed from package.json. Legacy `DataTable.tsx` still has many callers (separate sweep work; would compete with the dash-compact-table sweep — same incremental policy applies).
16. **DS-5 layouts** (compound layouts) — launched 2026-04-27 with **DetailLayout** + responsive KPI strip (2-up on sm) + responsive tabs (horizontal scroll on sm) + ProjectDetailPage exemplar migration. Remaining 6 layouts (Dashboard / List / FormPage / Analysis / Admin / AuthShell) + sidebar mobile collapse + 7 more page-grammar exemplars deferred to follow-up turns. Group A org sidebars still wait for MasterDetailLayout adoption.
17. ~~**Group D / B** — `button--project-detail` → `<Tabs>` (after DS-3 `<Tabs>` ships in DS-5)~~ ✅ done 2026-04-27 — DS Button variant-flip pattern used instead of new Tabs component (cleaner fit for toggle-groups)
18. ~~**Group E** — orphaned CSS cleanup~~ ✅ done 2026-04-27 — ~50 lines removed from global.css; App.tsx Keyboard Shortcuts modal migrated to DS Modal
19. **Group G / DS-4-6** — row reorder + groupBy + aggregations (only if a request lands)
20. ~~**DS-6 Ladle docs** — README per component, story coverage gaps closed~~ ✅ done 2026-04-27 — `ds-api-reference.md` index supersedes per-component READMEs; standards doc updated to reference DS components (DS-6-3); 26 stories already shipped (DS-6-1)
21. ~~**DS-7** — flip baselines from warning to error; visual + UX regression suites in CI~~ ✅ partial 2026-04-27 — severity-aware ratchet shipped, 3 rules promoted to ERROR (link-button-className, window.confirm, window.alert), `no-raw-table` rule added (warning, 112 baselined), MUI audit log authored. Visual-regression suite still deferred. Playbook: [`ds-conformance-ratchet.md`](ds-conformance-ratchet.md).

---

## Update protocol

When a deferred item is migrated:

1. Move its row from this register to a one-line entry under the relevant phase in [`MASTER_TRACKER.md`](MASTER_TRACKER.md) with `_(migrated YYYY-MM-DD)_`.
2. Re-run `node scripts/check-ds-conformance.cjs --report` and confirm the baseline shrunk by the expected amount.
3. If the migration legitimately changed UX, update the corresponding [`ux-contract`](ux-contracts/) and the matching Playwright spec in [`e2e/ux-regression/`](../../e2e/ux-regression/).
4. **Do not** remove the entry from this register — collapse it to a single strikethrough line so the historical decision trail stays intact.
