import { ReactNode, useMemo, useState } from 'react';

import { Button } from './Button';
import { Checkbox } from './Checkbox';
import { EditableCell } from './EditableCell';
import { Input } from './Input';
import { Select } from './Select';
import { Table, type Column, type FilterKind, type TableVariant } from './Table';
import { useMediaQuery } from './use-media-query';

// ─── Public API types ────────────────────────────────────────────────────────

export type DataViewMode = 'client' | 'server';

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: string;
  direction: SortDirection;
}

/** Filter map: column key → user-entered string. Empty string means no filter. */
export type FilterState = Record<string, string>;

export interface PaginationState {
  page: number; // 1-indexed
  pageSize: number;
}

export interface BulkAction<TRow> {
  key: string;
  label: ReactNode;
  /** Called with the selected row keys + the corresponding rows. */
  onSelect: (selectedKeys: string[], rows: TRow[]) => void;
  /** Render the action button only when selection is non-empty. Default: true. */
  requiresSelection?: boolean;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface RowAction<TRow> {
  key: string;
  label: ReactNode;
  onSelect: (row: TRow) => void;
  /** Hide for some rows. */
  visibleFor?: (row: TRow) => boolean;
  tone?: 'default' | 'danger';
}

interface DataViewBaseProps<TRow> {
  columns: Column<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;
  /** Required when persistence (column visibility, saved views) is enabled. */
  viewId?: string;
  variant?: TableVariant;
  caption?: string;
  emptyState?: ReactNode;
  /** Slot for a domain-specific toolbar (export, "create" buttons, view switchers).
   *  Rendered above the filter row. */
  toolbar?: ReactNode;
  bulkActions?: BulkAction<TRow>[];
  rowActions?: RowAction<TRow>[];
  /** Click on row body. Independent of row-level action menu. */
  onRowClick?: (row: TRow, index: number) => void;
  /** Hides the column-visibility toggle button. Default: visible. */
  hideColumnToggle?: boolean;
  /** Default page sizes. */
  pageSizeOptions?: number[];
  testId?: string;
  className?: string;

  /**
   * Phase DS-4-4 — mobile card-list mode. When true (default), the table
   * automatically switches to a card-per-row layout below the `sm`
   * breakpoint (≤640px). Set to `false` to keep the table layout on mobile
   * (with horizontal scroll). Useful for tables that genuinely need a wide
   * grid even on mobile (e.g. matrix views).
   */
  cardModeOnMobile?: boolean;

  /**
   * Phase DS-4-3 — auto-virtualize when `pagedRows.length` exceeds this.
   * Default: 200. Set to `Infinity` to opt out.
   */
  virtualizeThreshold?: number;
  /** Pixel height per row when virtualizing. Default: 36 (default variant) /
   *  28 (compact, embedded). Must match the actual rendered height — variable
   *  heights are out of scope. */
  virtualizeRowHeight?: number;
  /** Scroll-container max height when virtualizing. Default: 600px. */
  virtualizeMaxHeight?: number;

