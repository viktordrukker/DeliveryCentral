import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/* ------------------------------------------------------------------ */
/*  Public types                                                       */
/* ------------------------------------------------------------------ */

export interface GridTableColumn<TRow> {
  key: string;
  header: string;
  width?: number | string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  sticky?: 'left' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: TRow, rowIndex: number) => ReactNode;
}

export interface GridTableProps<TRow> {
  columns: GridTableColumn<TRow>[];
  rows: TRow[];
  getRowKey: (row: TRow, index: number) => string;

  // Display
  emptyMessage?: string;
  loadingRows?: number;
  caption?: string;

  // Interaction
  onRowClick?: (row: TRow) => void;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;

  // Sorting
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;

  // Virtualization
  rowHeight?: number;
  visibleRows?: number;

  // Misc
  className?: string;
  stickyHeader?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_ROW_HEIGHT = 44;
const DEFAULT_VISIBLE_ROWS = 15;
const VIRTUALIZATION_THRESHOLD = 100;
const OVERSCAN = 5;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GridTable<TRow>({
  columns,
  rows,
  getRowKey,
  emptyMessage = 'No data',
  loadingRows,
  caption,
  onRowClick,
  selectedKeys,
  onSelectionChange,
  sortKey,
  sortDir,
  onSortChange,
  rowHeight = DEFAULT_ROW_HEIGHT,
  visibleRows = DEFAULT_VISIBLE_ROWS,
  className,
  stickyHeader = true,
}: GridTableProps<TRow>): JSX.Element {
  /* ---------- selection helpers ---------- */
  const selectable = !!onSelectionChange;
  const lastSelectedIdx = useRef<number | null>(null);

  /* ---------- effective columns (prepend checkbox col if selectable) ---------- */
  const effectiveColumns = useMemo(() => {
    if (!selectable) return columns;
    const checkboxCol: GridTableColumn<TRow> = {
      key: '__selection',
      header: '',
      width: 44,
      align: 'center',
    };
    return [checkboxCol, ...columns];
  }, [columns, selectable]);

  const colCount = effectiveColumns.length;
  const rowCount = rows.length;

  /* ---------- virtualization ---------- */
  const virtualize = !loadingRows && rowCount > VIRTUALIZATION_THRESHOLD;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (!virtualize) return;
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      setScrollTop(el!.scrollTop);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [virtualize]);

