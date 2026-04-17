import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

export interface DataTableColumn<TItem> {
  key: string;
  render: (item: TItem, index: number) => ReactNode;
  title: ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
  width?: number | string;
}

interface DataTableProps<TItem> {
  caption?: string;
  columns: DataTableColumn<TItem>[];
  emptyState?: ReactNode;
  getRowKey?: (item: TItem, index: number) => string;
  items: TItem[];
  minWidth?: number | string;
  onRowClick?: (item: TItem) => void;
  rowHeight?: number;
  rowClassName?: (item: TItem, index: number) => string | undefined;
  stickyHeader?: boolean;
  toolbar?: ReactNode;
  variant?: 'default' | 'compact';
  virtualize?: boolean;
  visibleRows?: number;
}

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function DataTable<TItem>({
  caption,
  columns,
  emptyState,
  getRowKey,
  items,
  minWidth,
  onRowClick,
  rowHeight = 48,
  rowClassName,
  stickyHeader = true,
  toolbar,
  variant = 'default',
  virtualize = false,
  visibleRows = 12,
}: DataTableProps<TItem>): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (!virtualize) {
      return undefined;
    }

    if (!containerRef.current) {
      return undefined;
    }
    const currentElement = containerRef.current;

    function handleScroll(): void {
      setScrollTop(currentElement.scrollTop);
    }

    currentElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => currentElement.removeEventListener('scroll', handleScroll);
  }, [virtualize]);

  const renderedItems = useMemo(() => {
    if (!virtualize) {
      return items.map((item, index) => ({ index, item }));
    }

    const overscan = 4;
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + visibleRows * rowHeight) / rowHeight) + overscan,
    );

    return items
      .slice(startIndex, endIndex)
      .map((item, offset) => ({ index: startIndex + offset, item }));
  }, [items, rowHeight, scrollTop, visibleRows, virtualize]);

  const topSpacerHeight = virtualize && renderedItems.length > 0
    ? renderedItems[0].index * rowHeight
    : 0;
  const bottomSpacerHeight = virtualize && renderedItems.length > 0
    ? Math.max(0, (items.length - renderedItems[renderedItems.length - 1].index - 1) * rowHeight)
    : 0;

  if (items.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div className={joinClassNames('data-table-shell', `data-table-shell--${variant}`)}>
      {toolbar ? <div className="data-table__toolbar">{toolbar}</div> : null}
      <div
        className={joinClassNames('data-table', `data-table--${variant}`, virtualize && 'data-table--virtualized')}
        ref={containerRef}
        style={virtualize ? { maxHeight: visibleRows * rowHeight + rowHeight, overflowY: 'auto' } : undefined}
      >
        <table style={minWidth ? { minWidth } : undefined}>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className={column.headerClassName}
                  key={column.key}
                  style={{
                    textAlign: column.align ?? 'left',
                    width: column.width,
                    ...(stickyHeader ? {} : { position: 'static' }),
                  }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topSpacerHeight > 0 ? (
              <tr aria-hidden="true" className="data-table__spacer">
                <td colSpan={columns.length} style={{ height: topSpacerHeight, padding: 0 }} />
              </tr>
            ) : null}

            {renderedItems.map(({ item, index }) => (
              <tr
                className={joinClassNames(
                  'data-table__row',
                  onRowClick && 'data-table__row--interactive',
                  rowClassName?.(item, index),
                )}
                data-row-index={index}
                key={getRowKey ? getRowKey(item, index) : String(index)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={onRowClick ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onRowClick(item);
                  }
                } : undefined}
                role={onRowClick ? 'link' : undefined}
                style={virtualize ? { height: rowHeight } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td
                    className={column.className}
                    key={column.key}
                    style={{ textAlign: column.align ?? 'left', width: column.width }}
                  >
                    {column.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}

            {bottomSpacerHeight > 0 ? (
              <tr aria-hidden="true" className="data-table__spacer">
                <td colSpan={columns.length} style={{ height: bottomSpacerHeight, padding: 0 }} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