  /** @reserved DS-4-6 */
  reorderableRows?: boolean;
  /** @reserved DS-4-6 */
  groupBy?: string;
}

interface ClientModeProps<TRow> extends DataViewBaseProps<TRow> {
  mode?: 'client';
  /** Initial controlled state — uncontrolled if absent. */
  initialFilters?: FilterState;
  initialSort?: SortState | null;
  initialPagination?: PaginationState;
}

interface ServerModeProps<TRow> extends DataViewBaseProps<TRow> {
  mode: 'server';
  /** Total row count across all pages, from the server. */
  totalCount: number;
  /** Current filter state, controlled by the parent. */
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  sort: SortState | null;
  onSortChange: (next: SortState | null) => void;
  pagination: PaginationState;
  onPaginationChange: (next: PaginationState) => void;
  /** Loading flag — when true, the table renders rows but shows a busy indicator
   *  in the toolbar. */
  loading?: boolean;
}

type DataViewProps<TRow> = ClientModeProps<TRow> | ServerModeProps<TRow>;

// ─── Filter / sort helpers ──────────────────────────────────────────────────

function getSortableValue<TRow>(column: Column<TRow>, row: TRow): unknown {
  if (column.getValue) return column.getValue(row);
  return null;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function applySort<TRow>(
  rows: TRow[],
  columns: Column<TRow>[],
  sort: SortState | null,
): TRow[] {
  if (!sort) return rows;
  const column = columns.find((c) => c.key === sort.key);
  if (!column?.sortable) return rows;
  const sorted = [...rows];
  sorted.sort((a, b) => {
    const va = getSortableValue(column, a);
    const vb = getSortableValue(column, b);
    return sort.direction === 'asc' ? compareValues(va, vb) : -compareValues(va, vb);
  });
  return sorted;
}

function applyFilters<TRow>(
  rows: TRow[],
  columns: Column<TRow>[],
  filters: FilterState,
): TRow[] {
  return rows.filter((row) => {
    for (const column of columns) {
      const filterDef = column.filter;
      if (!filterDef) continue; // covers undefined AND `filter: false`
      if (filterDef.kind === 'none') continue;
      const raw = filters[column.key];
      if (raw == null || raw === '') continue;
      const value = column.getValue ? column.getValue(row) : null;
      if (!matchFilter(filterDef, raw, value)) return false;
    }
    return true;
  });
}

function matchFilter(filter: FilterKind, query: string, value: unknown): boolean {
  if (filter.kind === 'text') {
    return String(value ?? '').toLowerCase().includes(query.toLowerCase());
  }
  if (filter.kind === 'multiselect') {
    const queries = query.split(',').map((q) => q.trim().toLowerCase()).filter(Boolean);
    if (queries.length === 0) return true;
    return queries.includes(String(value ?? '').toLowerCase());
  }
  if (filter.kind === 'date') {
    return String(value ?? '') === query;
  }
  if (filter.kind === 'numeric') {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return false;
    const m = query.match(/^(>=|<=|>|<|=)?\s*(-?\d+(\.\d+)?)$/);
    if (!m) return false;
    const op = m[1] ?? '=';
    const target = Number(m[2]);
    if (op === '>') return numeric > target;
    if (op === '<') return numeric < target;
    if (op === '>=') return numeric >= target;
    if (op === '<=') return numeric <= target;
    return numeric === target;
  }
  return true;
}

// ─── Filter input row ───────────────────────────────────────────────────────

interface FilterRowProps<TRow> {
  columns: Column<TRow>[];
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
  multiselectOptions: Map<string, string[]>;
}

function FilterRow<TRow>({
  columns,
  filters,
  onFiltersChange,
  multiselectOptions,
}: FilterRowProps<TRow>): JSX.Element | null {
  const hasAnyFilter = columns.some((c) => c.filter && c.filter.kind !== 'none');
  if (!hasAnyFilter) return null;

  function setColumnFilter(key: string, value: string): void {
    const next = { ...filters };
    if (value === '') delete next[key];
    else next[key] = value;
    onFiltersChange(next);
  }

  return (
    <div className="ds-data-view__filter-row" role="group" aria-label="Filters">
      {columns.map((column) => {
        const f = column.filter;
        const value = filters[column.key] ?? '';
        if (!f || f.kind === 'none') {
          return <div key={column.key} className="ds-data-view__filter-cell" style={{ width: column.width }} />;
        }
        if (f.kind === 'text') {
          return (
            <div key={column.key} className="ds-data-view__filter-cell" style={{ width: column.width }}>
              <Input
                value={value}
                onChange={(e) => setColumnFilter(column.key, e.target.value)}
                placeholder="Filter…"
              />
            </div>
          );
        }
        if (f.kind === 'date') {
          return (
            <div key={column.key} className="ds-data-view__filter-cell" style={{ width: column.width }}>
              <Input
                type="date"
                value={value}
                onChange={(e) => setColumnFilter(column.key, e.target.value)}
              />
            </div>
          );
        }
        if (f.kind === 'numeric') {
          return (
            <div key={column.key} className="ds-data-view__filter-cell" style={{ width: column.width }}>
              <Input
                value={value}
                onChange={(e) => setColumnFilter(column.key, e.target.value)}
                placeholder="e.g. >=80"
              />
            </div>
          );
        }
        if (f.kind === 'multiselect') {
          const options = f.options ?? multiselectOptions.get(column.key) ?? [];
          return (
            <div key={column.key} className="ds-data-view__filter-cell" style={{ width: column.width }}>
              <Select
                value={value}
                onChange={(e) => setColumnFilter(column.key, e.target.value)}
              >
                <option value="">All</option>
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </div>
          );
        }
        return <div key={column.key} className="ds-data-view__filter-cell" style={{ width: column.width }} />;
      })}
    </div>
  );
}

// ─── Sort / row-actions / bulk-select header decoration ─────────────────────

interface SortableHeaderProps {
  title: ReactNode;
  sortable: boolean;
  active: boolean;
  direction: SortDirection | null;
  onClick: () => void;
}

function SortableHeader({ title, sortable, active, direction, onClick }: SortableHeaderProps): JSX.Element {
  if (!sortable) return <>{title}</>;
  return (
    <button
      type="button"
      className="ds-data-view__sort-btn"
      onClick={onClick}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span>{title}</span>
      <span aria-hidden className="ds-data-view__sort-indicator">
        {active ? (direction === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  );
}

// ─── DataView ───────────────────────────────────────────────────────────────

/**
 * Phase DS-4-2 — compound table. Composes the `<Table>` primitive with:
 *   - sort (single-column, click header)
 *   - filter row (text / multiselect / date / numeric / none, per column)
 *   - pagination (`mode='client'` slices in-memory; `mode='server'` is controlled)
 *   - column visibility toggle (uses `useColumnVisibility` from
 *     `@/lib/hooks/useColumnVisibility` when `viewId` is set)
 *   - bulk selection + bulk actions
 *   - per-row action menu
 *   - toolbar slot for export / create
 *
 * Reserved for later (DS-4-3..6): auto-virtualization, mobile card-list mode,
 * inline cell edit via `Column.edit`, row reorder, groupBy, aggregations.
 *
 * The unified `Column<TRow>` type lets a single column definition feed both
 * `mode='client'` (StaffingDesk-style) and `mode='server'` (planned for the
 * 8-table migration sweep DS-4-7..14).
 */
export function DataView<TRow>(props: DataViewProps<TRow>): JSX.Element {
  // Discriminate without losing TS narrowing. Server mode owns its state;
  // client mode owns its own.
  const mode: DataViewMode = props.mode ?? 'client';
  const isServer = mode === 'server';

  const visibleColumns = useVisibleColumns(props);
  const enrichedColumns = visibleColumns;

  // ── Filter state ─────────────────────────────────────────────────────
  const [clientFilters, setClientFilters] = useState<FilterState>(
    !isServer ? (props as ClientModeProps<TRow>).initialFilters ?? {} : {},
  );
  const filters = isServer ? (props as ServerModeProps<TRow>).filters : clientFilters;
  const setFilters = isServer
    ? (props as ServerModeProps<TRow>).onFiltersChange
    : setClientFilters;

  // ── Sort state ───────────────────────────────────────────────────────
  const [clientSort, setClientSort] = useState<SortState | null>(
    !isServer ? (props as ClientModeProps<TRow>).initialSort ?? null : null,
  );
  const sort = isServer ? (props as ServerModeProps<TRow>).sort : clientSort;
  const setSort = isServer ? (props as ServerModeProps<TRow>).onSortChange : setClientSort;

  // ── Pagination state ─────────────────────────────────────────────────
  const defaultPagination: PaginationState = { page: 1, pageSize: props.pageSizeOptions?.[0] ?? 25 };
  const [clientPagination, setClientPagination] = useState<PaginationState>(
    !isServer ? (props as ClientModeProps<TRow>).initialPagination ?? defaultPagination : defaultPagination,
  );
  const pagination = isServer ? (props as ServerModeProps<TRow>).pagination : clientPagination;
  const setPagination = isServer
    ? (props as ServerModeProps<TRow>).onPaginationChange
    : setClientPagination;

  // ── Bulk selection ───────────────────────────────────────────────────
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // ── Derived rows ─────────────────────────────────────────────────────
  // Multiselect option auto-derivation (when `options` not supplied)
  const multiselectOptions = useMemo<Map<string, string[]>>(() => {
    const out = new Map<string, string[]>();
    for (const column of enrichedColumns) {
      const f = column.filter;
      if (!f || f.kind !== 'multiselect') continue;
      if (f.options) continue;
      if (!column.getValue) continue;
      const set = new Set<string>();
      for (const row of props.rows) {
        const v = column.getValue(row);
        if (v != null) set.add(String(v));
      }
      out.set(column.key, [...set].sort());
    }
    return out;
  }, [enrichedColumns, props.rows]);

  const filteredRows = useMemo(() => {
    if (isServer) return props.rows;
    return applyFilters(props.rows, enrichedColumns, filters);
  }, [isServer, props.rows, enrichedColumns, filters]);

  const sortedRows = useMemo(() => {
    if (isServer) return filteredRows;
    return applySort(filteredRows, enrichedColumns, sort);
  }, [isServer, filteredRows, enrichedColumns, sort]);

  const pagedRows = useMemo(() => {
    if (isServer) return sortedRows;
    const start = (pagination.page - 1) * pagination.pageSize;
    return sortedRows.slice(start, start + pagination.pageSize);
  }, [isServer, sortedRows, pagination]);

  const totalCount = isServer
    ? (props as ServerModeProps<TRow>).totalCount
    : sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));

  // ── Column header decoration (sort + bulk-select + row-actions) ──────
  const decoratedColumns: Column<TRow>[] = useMemo(() => {
    const cols: Column<TRow>[] = [];

    // Bulk-select column
    if (props.bulkActions && props.bulkActions.length > 0) {
      const allKeys = pagedRows.map((row, idx) => props.getRowKey(row, idx));
      const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));
      cols.push({
        key: '__select__',
        title: (
          <Checkbox
            checked={allSelected}
            onChange={(e) => {
              const next = new Set(selectedKeys);
              if (e.target.checked) {
                allKeys.forEach((k) => next.add(k));
              } else {
                allKeys.forEach((k) => next.delete(k));
              }
              setSelectedKeys(next);
            }}
            aria-label="Select all rows"
          />
        ),
        width: 32,
        align: 'center',
        render: (row, index) => {
          const k = props.getRowKey(row, index);
          return (
            <Checkbox
              checked={selectedKeys.has(k)}
              onChange={(e) => {
                const next = new Set(selectedKeys);
                if (e.target.checked) next.add(k);
                else next.delete(k);
                setSelectedKeys(next);
              }}
              aria-label={`Select row ${index + 1}`}
            />
          );
        },
      });
    }

    // Real columns with sort decoration + (DS-4-5) inline-edit wrapping
    for (const column of enrichedColumns) {
      const baseRender = column.render;
      const wrappedRender: Column<TRow>['render'] | undefined = column.edit
        ? (row, index) => {
            const displayContent = baseRender
              ? baseRender(row, index)
              : column.getValue
                ? String(column.getValue(row) ?? '')
                : null;
            return (
              <EditableCell
                row={row}
                rowIndex={index}
                column={column}
                displayContent={displayContent}
              />
            );
          }
        : baseRender;

      cols.push({
        ...column,
        render: wrappedRender,
        title: (
          <SortableHeader
            title={column.title}
            sortable={column.sortable === true}
            active={sort?.key === column.key}
            direction={sort?.key === column.key ? sort.direction : null}
            onClick={() => {
              if (!column.sortable) return;
              if (sort?.key !== column.key) setSort({ key: column.key, direction: 'asc' });
              else if (sort.direction === 'asc') setSort({ key: column.key, direction: 'desc' });
              else setSort(null);
            }}
          />
        ),
      });
    }

    // Row-actions column
    if (props.rowActions && props.rowActions.length > 0) {
      cols.push({
        key: '__actions__',
        title: '',
        width: 80,
        align: 'right',
        render: (row) => (
          <div className="ds-data-view__row-actions">
            {props.rowActions
              ?.filter((a) => !a.visibleFor || a.visibleFor(row))
              .map((a) => (
                <Button
                  key={a.key}
                  size="xs"
                  variant={a.tone === 'danger' ? 'danger' : 'ghost'}
                  onClick={() => a.onSelect(row)}
                >
                  {a.label}
                </Button>
              ))}
          </div>
        ),
      });
    }

    return cols;
  }, [enrichedColumns, sort, props, pagedRows, selectedKeys, setSort]);

