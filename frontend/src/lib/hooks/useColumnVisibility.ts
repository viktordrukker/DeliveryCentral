import { useCallback, useMemo, useState } from 'react';

/**
 * Manages show/hide state for table columns.
 * Persists column visibility to localStorage keyed by `tableId`.
 * Returns `visibleColumns` (set of visible column keys) and a toggle function.
 *
 * Usage:
 *   const { visibleColumns, toggleColumn, isVisible } = useColumnVisibility('people-table', allColumns);
 */
export function useColumnVisibility(
  tableId: string,
  allColumns: string[],
): {
  isVisible: (col: string) => boolean;
  toggleColumn: (col: string) => void;
  visibleColumns: Set<string>;
} {
  const storageKey = `dc:col-vis:${tableId}`;

  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  const visibleColumns = useMemo(
    () => new Set(allColumns.filter((c) => !hidden.has(c))),
    [allColumns, hidden],
  );

  const toggleColumn = useCallback(
    (col: string): void => {
      setHidden((prev) => {
        const next = new Set(prev);
        if (next.has(col)) {
          next.delete(col);
        } else {
          // Never hide all columns — keep at least one visible
          if (visibleColumns.size <= 1 && !next.has(col)) return prev;
          next.add(col);
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey, visibleColumns.size],
  );

  const isVisible = useCallback((col: string): boolean => !hidden.has(col), [hidden]);

  return { isVisible, toggleColumn, visibleColumns };
}
