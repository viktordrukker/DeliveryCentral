import { ReactNode } from 'react';

interface DataTableColumn<TItem> {
  key: string;
  render: (item: TItem) => ReactNode;
  title: string;
}

interface DataTableProps<TItem> {
  columns: DataTableColumn<TItem>[];
  emptyState?: ReactNode;
  getRowKey?: (item: TItem, index: number) => string;
  items: TItem[];
  onRowClick?: (item: TItem) => void;
}

export function DataTable<TItem>({
  columns,
  emptyState,
  getRowKey,
  items,
  onRowClick,
}: DataTableProps<TItem>): JSX.Element {
  if (items.length === 0) {
    return <>{emptyState ?? null}</>;
  }

  return (
    <div className="data-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              className={onRowClick ? 'data-table__row data-table__row--interactive' : 'data-table__row'}
              key={getRowKey ? getRowKey(item, index) : String(index)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(item); } } : undefined}
              role={onRowClick ? 'link' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((column) => (
                <td key={column.key}>{column.render(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