  // ── Bulk-action bar ──────────────────────────────────────────────────
  const selectionRows = useMemo(
    () =>
      pagedRows.filter((row, idx) => selectedKeys.has(props.getRowKey(row, idx))),
    [pagedRows, selectedKeys, props],
  );
  const selectionCount = selectionRows.length;

  const bulkBar =
    props.bulkActions && props.bulkActions.length > 0 ? (
      <div className="ds-data-view__bulk-bar" aria-live="polite">
        <span className="ds-data-view__bulk-count">
          {selectionCount > 0 ? `${selectionCount} selected` : 'No rows selected'}
        </span>
        {props.bulkActions
          .filter((action) => action.requiresSelection !== false || true)
          .map((action) => {
            const enabled = (action.requiresSelection ?? true) ? selectionCount > 0 : true;
            return (
              <Button
                key={action.key}
                size="sm"
                variant={action.tone === 'danger' ? 'danger' : 'secondary'}
                disabled={!enabled || action.disabled}
                onClick={() =>
                  action.onSelect([...selectedKeys].filter((k) => selectionRows.some((_, i) => props.getRowKey(_, i) === k)), selectionRows)
                }
              >
                {action.label}
              </Button>
            );
          })}
      </div>
    ) : null;

  // ── Toolbar composite ────────────────────────────────────────────────
  const toolbar = (
    <div className="ds-data-view__toolbar">
      <div className="ds-data-view__toolbar-left">{props.toolbar}</div>
      <div className="ds-data-view__toolbar-right">
        {bulkBar}
      </div>
    </div>
  );

