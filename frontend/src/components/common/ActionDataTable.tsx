import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

export interface ActionColumn<T> {
  align?: 'left' | 'center' | 'right';
  key: string;
  render: (item: T, index: number) => ReactNode;
  title: ReactNode;
  width?: number | string;
}

export interface QuickAction<T> {
  hidden?: (item: T) => boolean;
  label: string;
  onClick: (item: T) => void;
  tone?: 'primary' | 'danger' | 'secondary';
}

export interface BatchAction<T> {
  label: string;
  onClick: (items: T[]) => void;
  tone?: 'primary' | 'danger' | 'secondary';
}

export interface QuickFilter {
  active: boolean;
  count?: number;
  label: string;
  onClick: () => void;
}

interface ActionDataTableProps<T> {
  batchActions?: BatchAction<T>[];
  columns: ActionColumn<T>[];
  emptyState?: ReactNode;
  getRowKey: (item: T, index: number) => string;
  items: T[];
  onRowClick?: (item: T) => void;
  pageSize?: number;
  quickActions?: QuickAction<T>[];
  quickFilters?: QuickFilter[];
  rowHeight?: number;
  title: string;
  titleExtra?: ReactNode;
  totalLabel?: string;
}

const PAGE_SIZES = [10, 25, 50, 100] as const;
const NUM = { fontVariantNumeric: 'tabular-nums' as const };
const ROW_HEIGHT = 36;