  const startIdx = virtualize
    ? Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN)
    : 0;
  const endIdx = virtualize
    ? Math.min(rowCount, Math.ceil((scrollTop + visibleRows * rowHeight) / rowHeight) + OVERSCAN)
    : rowCount;
  const totalHeight = virtualize ? rowCount * rowHeight : 0;
  const offsetTop = virtualize ? startIdx * rowHeight : 0;
  const offsetBottom = virtualize
    ? Math.max(0, totalHeight - offsetTop - (endIdx - startIdx) * rowHeight)
    : 0;

  /* ---------- keyboard focus ---------- */
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());

  const cellRefKey = (r: number, c: number) => `${r}-${c}`;

  const registerCell = useCallback((r: number, c: number, el: HTMLElement | null) => {
    const key = cellRefKey(r, c);
    if (el) {
      cellRefs.current.set(key, el);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  useEffect(() => {
    if (!focusedCell) return;
    const key = cellRefKey(focusedCell.rowIndex, focusedCell.colIndex);
    const el = cellRefs.current.get(key);
    if (el) el.focus();
  }, [focusedCell]);

  // Scroll focused row into view (virtualized)
  useEffect(() => {
    if (!virtualize || !focusedCell || !containerRef.current) return;
    const targetTop = focusedCell.rowIndex * rowHeight;
    const targetBottom = targetTop + rowHeight;
    const el = containerRef.current;
    // Account for header height (approx)
    if (targetTop < el.scrollTop) {
      el.scrollTop = targetTop;
    } else if (targetBottom > el.scrollTop + el.clientHeight) {
      el.scrollTop = targetBottom - el.clientHeight;
    }
  }, [focusedCell, virtualize, rowHeight]);

  const handleCellKeyDown = useCallback(
    (e: React.KeyboardEvent, ri: number, ci: number) => {
      let nextR = ri;
      let nextC = ci;
      let handled = true;

      switch (e.key) {
        case 'ArrowDown':
          nextR = Math.min(ri + 1, rowCount - 1);
          break;
        case 'ArrowUp':
          nextR = Math.max(ri - 1, 0);
          break;
        case 'ArrowRight':
          nextC = Math.min(ci + 1, colCount - 1);
          break;
        case 'ArrowLeft':
          nextC = Math.max(ci - 1, 0);
          break;
        case 'Home':
          if (e.ctrlKey || e.metaKey) {
            nextR = 0;
            nextC = 0;
          } else {
            nextC = 0;
          }
          break;
        case 'End':
          if (e.ctrlKey || e.metaKey) {
            nextR = rowCount - 1;
            nextC = colCount - 1;
          } else {
            nextC = colCount - 1;
          }
          break;
        case 'Enter':
        case ' ':
          if (onRowClick && ri >= 0 && ri < rowCount) {
            e.preventDefault();
            onRowClick(rows[ri]);
          }
          if (selectable && e.key === ' ') {
            e.preventDefault();
            toggleSelection(ri);
          }
          return;
        case 'Tab':
          // Let default tab behavior happen to exit grid
          return;
        default:
          handled = false;
      }

      if (handled) {
        e.preventDefault();
        if (nextR !== ri || nextC !== ci) {
          setFocusedCell({ rowIndex: nextR, colIndex: nextC });
        }
      }
    },
    [rowCount, colCount, onRowClick, rows, selectable],
  );

  /* ---------- selection logic ---------- */
  const toggleSelection = useCallback(
    (rowIndex: number) => {
      if (!onSelectionChange || !selectedKeys) return;
      const key = getRowKey(rows[rowIndex], rowIndex);
      const next = new Set(selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      lastSelectedIdx.current = rowIndex;
      onSelectionChange(next);
    },
    [onSelectionChange, selectedKeys, rows, getRowKey],
  );

  const handleCheckboxClick = useCallback(
    (rowIndex: number, e: React.MouseEvent) => {
      if (!onSelectionChange || !selectedKeys) return;
      if (e.shiftKey && lastSelectedIdx.current !== null) {
        const from = Math.min(lastSelectedIdx.current, rowIndex);
        const to = Math.max(lastSelectedIdx.current, rowIndex);
        const next = new Set(selectedKeys);
        for (let i = from; i <= to; i++) {
          next.add(getRowKey(rows[i], i));
        }
        onSelectionChange(next);
        lastSelectedIdx.current = rowIndex;
      } else {
        toggleSelection(rowIndex);
      }
    },
    [onSelectionChange, selectedKeys, rows, getRowKey, toggleSelection],
  );

  const toggleAll = useCallback(() => {
    if (!onSelectionChange || !selectedKeys) return;
    if (selectedKeys.size === rowCount) {
      onSelectionChange(new Set());
    } else {
      const all = new Set(rows.map((r, i) => getRowKey(r, i)));
      onSelectionChange(all);
    }
  }, [onSelectionChange, selectedKeys, rowCount, rows, getRowKey]);

  /* ---------- sorting ---------- */
  const handleSort = useCallback(
    (key: string) => {
      if (!onSortChange) return;
      if (sortKey === key && sortDir === 'asc') {
        onSortChange(key, 'desc');
      } else {
        onSortChange(key, 'asc');
      }
    },
    [onSortChange, sortKey, sortDir],
  );

  /* ---------- column style helpers ---------- */
  const colStyle = (col: GridTableColumn<TRow>): React.CSSProperties => {
    const s: React.CSSProperties = {};
    if (col.width !== undefined) {
      s.width = typeof col.width === 'number' ? `${col.width}px` : col.width;
    }
    if (col.minWidth) s.minWidth = `${col.minWidth}px`;
    if (col.align) s.textAlign = col.align;
    return s;
  };

  const stickyClass = (col: GridTableColumn<TRow>) => {
    if (col.sticky === 'left') return 'sticky-left';
    if (col.sticky === 'right') return 'sticky-right';
    return '';
  };

  /* ---------- loading state ---------- */
  const isLoading = !!loadingRows && loadingRows > 0;

  /* ---------- render helpers ---------- */
  const renderHeaderCell = (col: GridTableColumn<TRow>, ci: number) => {
    if (selectable && col.key === '__selection') {
      return (
        <th
          key="__selection"
          className={stickyClass(col)}
          style={colStyle(col)}
          role="columnheader"
          scope="col"
        >
          <input
            type="checkbox"
            checked={!!selectedKeys && selectedKeys.size === rowCount && rowCount > 0}
            onChange={toggleAll}
            aria-label="Select all rows"
          />
        </th>
      );
    }

    const isSortable = col.sortable && !!onSortChange;
    const isSorted = sortKey === col.key;
    const ariaSortValue = isSortable
      ? isSorted
        ? sortDir === 'asc'
          ? 'ascending' as const
          : 'descending' as const
        : 'none' as const
      : undefined;

    return (
      <th
        key={col.key}
        className={[
          isSortable ? 'sortable' : '',
          isSorted ? 'sorted' : '',
          stickyClass(col),
        ]
          .filter(Boolean)
          .join(' ')}
        style={colStyle(col)}
        role="columnheader"
        scope="col"
        aria-sort={ariaSortValue}
        onClick={isSortable ? () => handleSort(col.key) : undefined}
        onKeyDown={
          isSortable
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSort(col.key);
                }
              }
            : undefined
        }
        tabIndex={isSortable ? 0 : undefined}
      >
        {col.header}
        {isSortable && (
          <span className="sort-icon" aria-hidden="true">
            {isSorted ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : '\u25B2'}
          </span>
        )}
      </th>
    );
  };

  const renderDataCell = (
    col: GridTableColumn<TRow>,
    row: TRow,
    rowIndex: number,
    ci: number,
  ) => {
    if (selectable && col.key === '__selection') {
      const key = getRowKey(row, rowIndex);
      const isSelected = selectedKeys?.has(key) ?? false;
      const isFocused =
        focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === ci;
      return (
        <td
          key="__selection"
          className={stickyClass(col)}
          style={colStyle(col)}
          role="gridcell"
          tabIndex={isFocused ? 0 : -1}
          ref={(el) => registerCell(rowIndex, ci, el)}
          onFocus={() => setFocusedCell({ rowIndex, colIndex: ci })}
          onKeyDown={(e) => handleCellKeyDown(e, rowIndex, ci)}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            onClick={(e) => handleCheckboxClick(rowIndex, e)}
            aria-label={`Select row ${rowIndex + 1}`}
            tabIndex={-1}
          />
        </td>
      );
    }

    const value = (row as Record<string, unknown>)[col.key];
    const content = col.render ? col.render(value, row, rowIndex) : (value as ReactNode);
    const isFocused =
      focusedCell?.rowIndex === rowIndex && focusedCell?.colIndex === ci;

    return (
      <td
        key={col.key}
        className={stickyClass(col)}
        style={colStyle(col)}
        role="gridcell"
        tabIndex={isFocused ? 0 : -1}
        ref={(el) => registerCell(rowIndex, ci, el)}
        onFocus={() => setFocusedCell({ rowIndex, colIndex: ci })}
        onKeyDown={(e) => handleCellKeyDown(e, rowIndex, ci)}
      >
        {content}
      </td>
    );
  };

  const renderRow = (row: TRow, rowIndex: number) => {
    const key = getRowKey(row, rowIndex);
    const isSelected = selectable && selectedKeys?.has(key);

    return (
      <tr
        key={key}
        className={[
          onRowClick ? 'interactive' : '',
          isSelected ? 'selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="row"
        aria-rowindex={rowIndex + 2} // 1-based, +1 for header row
        aria-selected={selectable ? !!isSelected : undefined}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
        style={virtualize ? { height: rowHeight } : undefined}
      >
        {effectiveColumns.map((col, ci) => renderDataCell(col, row, rowIndex, ci))}
      </tr>
    );
  };

  const renderSkeletonRow = (i: number) => (
    <tr key={`skeleton-${i}`} role="row" aria-rowindex={i + 2}>
      {effectiveColumns.map((col) => (
        <td key={col.key} role="gridcell" style={colStyle(col)}>
          <div
            className="skeleton-cell"
            style={{
              width: col.width
                ? typeof col.width === 'number'
                  ? `${Math.max(col.width - 24, 40)}px`
                  : '80%'
                : '80%',
            }}
          />
        </td>
      ))}
    </tr>
  );

  /* ---------- visible rows ---------- */
  const visibleSlice = rows.slice(startIdx, endIdx);

  /* ---------- wrapper styles for virtualization ---------- */
  const wrapperStyle: React.CSSProperties = virtualize
    ? { height: `${visibleRows * rowHeight}px` }
    : {};

  return (
    <>
      {/* Selection bar */}
      {selectable && selectedKeys && selectedKeys.size > 0 && (
        <div className="grid-table-selection-bar" aria-live="polite">
          <span>{selectedKeys.size} selected</span>
          <button
            type="button"
            onClick={() => onSelectionChange!(new Set())}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-primary, #114b7a)',
              textDecoration: 'underline',
              fontSize: 'inherit',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={['grid-table-wrapper', className].filter(Boolean).join(' ')}
        style={wrapperStyle}
      >
        <table
          className="grid-table"
          role="grid"
          aria-rowcount={rowCount + 1}
          aria-colcount={colCount}
          aria-label={caption}
        >
          {caption && <caption className="sr-only">{caption}</caption>}

          <colgroup>
            {effectiveColumns.map((col) => (
              <col
                key={col.key}
                style={{
                  width:
                    col.width !== undefined
                      ? typeof col.width === 'number'
                        ? `${col.width}px`
                        : col.width
                      : undefined,
                  minWidth: col.minWidth ? `${col.minWidth}px` : undefined,
                }}
              />
            ))}
          </colgroup>

          <thead className={stickyHeader ? '' : undefined}>
            <tr role="row" aria-rowindex={1}>
              {effectiveColumns.map((col, ci) => renderHeaderCell(col, ci))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: loadingRows! }, (_, i) => renderSkeletonRow(i))
            ) : rowCount === 0 ? (
              <tr>
                <td colSpan={colCount} className="grid-table-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <>
                {virtualize && offsetTop > 0 && (
                  <tr aria-hidden="true" style={{ height: offsetTop }}>
                    <td colSpan={colCount} style={{ padding: 0, border: 'none' }} />
                  </tr>
                )}
                {visibleSlice.map((row, relIdx) => renderRow(row, startIdx + relIdx))}
                {virtualize && offsetBottom > 0 && (
                  <tr aria-hidden="true" style={{ height: offsetBottom }}>
                    <td colSpan={colCount} style={{ padding: 0, border: 'none' }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export { GridTable };