  // ── Pagination footer ────────────────────────────────────────────────
  const footer = (
    <div className="ds-data-view__footer">
      <span className="ds-data-view__footer-summary">
        {totalCount === 0
          ? '0 rows'
          : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, totalCount)} of ${totalCount} rows`}
      </span>
      <div className="ds-data-view__pagination">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
          disabled={pagination.page <= 1}
          aria-label="Previous page"
        >
          ←
        </Button>
        <span className="ds-data-view__pagination-status">
          Page {pagination.page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setPagination({ ...pagination, page: Math.min(totalPages, pagination.page + 1) })}
          disabled={pagination.page >= totalPages}
          aria-label="Next page"
        >
          →
        </Button>
        {props.pageSizeOptions && props.pageSizeOptions.length > 1 && (
          <Select
            value={String(pagination.pageSize)}
            onChange={(e) => setPagination({ page: 1, pageSize: Number(e.target.value) })}
            aria-label="Rows per page"
            className="ds-data-view__page-size"
          >
            {props.pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option} / page</option>
            ))}
          </Select>
        )}
      </div>
    </div>
  );

  // ── Virtualization config (DS-4-3) ────────────────────────────────────
  const virtualizeThreshold = props.virtualizeThreshold ?? 200;
  const shouldVirtualize = pagedRows.length > virtualizeThreshold;
  const defaultRowHeight = props.variant === 'compact' || props.variant === 'embedded' ? 28 : 36;
  const virtualization = shouldVirtualize
    ? {
        rowHeight: props.virtualizeRowHeight ?? defaultRowHeight,
        containerHeight: props.virtualizeMaxHeight ?? 600,
      }
    : undefined;

  // ── Card-list mode (DS-4-4) ───────────────────────────────────────────
  const cardModeOnMobile = props.cardModeOnMobile ?? true;
  const isMobile = useMediaQuery('(max-width: 640px)');
  const useCardMode = cardModeOnMobile && isMobile;

  if (useCardMode) {
    return (
      <div className={['ds-data-view', 'ds-data-view--cards', props.className].filter(Boolean).join(' ')} data-testid={props.testId}>
        {toolbar}
        {pagedRows.length === 0 ? (
          <div className="ds-data-view__empty">{props.emptyState}</div>
        ) : (
          <ul className="ds-data-view__card-list" role="list">
            {pagedRows.map((row, index) => (
              <CardRow
                key={props.getRowKey(row, index)}
                row={row}
                index={index}
                columns={enrichedColumns}
                rowActions={props.rowActions}
                onRowClick={props.onRowClick}
              />
            ))}
          </ul>
        )}
        {footer}
      </div>
    );
  }

  return (
    <div className={['ds-data-view', props.className].filter(Boolean).join(' ')} data-testid={props.testId}>
      <Table
        columns={decoratedColumns}
        rows={pagedRows}
        getRowKey={props.getRowKey}
        variant={props.variant}
        caption={props.caption}
        onRowClick={props.onRowClick}
        emptyState={props.emptyState}
        virtualization={virtualization}
        toolbar={
          <>
            {toolbar}
            <FilterRow
              columns={enrichedColumns}
              filters={filters}
              onFiltersChange={(next) => {
                setFilters(next);
                // Reset to page 1 on any filter change.
                setPagination({ ...pagination, page: 1 });
              }}
              multiselectOptions={multiselectOptions}
            />
          </>
        }
        footer={footer}
      />
    </div>
  );
}

/** Apply optional column-visibility override. When `viewId` is set, the
 *  caller should supply a hidden-keys set elsewhere — for now we just honor
 *  `defaultHidden` as a static initial filter. The full preset/order workflow
 *  hooks into `useColumnVisibility` in DS-4-2 follow-up (kept minimal for
 *  the headline phase). */
function useVisibleColumns<TRow>(props: DataViewBaseProps<TRow>): Column<TRow>[] {
  const visible = useMemo(() => props.columns.filter((c) => !c.defaultHidden), [props.columns]);
  // Suppress unused warnings — viewId is reserved for the next iteration's
  // localStorage hook; hideColumnToggle similarly.
  void props.viewId;
  void props.hideColumnToggle;
  return visible;
}

/**
 * Phase DS-4-4 — single card row in mobile card-list mode. The first column
 * is the card "title"; remaining columns render as label + value pairs in
 * the body. Row actions (when defined on the parent DataView) appear at the
 * bottom of the card. Click on the card body fires `onRowClick`.
 */
function CardRow<TRow>({
  row,
  index,
  columns,
  rowActions,
  onRowClick,
}: {
  row: TRow;
  index: number;
  columns: Column<TRow>[];
  rowActions?: RowAction<TRow>[];
  onRowClick?: (row: TRow, index: number) => void;
}): JSX.Element {
  const [titleColumn, ...detailColumns] = columns;
  const renderCell = (column: Column<TRow>): ReactNode => {
    if (column.render) return column.render(row, index);
    if (column.getValue) return String(column.getValue(row) ?? '');
    return null;
  };
  const visibleActions = rowActions?.filter((a) => !a.visibleFor || a.visibleFor(row)) ?? [];

  return (
    <li className="ds-data-view__card" data-row-index={index}>
      <div
        className={['ds-data-view__card-body', onRowClick && 'ds-data-view__card-body--interactive'].filter(Boolean).join(' ')}
        role={onRowClick ? 'button' : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        onClick={onRowClick ? () => onRowClick(row, index) : undefined}
        onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row, index); } } : undefined}
      >
        {titleColumn ? (
          <div className="ds-data-view__card-title">{renderCell(titleColumn)}</div>
        ) : null}
        <dl className="ds-data-view__card-fields">
          {detailColumns.map((column) => (
            <div key={column.key} className="ds-data-view__card-field">
              <dt className="ds-data-view__card-label">{column.title}</dt>
              <dd className="ds-data-view__card-value">{renderCell(column)}</dd>
            </div>
          ))}
        </dl>
      </div>
      {visibleActions.length > 0 ? (
        <div className="ds-data-view__card-actions">
          {visibleActions.map((a) => (
            <Button
              key={a.key}
              size="sm"
              variant={a.tone === 'danger' ? 'danger' : 'ghost'}
              onClick={(e) => {
                e.stopPropagation();
                a.onSelect(row);
              }}
            >
              {a.label}
            </Button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
