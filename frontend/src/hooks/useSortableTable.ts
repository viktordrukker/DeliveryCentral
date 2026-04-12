import { useState } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface SortState<K extends string> {
  column: K | null;
  direction: SortDirection;
}

interface UseSortableTableResult<T, K extends string> {
  sortedData: T[];
  sortState: SortState<K>;
  handleSort: (column: K) => void;
  getSortIndicator: (column: K) => string;
  getThProps: (column: K) => {
    className: string;
    onClick: () => void;
    'aria-sort': 'ascending' | 'descending' | 'none';
  };
}

export function useSortableTable<T, K extends string>(
  data: T[],
  getKey: (item: T, column: K) => unknown,
): UseSortableTableResult<T, K> {
  const [sortState, setSortState] = useState<SortState<K>>({ column: null, direction: null });

  function handleSort(column: K): void {
    setSortState((prev) => {
      if (prev.column !== column) return { column, direction: 'asc' };
      if (prev.direction === 'asc') return { column, direction: 'desc' };
      return { column: null, direction: null };
    });
  }

  const sortedData =
    sortState.column && sortState.direction
      ? [...data].sort((a, b) => {
          const va = getKey(a, sortState.column!);
          const vb = getKey(b, sortState.column!);
          let cmp = 0;
          if (typeof va === 'number' && typeof vb === 'number') {
            cmp = va - vb;
          } else {
            cmp = String(va ?? '').localeCompare(String(vb ?? ''));
          }
          return sortState.direction === 'desc' ? -cmp : cmp;
        })
      : data;

  function getSortIndicator(column: K): string {
    if (sortState.column !== column) return '↕';
    if (sortState.direction === 'asc') return '↑';
    if (sortState.direction === 'desc') return '↓';
    return '↕';
  }

  function getThProps(column: K) {
    const isSorted = sortState.column === column;
    return {
      'aria-sort': (
        isSorted && sortState.direction === 'asc'
          ? 'ascending'
          : isSorted && sortState.direction === 'desc'
            ? 'descending'
            : 'none'
      ) as 'ascending' | 'descending' | 'none',
      className: `sortable${isSorted ? ' sorted' : ''}`,
      onClick: () => handleSort(column),
    };
  }

  return { getSortIndicator, getThProps, handleSort, sortState, sortedData };
}
