# DC Design System — API Reference

**Phase:** DS-6
**Last updated:** 2026-04-27
**Source code:** [`frontend/src/components/ds/`](../../frontend/src/components/ds/)
**Stories:** Run `docker compose --profile ladle up -d ladle` and open `http://localhost:${LADLE_PORT}` (default 61000).
**Layout components:** [`frontend/src/components/layout/`](../../frontend/src/components/layout/)

This is the authoritative index of the design system. Every component listed here is **public API** — import from `@/components/ds` (atoms / molecules / surfaces / table) or `@/components/layout` (compound layouts). New consumers should reach for these first; raw HTML primitives are gated by the [`ds-conformance-ratchet`](ds-conformance-ratchet.md).

For deeper API details, every component carries JSDoc on the exported function/type — your IDE's hover should show it.

## When to use what — decision matrix

| You need… | Reach for… |
|---|---|
| A clickable thing that triggers an action | `<Button>` |
| A clickable icon (no label) | `<IconButton>` |
| Plain in-content navigation link | `<Link>` |
| A text input | `<Input>` (use inside `<FormField>` for label/error) |
| A multi-line input | `<Textarea>` |
| A native-select dropdown | `<Select>` |
| A typeahead select | `<Combobox>` |
| A checkbox | `<Checkbox>` (or `<CheckboxGroup>` for grouped) |
| A radio | `<Radio>` (or `<RadioGroup>` for grouped) |
| An on/off toggle | `<Switch>` |
| A date picker | `<DatePicker>` |
| A date-range picker | `<DateRangePicker>` |
| A search bar with optional clear | `<SearchInput>` |
| A loading spinner | `<Spinner>` |
| A skeleton placeholder | `<Skeleton>` |
| A centered confirmation / "are you sure" prompt | `<ConfirmDialog>` |
| A centered modal with custom content + custom footer | `<Modal>` |
| A centered modal whose body is a single form | `<FormModal>` |
| A right-side panel with backdrop | `<Drawer>` |
| A bottom-anchored panel (mobile drawer alternative) | `<Sheet>` |
| A floating panel anchored to a trigger | `<Popover>` |
| An action-menu list anchored to a trigger | `<MenuPopover>` |
| A standardized data table with filter/sort/page/select | `<DataView>` |
| A dumb table primitive (escape hatch with bespoke chrome) | `<Table>` |
| Click-to-edit cell inside a table | `Column.edit` (DS-4-5) |
| A field shell (label + hint + error + required marker) | `<FormField>` |
| A detail-page wrapper (breadcrumbs + header + tabs + sections) | `<DetailLayout>` |
| The current theme preference | `useThemePreference()` |

## Atoms (Phase DS-1)

### `<Button>`

Polymorphic action button. `as="button"` (default), `as="a"` for `<a>`-as-button, `as={Link}` for React Router links. 7 variants × 4 sizes.

- **Variants**: `primary` / `secondary` / `ghost` / `danger` / `link` / `iconOnly` (use `<IconButton>` instead)
- **Sizes**: `xs` / `sm` / `md` / `lg`
- **Props of note**: `loading` (shows spinner), `leadingIcon` / `trailingIcon`, `disabled`, polymorphic `as` + matching props (e.g. `to` when `as={Link}`, `href` when `as="a"`)
- **Story**: `Button.stories.tsx` — variants × sizes × loading × disabled × icons × polymorphic
- **Covers**: 387 callsites migrated from raw `<button className="button button--*">` (DS-1-7 codemod)

### `<IconButton>`

Icon-only button with a required `aria-label` for screen readers. Three sizes: `sm` / `md` / `lg`. Touch target ≥44px below `md` breakpoint.

### `<Link>`

Polymorphic in-content link. `as="a"` (default), `as={Link}` for React Router. Two visual sizes: `sm` / `md`. Use this for in-content text links, NOT for action buttons (use `<Button variant="link">` for those).

### `<Input>`, `<Textarea>`, `<Select>`

Form atoms. All accept `invalid` to map to `aria-invalid` + danger border, plus all the underlying HTML attributes. Use inside `<FormField>` for label/hint/error chrome.

### `<Checkbox>`, `<Radio>`, `<Switch>`

Boolean input atoms. Each is a styled wrapper around the native `<input type="checkbox|radio">` with a custom box. `<Switch>` is a checkbox visualized as an on/off toggle. Use `<CheckboxGroup>` / `<RadioGroup>` for vertical groups with shared label.