/* ── Extracted style constants (20d-01) ── */
const S_WRAPPER: React.CSSProperties = { position: 'relative', minHeight: 'auto', padding: 0, overflow: 'hidden' };
const S_HEADER: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)',
  padding: 'var(--space-2) var(--space-3)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-alt)',
};
const S_HEADER_LEFT: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' };
const S_HEADER_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--color-text)' };
const S_HEADER_SELECTED: React.CSSProperties = { fontSize: 11, color: 'var(--color-accent)', fontWeight: 600 };
const S_HEADER_RIGHT: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexWrap: 'wrap' };
const S_EMPTY_WRAP: React.CSSProperties = { padding: 'var(--space-4)' };
const S_TABLE: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12, tableLayout: 'fixed' };
const S_THEAD_ROW: React.CSSProperties = { background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' };
const S_TH_BASE: React.CSSProperties = { padding: '4px 8px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const S_TH_CHECK: React.CSSProperties = { width: 32, textAlign: 'center', padding: '4px 8px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' };
const S_TD_BASE: React.CSSProperties = { padding: '0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text)', lineHeight: 1.3 };
const S_TD_CHECK: React.CSSProperties = { textAlign: 'center', padding: '0 8px' };
const S_TD_ACTIONS: React.CSSProperties = { padding: '0 8px' };
const S_QA_WRAP: React.CSSProperties = { display: 'flex', gap: 4 };
const S_QA_BTN: React.CSSProperties = { fontSize: 10, padding: '2px 8px' };
const S_FOOTER: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 'var(--space-2) var(--space-3)', borderTop: '1px solid var(--color-border)',
  background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', fontSize: 11, fontWeight: 600,
};
const S_FOOTER_LEFT: React.CSSProperties = { flex: '1 1 0', textAlign: 'left', ...NUM };
const S_FOOTER_CENTER: React.CSSProperties = { display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center', ...NUM };
const S_FOOTER_PAGE: React.CSSProperties = { minWidth: 80, textAlign: 'center' };
const S_FOOTER_RIGHT: React.CSSProperties = { flex: '1 1 0', textAlign: 'right' };
const S_FOOTER_SELECT: React.CSSProperties = { fontSize: 11, padding: '2px 6px', width: 'auto', display: 'inline', minWidth: 0 };

export function ActionDataTable<T>({
  batchActions,
  columns,
  emptyState,
  getRowKey,
  items,
  onRowClick,
  pageSize: defaultPageSize = 10,
  quickActions,
  quickFilters,
  rowHeight = ROW_HEIGHT,
  title,
  titleExtra,
  totalLabel = 'items',
}: ActionDataTableProps<T>): JSX.Element {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const totalPages = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const startIdx = (page - 1) * rowsPerPage;
  const pagedItems = items.slice(startIdx, startIdx + rowsPerPage);

  useEffect(() => { setPage(1); }, [items.length, rowsPerPage]);
  useEffect(() => { setSelected(new Set()); }, [items]);

  const allPageKeys = new Set(pagedItems.map((item, i) => getRowKey(item, startIdx + i)));
  const allSelected = allPageKeys.size > 0 && [...allPageKeys].every((k) => selected.has(k));
  const someSelected = selected.size > 0;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); allPageKeys.forEach((k) => next.delete(k)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); allPageKeys.forEach((k) => next.add(k)); return next; });
    }
  }, [allSelected, allPageKeys]);

  const toggleRow = useCallback((key: string) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }, []);

  const selectedItems = useMemo(() => {
    if (selected.size === 0) return [];
    return items.filter((item, i) => selected.has(getRowKey(item, i)));
  }, [items, selected, getRowKey]);

  const hasBatch = batchActions && batchActions.length > 0;
  const hasQuickActions = quickActions && quickActions.length > 0;

  // Empty rows to fill fixed page height
  const emptyRowCount = Math.max(0, rowsPerPage - pagedItems.length);

  return (
    <div className="dashboard-hero" data-testid="action-data-table" style={S_WRAPPER}>
      {/* ── Header: title + batch buttons (inline) + filters ── */}
      <div style={S_HEADER}>
        <div style={S_HEADER_LEFT}>
          <span style={S_HEADER_TITLE}>{title}</span>
          {titleExtra}
          {/* Batch actions appear inline next to title when rows are selected */}
          {someSelected && hasBatch && (
            <>
              <span style={S_HEADER_SELECTED}>{selected.size} selected</span>
              {batchActions.map((ba, i) => (
                <button key={i} type="button"
                  className={`button button--sm button--${ba.tone ?? 'secondary'}`}
                  onClick={() => ba.onClick(selectedItems)}
                >
                  {ba.label}
                </button>
              ))}
              <button type="button" className="button button--sm button--secondary" onClick={() => setSelected(new Set())}>
                Clear
              </button>
            </>
          )}
        </div>
        <div style={S_HEADER_RIGHT}>
          {quickFilters?.map((f, i) => (
            <button key={i} type="button"
              className={`button button--sm ${f.active ? 'button--primary' : 'button--secondary'}`}
              onClick={f.onClick}
            >
              {f.label}{f.count !== undefined ? ` (${f.count})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table: fixed row count, no scroll ── */}
      {items.length === 0 ? (
        <div style={S_EMPTY_WRAP}>{emptyState}</div>
      ) : (
        <table style={S_TABLE}>
          <thead>
            <tr style={S_THEAD_ROW}>
              {hasBatch && (
                <th style={S_TH_CHECK}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} style={{ ...S_TH_BASE, textAlign: col.align ?? 'left', width: col.width }}>
                  {col.title}
                </th>
              ))}
              {hasQuickActions && (
                <th style={{ ...S_TH_BASE, width: quickActions.reduce((w, qa) => w + 60, 8) }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {pagedItems.map((item, pageIdx) => {
              const globalIdx = startIdx + pageIdx;
              const key = getRowKey(item, globalIdx);
              const isSelected = selected.has(key);
              return (
                <tr
                  key={key}
                  style={{
                    height: rowHeight, cursor: onRowClick ? 'pointer' : undefined,
                    background: isSelected ? 'var(--color-accent-soft)' : undefined,
                    borderBottom: '1px solid var(--color-border)',
                  }}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                >
                  {hasBatch && (
                    <td style={S_TD_CHECK} onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleRow(key)} aria-label="Select row" />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} style={{ ...S_TD_BASE, textAlign: col.align ?? 'left' }}>
                      {col.render(item, globalIdx)}
                    </td>
                  ))}
                  {hasQuickActions && (
                    <td style={S_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                      <div style={S_QA_WRAP}>
                        {quickActions.filter((qa) => !qa.hidden?.(item)).map((qa, i) => (
                          <button key={i} type="button"
                            className={`button button--sm button--${qa.tone ?? 'secondary'}`}
                            onClick={() => qa.onClick(item)}
                            style={S_QA_BTN}
                          >
                            {qa.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {/* Empty placeholder rows to maintain fixed height */}
            {Array.from({ length: emptyRowCount }, (_, i) => (
              <tr key={`empty-p${page}-${i}`} style={{ height: rowHeight, borderBottom: '1px solid var(--color-border)' }}>
                {hasBatch && <td />}
                {columns.map((col) => <td key={col.key} />)}
                {hasQuickActions && <td />}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ── Footer: pagination ── */}
      <div style={S_FOOTER}>
        <span style={S_FOOTER_LEFT}>
          {items.length > 0
            ? `Showing ${(page - 1) * rowsPerPage + 1}\u2013${Math.min(page * rowsPerPage, items.length)} of ${items.length} ${totalLabel}`
            : `0 ${totalLabel}`}
        </span>
        <span style={S_FOOTER_CENTER}>
          <button className="button button--secondary button--sm" disabled={page <= 1} onClick={(e) => { e.stopPropagation(); setPage((p) => p - 1); }} type="button">{'\u2190'}</button>
          <span style={S_FOOTER_PAGE}>Page {page} of {totalPages}</span>
          <button className="button button--secondary button--sm" disabled={page >= totalPages} onClick={(e) => { e.stopPropagation(); setPage((p) => p + 1); }} type="button">{'\u2192'}</button>
        </span>
        <span style={S_FOOTER_RIGHT}>
          <select className="field__control" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}
            style={S_FOOTER_SELECT}>
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </span>
      </div>
    </div>
  );
}
