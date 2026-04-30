import { useMemo } from 'react';
import { Button } from '@/components/ds';

const NUM = { fontVariantNumeric: 'tabular-nums' as const };
const PAGE_SIZES = [10, 25, 50, 100] as const;

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizes?: readonly number[];
}

export function PaginationControls({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
  pageSizes = PAGE_SIZES,
}: PaginationControlsProps): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, totalItems);

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return (
    <div className="dash-action-section__summary" style={{ ...NUM }}>
      <span style={{ flex: '1 1 0', textAlign: 'left' }}>
        {totalItems > 0 ? `${start}\u2013${end} of ${totalItems} ${itemLabel}` : `0 ${itemLabel}`}
      </span>

      <span style={{ display: 'inline-flex', gap: 'var(--space-1)', alignItems: 'center' }}>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(1)} type="button" title="First page">
          {'\u21E4'}
        </Button>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button" title="Previous page">
          {'\u2190'}
        </Button>

        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} style={{ padding: '0 2px', fontSize: 11, color: 'var(--color-text-muted)' }}>{'\u2026'}</span>
          ) : (
            <Button
              key={p}
              size="sm"
              variant={p === page ? 'primary' : 'secondary'}
              onClick={() => onPageChange(p)}
              style={{ minWidth: 28, padding: '2px 6px' }}
            >
              {p}
            </Button>
          ),
        )}

        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button" title="Next page">
          {'\u2192'}
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(totalPages)} type="button" title="Last page">
          {'\u21E5'}
        </Button>
      </span>

      <span style={{ flex: '1 1 0', textAlign: 'right' }}>
        <select
          className="field__control"
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          style={{ fontSize: 11, padding: '2px 6px', width: 'auto', display: 'inline', minWidth: 0 }}
        >
          {pageSizes.map((s) => (
            <option key={s} value={s}>{s} / page</option>
          ))}
        </select>
      </span>
    </div>
  );
}