### `<Spinner>`

Indeterminate loading indicator. `size: 'xs' | 'sm' | 'md' | 'lg'`, `label` (default "Loading…"). Color inherits via `currentColor` when nested in a Button. Respects `prefers-reduced-motion`.

### `<Skeleton>`

Placeholder shape during loading. `shape: 'text' | 'block' | 'circle'`, controlled width / height. Use in lieu of spinners when the layout shape is known.

## Molecules (Phase DS-3)

### `<FormField>`

Field shell that owns label / hint / error / required-asterisk. Children are either a single atom (auto-id wired) or a render-prop `(props) => …` that receives `{ id, 'aria-invalid', 'aria-describedby' }`. The render-prop form is required when the field contains multiple controls or a wrapper.

```tsx
<FormField label="Email" required hint="Work email" error={errors.email}>
  {(props) => <Input type="email" {...props} value={email} onChange={...} />}
</FormField>
```

### `<DatePicker>`, `<DateRangePicker>`

Date inputs. `value` / `onValueChange` controlled API; `min` / `max` ISO bounds. `DateRangePicker` enforces `from ≤ to`.

### `<Combobox>`

Typeahead `<Select>` with arrow/Home/End/Enter/Escape keyboard nav. Renders a listbox via `<Popover>`. Async/server-driven options out of scope.

### `<SearchInput>`

`<Input type="search">` with a clear-button affordance when value is non-empty. Keyboard: Enter triggers `onSearch`.

### `<CheckboxGroup>`, `<RadioGroup>`

`<fieldset>` + `<legend>` shells that wrap multiple `<Checkbox>` / `<Radio>` atoms. `orientation: 'horizontal' | 'vertical'`.

## Surfaces (Phase DS-2)

### `<Modal>`

Generic centered modal shell. Owns: portal mount, backdrop, escape-key, click-outside, focus-trap, body-scroll-lock, stack management (z-index allocator).

- **Sizes**: `sm` (420px) / `md` (560px) / `lg` (760px) / `xl` (960px) / `fullscreen`
- **Mobile**: auto-collapses to fullscreen below `sm` breakpoint (CSS-driven)
- **Slots**: `title`, `description`, `footer`, `children` (body)
- **Auto-focus**: pass `data-autofocus="true"` on a child to make it focused on open
- **Stack**: nested modals share the body-scroll-lock counter and z-index allocator

### `<ConfirmDialog>` (built on `<Modal>`)

Centered "are you sure" with `tone: 'default' | 'danger'`. Required `title` / `message`; optional `confirmLabel`, `requireReason` (textarea-driven required reason).

```tsx
<ConfirmDialog
  open={confirmOpen}
  title="Discard changes?"
  message="Unsaved changes will be lost."
  confirmLabel="Discard"
  tone="danger"
  onCancel={() => setConfirmOpen(false)}
  onConfirm={() => { setConfirmOpen(false); navigate(-1); }}
/>
```

### `<FormModal>`

Centered modal whose body is a single `<form>` with a sticky footer. Tracks `submitting` state internally, blocks backdrop/escape/cancel while submitting; `dirty` flag triggers a `window.confirm('Discard your changes?')` prompt before close.

Use this when there's exactly one primary submit. For dual-submit (Save Draft / Submit), use `<Modal>` with a custom footer.

### `<Drawer>`

Slide-in side panel. `side: 'right' | 'left'`, `width: 'sm' | 'md' | 'lg'`, plus the same focus-trap / scroll-lock as Modal. Full-width below `sm`.

### `<Sheet>`

Bottom-anchored panel with a drag handle. Mobile-friendly drawer alternative. `max-height: 85vh` on desktop.

### `<Popover>`

Anchored floating panel. 6 placements (top / bottom / left / right + start/end variants). Outside-click close. **No** body-scroll-lock (lightweight).

### `<MenuPopover>`

Action-menu wrapper around `<Popover>`. `<MenuItem>` array → keyboard-navigated list. `tone: 'default' | 'danger'` per item.

## Tables (Phase DS-4)

### `<Table>`

Dumb table primitive. ~80 LoC. Sticky header, three variants (`default` / `compact` / `embedded`), `tableLayout: 'auto' | 'fixed'`, optional virtualization (DS-4-3), optional `renderFilterCell` for bespoke second-row filter cells, optional `cellProps` for per-cell HTML attributes.

