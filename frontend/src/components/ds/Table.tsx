import { CSSProperties, ReactNode, UIEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { allocateZIndex, getPortalRoot } from './portal-stack';

/**
 * Phase DS-4 — unified column type. Subsumes the 5 different shapes the
 * inventory found across `DataTable`, `ActionDataTable`, `StaffingDeskTable`,
 * `GridTable`, and the implicit shape of raw `<table>` callsites.
 *
 *   - `render` is for display only.
 *   - `getValue` is the canonical scalar used by `<DataView>` for sort,
 *     filter, and XLSX export. Promote this from StaffingDeskTable's ColDef.
 *   - `filter: false` removes the filter cell entirely; `{ kind: 'none' }`
 *     keeps the cell empty so header alignment in mixed-filter tables is
 *     preserved.
 *   - `category` groups columns in the configurator (e.g. 'Core' / 'Person'
 *     / 'Assignment') — generic, not StaffingDesk-specific.
 *
 * Reserved (not yet implemented) — see DS-4-3..6 on the tracker:
 *   - virtualization (auto above 200 rows)
 *   - inline cell edit via `Column.edit`
 *   - row-reorder, groupBy, aggregations
 */
export type FilterKind =
  | { kind: 'text' }
  | { kind: 'multiselect'; options?: string[] }
  | { kind: 'date' }
  | { kind: 'numeric' }
  | { kind: 'none' };

/**
 * Phase DS-4-5 — inline cell editing. Set `Column.edit` to opt the cell into
 * click-to-edit. The editor variant is driven by `kind`:
 *   - `'text'` / `'number'` / `'date'` → typed `<input>` via DS atoms
 *   - `'select'`                       → `<Select>` with `options` (required)
 *   - `'custom'`                       → consumer-provided `renderEditor`
 *
 * Flow: click → editor mounts (auto-focus) → Enter or blur → `commit(row, next)`
 * resolves → exit edit mode. Reject the promise to surface an inline error and
 * keep the editor open for retry. Escape cancels without committing.
 *
 * Requires `Column.getValue` so the editor knows the current value to seed.
 */
export interface ColumnEdit<TRow, TValue = unknown> {
  kind: 'text' | 'number' | 'date' | 'select' | 'custom';
  /** Async commit. Reject to revert + surface error. */
  commit: (row: TRow, nextValue: TValue) => Promise<void>;
  /** Optional sync validator. Returns null = valid; string = error message. */
  validate?: (nextValue: TValue, row: TRow) => string | null;
  /** Required for `kind: 'select'`. */
  options?: ReadonlyArray<{ label: string; value: TValue }>;
  /** Required for `kind: 'custom'`. */
  renderEditor?: (props: {
    value: TValue;
    onChange: (next: TValue) => void;
    onCommit: () => void;
    onCancel: () => void;
  }) => ReactNode;
  /**
   * Per-row gating. When this returns `false`, the cell renders as plain
   * display (no hover affordance, no click handler). Use for rows that are
   * read-only by data source — e.g. work evidence rows whose `sourceType`
   * comes from an external system.
   */
  enabledFor?: (row: TRow) => boolean;
}

export interface Column<TRow, TValue = unknown> {
  /** Stable key. Unique within a single table. */
  key: string;
  /** Header content. */
  title: ReactNode;
  /** Display renderer. Falls back to `String(getValue(row) ?? '')` if absent. */
  render?: (row: TRow, index: number) => ReactNode;
  /** Canonical scalar for sort / filter / export. */
  getValue?: (row: TRow) => TValue | null;

  // Layout
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  cellStyle?: CSSProperties;

  // Behavior
  sortable?: boolean;
  filter?: FilterKind | false;
  exportable?: boolean;

  // Visibility / configurator
  defaultHidden?: boolean;
  category?: string;
  required?: boolean;
  reorderable?: boolean;

  /**
   * When true, the cell renders with `cell-truncate` chrome (single-line +
   * ellipsis) and a hover tooltip showing the full text taken from
   * `getValue(row)`. No need to set `className` or `cellProps` manually.
   */
  truncate?: boolean;

  /**
   * When true, the column header gets a drag handle on its right edge and
   * the user can resize the column. Requires `tableLayout='fixed'` to be
   * effective (auto-layout ignores explicit widths). Initial width is
   * `column.width`. Resize state is held inside the table; supply
   * `onColumnWidthChange` on `<Table>` to persist.
   */
  resizable?: boolean;

  /** Minimum width during resize (px). Default 40. */
  minWidth?: number;

  /** Phase DS-4-5 — inline cell edit. See `ColumnEdit` above. */
  edit?: ColumnEdit<TRow, TValue>;
}

export type TableVariant = 'default' | 'compact' | 'embedded';

interface TableProps<TRow> {
  columns: Column<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;
  /** Visual density. `compact` shrinks padding and font; `embedded` is for
   *  inline summary tables inside `<SectionCard>` etc. */
  variant?: TableVariant;
  caption?: string;
  /** Sticky table header (default true). */
  stickyHeader?: boolean;
  onRowClick?: (row: TRow, index: number) => void;
  /** Optional row-level mousedown handler. Used by drag-select tables (Phase
   *  DS-7-2 — chart explorer pattern). The handler receives the row, its
   *  index, and the underlying React mouse event so consumers can read modifier
   *  keys (shift/ctrl/meta) and call preventDefault. */
  onRowMouseDown?: (row: TRow, index: number, event: React.MouseEvent) => void;
  /** Optional row-level mouseenter handler. Used by drag-select tables to
   *  extend selection while the mouse is held. */
  onRowMouseEnter?: (row: TRow, index: number) => void;
  /** Optional per-row inline style. Used by drag-select tables to apply the
   *  selected highlight. */
  rowStyle?: (row: TRow, index: number) => React.CSSProperties | undefined;
  /** Phase DS-7-3 — when defined and returns a non-null ReactNode for a row,
   *  the row is rendered as a single full-width cell (colSpan all columns)
   *  instead of normal per-column cells. Used for section-header / banner /
   *  empty-state rows in calendar matrices (MyTimePage exemplar). */
  fullSpanRow?: (row: TRow, index: number) => React.ReactNode | null | undefined;
  /** Per-row className override. */
  rowClassName?: (row: TRow, index: number) => string | undefined;
  /** Optional minimum width in px or CSS length — useful when columns force
   *  horizontal scroll on narrow viewports. */
  minWidth?: number | string;
  /**
   * `auto` (default) follows browser content-driven sizing — widths on `<th>`
   * are hints. `fixed` honors `column.width` strictly via `<colgroup>` +
   * `table-layout: fixed`, which prevents content-heavy cells (e.g. inline
   * charts) from being squeezed by neighboring text columns.
   *
   * Use `fixed` when columns have meaningful explicit widths and the layout
   * must not redistribute (the StaffingDeskTable is the exemplar — its
   * Timeline column would otherwise lose width to Skills/Project).
   */
  tableLayout?: 'auto' | 'fixed';
  /** Empty-state node rendered when `rows.length === 0`. */
  emptyState?: ReactNode;
  /** Optional toolbar slot above the table — `<DataView>` populates this with
   *  the configurator + filter row + bulk-action bar. */
  toolbar?: ReactNode;
  /** Optional footer slot below the table — `<DataView>` populates this with
   *  the pagination strip. */
  footer?: ReactNode;
  /**
   * Optional per-column filter cell renderer. When set, a second `<thead>` row
   * is rendered with one `<th>` per column containing `renderFilterCell(col)`.
   * Column width is preserved automatically. Used by escape-hatch consumers
   * (e.g. `StaffingDeskTable`) that need bespoke filter UX richer than what
   * `<DataView>`'s built-in filter row offers.
   */
  renderFilterCell?: (column: Column<TRow>, index: number) => ReactNode;
  /**
   * Optional per-cell HTML attribute injection. Returned record is spread onto
   * the `<td>`. Used by escape-hatch consumers needing data-attributes on
   * cells (e.g. `data-full` for the `cell-truncate` tooltip CSS).
   */
  cellProps?: (row: TRow, column: Column<TRow>, index: number) => Record<string, string | number | undefined>;
  /**
   * Fired after the user finishes dragging a resize handle on a column with
   * `resizable: true`. Use to persist the new width (URL/localStorage). The
   * Table maintains the in-flight width internally regardless.
   */
  onColumnWidthChange?: (columnKey: string, width: number) => void;
  /** Initial overrides for column widths, keyed by `column.key`. Useful for
   *  restoring a saved layout. */
  columnWidths?: Record<string, number>;
  /**
   * Phase DS-4-3 — opt-in row virtualization.
   *
   * When set, the rendered table body is windowed: rows outside the visible
   * scroll area become a single tall spacer `<tr>`. Sticky header continues
   * to work because the scroll container is the wrapping div. `<DataView>`
   * auto-enables this when `pagedRows.length > virtualizeThreshold`.
   *
   * Tradeoff: tabbing through interactive children only visits rendered rows.
   * Acceptable for the 10k-row case (consumer-confirmed: a user navigating
   * between rows scrolls; they don't tab through 10k rows).
   */
  virtualization?: {
    /** Fixed pixel height per row. Required — variable heights are out of scope. */
    rowHeight: number;
    /** Pixel height of the scroll viewport. The thead sticks to this container. */
    containerHeight: number;
    /** Extra rows rendered above + below the viewport for smooth scroll. Default 6. */
    overscan?: number;
  };
  testId?: string;
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Phase DS-4-1 — dumb table primitive. Renames + trims the existing
 * `frontend/src/components/common/DataTable.tsx`:
 *
 *   - drops the unused `virtualize`/`visibleRows` props (auto-virtualization
 *     lands in `<DataView>` per DS-4-3)
 *   - adds `variant: 'default' | 'compact' | 'embedded'`
 *   - adds `toolbar` / `footer` slots so `<DataView>` can wrap it
 *
 * Used directly only by `<DataView>` and the rare custom-layout case (e.g.
 * StaffingBoard's drag-and-drop grid). All page code should reach for
 * `<DataView>` — its column type is identical.
 */
export function Table<TRow>({
  columns,
  rows,
  getRowKey,
  variant = 'default',
  caption,
  stickyHeader = true,
  onRowClick,
  onRowMouseDown,
  onRowMouseEnter,
  rowStyle,
  fullSpanRow,
  rowClassName,
  minWidth,
  tableLayout = 'auto',
  emptyState,
  toolbar,
  footer,
  virtualization,
  renderFilterCell,
  cellProps,
  onColumnWidthChange,
  columnWidths,
  testId,
}: TableProps<TRow>): JSX.Element {
  const [scrollTop, setScrollTop] = useState(0);
  const [widthOverrides, setWidthOverrides] = useState<Record<string, number>>(columnWidths ?? {});
  const [truncTooltip, setTruncTooltip] = useState<{ anchor: DOMRect; text: string } | null>(null);

  function handleTruncCellEnter(event: React.MouseEvent<HTMLTableCellElement>, fullText: string): void {
    const td = event.currentTarget;
    // Only show when content is actually clipped — measure the inner span when present.
    const measured = (td.firstElementChild as HTMLElement | null) ?? td;
    const overflows = measured.scrollWidth > measured.clientWidth + 1;
    if (!overflows) return;
    setTruncTooltip({ anchor: td.getBoundingClientRect(), text: fullText });
  }

  function handleTruncCellLeave(): void {
    setTruncTooltip(null);
  }

  useEffect(() => {
    if (columnWidths) setWidthOverrides(columnWidths);
  }, [columnWidths]);

  const resolvedWidth = useMemo(() => {
    return (column: Column<TRow>): number | string | undefined => {
      const override = widthOverrides[column.key];
      return override != null ? override : column.width;
    };
  }, [widthOverrides]);

  const dragRef = useRef<{ columnKey: string; lastWidth: number; startWidth: number; startX: number } | null>(null);

  function beginColumnResize(event: React.PointerEvent<HTMLSpanElement>, column: Column<TRow>): void {
    event.stopPropagation();
    event.preventDefault();
    const th = (event.currentTarget.closest('th') as HTMLTableCellElement | null);
    const startWidth = th?.getBoundingClientRect().width ?? 0;
    dragRef.current = { columnKey: column.key, lastWidth: startWidth, startWidth, startX: event.clientX };
    const handleMove = (e: PointerEvent): void => {
      const drag = dragRef.current;
      if (!drag) return;
      const delta = e.clientX - drag.startX;
      const min = column.minWidth ?? 40;
      const next = Math.max(min, Math.round(drag.startWidth + delta));
      drag.lastWidth = next;
      setWidthOverrides((prev) => (prev[column.key] === next ? prev : { ...prev, [column.key]: next }));
    };
    const handleUp = (): void => {
      const drag = dragRef.current;
      dragRef.current = null;
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      if (drag && onColumnWidthChange) onColumnWidthChange(drag.columnKey, drag.lastWidth);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  }

  if (rows.length === 0 && emptyState) {
    return (
      <div
        className={classNames('ds-table-shell', `ds-table-shell--${variant}`)}
        data-testid={testId}
      >
        {toolbar ? <div className="ds-table__toolbar">{toolbar}</div> : null}
        <div className="ds-table__empty">{emptyState}</div>
        {footer ? <div className="ds-table__footer">{footer}</div> : null}
      </div>
    );
  }

  // ── Virtualization window calculation ────────────────────────────────────
  let startIndex = 0;
  let endIndex = rows.length;
  let topSpacerHeight = 0;
  let bottomSpacerHeight = 0;
  if (virtualization) {
    const { rowHeight, containerHeight, overscan = 6 } = virtualization;
    const visibleCount = Math.ceil(containerHeight / rowHeight);
    startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    endIndex = Math.min(rows.length, startIndex + visibleCount + overscan * 2);
    topSpacerHeight = startIndex * rowHeight;
    bottomSpacerHeight = (rows.length - endIndex) * rowHeight;
  }

  const visibleRows = virtualization ? rows.slice(startIndex, endIndex) : rows;

  const scrollContainerStyle: CSSProperties | undefined = virtualization
    ? { maxHeight: virtualization.containerHeight, overflowY: 'auto' }
    : undefined;

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    if (!virtualization) return;
    setScrollTop(event.currentTarget.scrollTop);
  }

  return (
    <div
      className={classNames('ds-table-shell', `ds-table-shell--${variant}`)}
      data-testid={testId}
    >
      {toolbar ? <div className="ds-table__toolbar">{toolbar}</div> : null}
      <div
        className={classNames(
          'ds-table',
          `ds-table--${variant}`,
          virtualization && 'ds-table--virtualized',
        )}
        style={scrollContainerStyle}
        onScroll={virtualization ? handleScroll : undefined}
      >
        <table
          style={{
            ...(minWidth ? { minWidth } : null),
            ...(tableLayout === 'fixed' ? { tableLayout: 'fixed' } : null),
          }}
        >
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          {tableLayout === 'fixed' && (
            <colgroup>
              {columns.map((column) => {
                const w = resolvedWidth(column);
                return (
                  <col
                    key={column.key}
                    style={{
                      width: w,
                      minWidth: w,
                    }}
                  />
                );
              })}
            </colgroup>
          )}
          <thead className={stickyHeader ? 'ds-table__head--sticky' : undefined}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={classNames(column.headerClassName, column.resizable && 'ds-table__th--resizable')}
                  style={{
                    textAlign: column.align ?? 'left',
                    width: resolvedWidth(column),
                  }}
                >
                  <span className="ds-table__th-content">{column.title}</span>
                  {column.resizable && (
                    <span
                      aria-hidden="true"
                      className="ds-table__resize-handle"
                      onPointerDown={(e) => beginColumnResize(e, column)}
                      role="separator"
                    />
                  )}
                </th>
              ))}
            </tr>
            {renderFilterCell && (
              <tr className="ds-table__filter-row">
                {columns.map((column, index) => (
                  <th
                    key={`filter-${column.key}`}
                    style={{ width: resolvedWidth(column) }}
                  >
                    {renderFilterCell(column, index)}
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {topSpacerHeight > 0 && (
              <tr aria-hidden="true" className="ds-table__spacer">
                <td colSpan={columns.length} style={{ height: topSpacerHeight, padding: 0, border: 0 }} />
              </tr>
            )}
            {visibleRows.map((row, sliceIndex) => {
              const index = startIndex + sliceIndex;
              return (
                <tr
                  key={getRowKey(row, index)}
                  data-row-index={index}
                  className={classNames(
                    'ds-table__row',
                    onRowClick && 'ds-table__row--interactive',
                    rowClassName?.(row, index),
                  )}
                  onClick={onRowClick ? () => onRowClick(row, index) : undefined}
                  onMouseDown={onRowMouseDown ? (event) => onRowMouseDown(row, index, event) : undefined}
                  onMouseEnter={onRowMouseEnter ? () => onRowMouseEnter(row, index) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            onRowClick(row, index);
                          }
                        }
                      : undefined
                  }
                  role={onRowClick ? 'link' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  style={(() => {
                    const base: React.CSSProperties = virtualization
                      ? { height: virtualization.rowHeight }
                      : {};
                    const custom = rowStyle?.(row, index);
                    return custom ? { ...base, ...custom } : (virtualization ? base : undefined);
                  })()}
                >
                  {(() => {
                    const fullSpan = fullSpanRow?.(row, index);
                    if (fullSpan != null) {
                      return (
                        <td colSpan={columns.length} className="ds-table__cell ds-table__cell--full-span">
                          {fullSpan}
                        </td>
                      );
                    }
                    return null;
                  })()}
                  {fullSpanRow?.(row, index) != null ? null : columns.map((column) => {
                    const value = column.getValue ? column.getValue(row) : null;
                    const renderedValue = column.render
                      ? column.render(row, index)
                      : column.getValue
                      ? String(value ?? '')
                      : null;
                    const extraAttrs = cellProps ? cellProps(row, column, index) : undefined;
                    const fullText = value != null ? String(value) : '';
                    const cellClass = classNames(
                      column.className,
                      column.truncate && 'ds-table__cell--truncate',
                    );
                    const cellContent = column.truncate && column.render == null && value != null
                      ? <span className="ds-table__cell-text">{String(value)}</span>
                      : column.truncate
                      ? <span className="ds-table__cell-text">{renderedValue}</span>
                      : renderedValue;
                    const truncateHandlers = column.truncate && fullText
                      ? {
                          onMouseEnter: (e: React.MouseEvent<HTMLTableCellElement>) => handleTruncCellEnter(e, fullText),
                          onMouseLeave: handleTruncCellLeave,
                          title: fullText,
                        }
                      : undefined;
                    return (
                      <td
                        key={column.key}
                        className={cellClass}
                        style={{
                          textAlign: column.align ?? 'left',
                          width: resolvedWidth(column),
                          ...column.cellStyle,
                        }}
                        {...truncateHandlers}
                        {...extraAttrs}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {bottomSpacerHeight > 0 && (
              <tr aria-hidden="true" className="ds-table__spacer">
                <td colSpan={columns.length} style={{ height: bottomSpacerHeight, padding: 0, border: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footer ? <div className="ds-table__footer">{footer}</div> : null}
      {truncTooltip && <CellTruncationTooltip anchor={truncTooltip.anchor} text={truncTooltip.text} />}
    </div>
  );
}

interface CellTruncationTooltipProps {
  anchor: DOMRect;
  text: string;
}

function CellTruncationTooltip({ anchor, text }: CellTruncationTooltipProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [zIndex] = useState(() => allocateZIndex());
  const portalRoot = getPortalRoot();

  useLayoutEffect(() => {
    function recompute(): void {
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const margin = 8;
      const candidates = [
        { left: anchor.left, top: anchor.bottom + 4 },                              // below, left-aligned
        { left: anchor.right - rect.width, top: anchor.bottom + 4 },                // below, right-aligned
        { left: anchor.left, top: anchor.top - rect.height - 4 },                   // above, left-aligned
        { left: anchor.right + 4, top: anchor.top },                                // right
        { left: anchor.left - rect.width - 4, top: anchor.top },                    // left
      ];
      const fits = candidates.find((c) =>
        c.left >= margin
        && c.top >= margin
        && c.left + rect.width <= window.innerWidth - margin
        && c.top + rect.height <= window.innerHeight - margin
      );
      const chosen = fits ?? candidates[0];
      setPosition({
        left: Math.max(margin, Math.min(chosen.left, window.innerWidth - rect.width - margin)),
        top: Math.max(margin, Math.min(chosen.top, window.innerHeight - rect.height - margin)),
      });
    }
    recompute();
    const onScroll = (): void => recompute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [anchor, text]);

  if (!portalRoot) return null;

  return createPortal(
    <div
      ref={panelRef}
      className="ds-table__cell-tooltip"
      role="tooltip"
      style={{
        left: position?.left ?? -9999,
        top: position?.top ?? -9999,
        zIndex,
      }}
    >
      {text}
    </div>,
    portalRoot,
  );
}
