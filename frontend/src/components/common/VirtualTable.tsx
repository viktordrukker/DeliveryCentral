import { ReactNode, useRef, useState, useEffect } from 'react';

interface VirtualTableProps<TItem> {
  columns: Array<{ key: string; render: (item: TItem) => ReactNode; title: string }>;
  getRowKey: (item: TItem, index: number) => string;
  items: TItem[];
  onRowClick?: (item: TItem) => void;
  rowHeight?: number;
  visibleRows?: number;
}

/**
 * Windowed table that renders only the visible rows + overscan.
 * Does not require any external package — uses scroll event + state.
 * Performance on 100–500 rows is significantly better than a full DOM table.
 */
export function VirtualTable<TItem>({
  columns,
  getRowKey,
  items,
  onRowClick,
  rowHeight = 48,
  visibleRows = 20,
}: VirtualTableProps<TItem>): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const overscan = 5;
  const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIdx = Math.min(items.length, Math.ceil((scrollTop + visibleRows * rowHeight) / rowHeight) + overscan);
  const visibleItems = items.slice(startIdx, endIdx);
  const totalHeight = items.length * rowHeight;
  const offsetTop = startIdx * rowHeight;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll(): void {
      setScrollTop(el!.scrollTop);
    }
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: `${visibleRows * rowHeight}px`, overflow: 'auto', position: 'relative' }}
    >
      <div className="data-table">
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Spacer row above visible items */}
            {offsetTop > 0 ? (
              <tr aria-hidden="true" style={{ height: offsetTop }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}
            {visibleItems.map((item, relIdx) => (
              <tr
                className={onRowClick ? 'data-table__row data-table__row--interactive' : 'data-table__row'}
                key={getRowKey(item, startIdx + relIdx)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                style={{ height: rowHeight }}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render(item)}</td>
                ))}
              </tr>
            ))}
            {/* Spacer row below visible items */}
            {totalHeight - offsetTop - visibleItems.length * rowHeight > 0 ? (
              <tr aria-hidden="true" style={{ height: totalHeight - offsetTop - visibleItems.length * rowHeight }}>
                <td colSpan={columns.length} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