Used directly by `<DataView>` and the rare bespoke table (StaffingDeskTable, AssignmentsWorkflowTable). Most consumers should reach for `<DataView>`.

### `<DataView>`

Compound table. Composes `<Table>` and owns: filter row, single-column sort, pagination, bulk selection + actions, per-row actions, toolbar slot. Two modes: `client` (in-memory sort/filter/page) and `server` (controlled — parent owns state).

- **Unified `Column<TRow, TValue>`** — see `Table.tsx` interface
- **Auto-virtualization** above `virtualizeThreshold` rows (default 200)
- **Inline cell edit** via `Column.edit` (DS-4-5) — `<EditableCell>` mounts on click
- **Reserved future props**: `reorderableRows`, `groupBy`, aggregations (DS-4-6)

### `Column.edit` (DS-4-5)

Per-column inline-edit definition. Five kinds (text / number / date / select / custom). Async `commit(row, next)`; reject to surface inline error and keep editor open. `validate?(next, row): string | null` for sync validation. `enabledFor?(row): boolean` for per-row gating (e.g. read-only external sources).

## Layouts (Phase DS-5)

### `<DetailLayout>`

Detail-Surface grammar wrapper. Composes `PageContainer` → optional `<Breadcrumb>` → `<PageHeader>` → optional `banners` → optional `kpiStrip` → optional `<TabBar>` → children.

```tsx
<DetailLayout
  breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project.name }]}
  eyebrow="Projects"
  title={project.name}
  actions={<Button onClick={handleEdit}>Edit</Button>}
  kpiStrip={<KpiStrip>...</KpiStrip>}
  tabs={TABS}
  activeTab={activeTab}
  onTabChange={setTab}
>
  {/* tab content */}
</DetailLayout>
```

Other compound layouts (DashboardLayout / ListLayout / FormPageLayout / AnalysisLayout / AdminLayout / AuthShell) are scheduled for follow-up turns.

## Theme

### `<ThemeProvider>` + `useThemePreference()`

Tri-state theme (`'light' | 'dark' | 'system'`) with localStorage persistence. The provider also configures the underlying MUI theme so any remaining MUI surfaces (auth pages, StatusBadge Chip) inherit the same palette.

```tsx
const { preference, setPreference, resolvedTheme } = useThemePreference();
```

## How to add a new component

1. Create `MyComponent.tsx` in `frontend/src/components/ds/` (or `layout/` for compound layouts).
2. Co-locate `MyComponent.stories.tsx` with at least 3 stories: default, edge case, theme variants.
3. Add a JSDoc block on the exported function describing what it is and when to reach for it.
4. Add to the index barrel `frontend/src/components/ds/index.ts`.
5. Add a row to the **decision matrix** above and a section under the appropriate phase.
6. If the component supersedes a legacy primitive: add a rule to [`scripts/check-ds-conformance.cjs`](../../scripts/check-ds-conformance.cjs) (warning-tier with baseline). When the baseline reaches zero, promote to `severity: 'error'` per the [ratchet](ds-conformance-ratchet.md).

## What's NOT in the DS

- **Domain pickers** (`PersonSelect`, `ProjectSelect`, `PeriodSelector`) — domain components in `@/components/common`. They consume DS atoms internally but model business concepts.
- **Status / freshness chrome** (`StatusBadge`, `EmptyState`, `ErrorState`, `LoadingState`, `TipBalloon`) — domain-leaning common components. `StatusBadge` is shipped widely; the others are slated for DS-5 sweep.
- **Dashboard composition** (`SectionCard`, `PageContainer`, `PageHeader`, `Breadcrumb`, `TabBar`) — page-grammar primitives in `@/components/common`. `<DetailLayout>` composes from these.

## See also

- [`ds-conformance-ratchet.md`](ds-conformance-ratchet.md) — guardrail playbook
- [`ds-mui-audit.md`](ds-mui-audit.md) — remaining MUI usages, replace/keep decisions
- [`ds-dash-compact-table-playbook.md`](ds-dash-compact-table-playbook.md) — table sweep playbook
- [`phase18-page-grammars.md`](phase18-page-grammars.md) — 8 canonical page grammars
- [`phase18-refactor-standards.md`](phase18-refactor-standards.md) — page-grammar standards (verification template, context continuity)
