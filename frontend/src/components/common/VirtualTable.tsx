import { ReactNode } from 'react';

import { DataTable, type DataTableColumn } from './DataTable';

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
  const canonicalColumns: DataTableColumn<TItem>[] = columns.map((column) => ({
    ...column,
    render: (item) => column.render(item),
  }));

  return (
    <DataTable
      columns={canonicalColumns}
      getRowKey={getRowKey}
      items={items}
      onRowClick={onRowClick}
      rowHeight={rowHeight}
      virtualize={true}
      visibleRows={visibleRows}
    />
  );
}
