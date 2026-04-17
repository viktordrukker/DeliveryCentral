import { useCallback, useMemo, useState } from 'react';

export interface ColumnPreset {
  name: string;
  hidden: string[];
  order: string[];
}

export function useColumnVisibility(
  tableId: string,
  defaultColumns: string[],
): {
  columnOrder: string[];
  deletePreset: (name: string) => void;
  isVisible: (col: string) => boolean;
  loadPreset: (preset: ColumnPreset) => void;
  moveColumn: (key: string, direction: 'up' | 'down') => void;
  presets: ColumnPreset[];
  reset: () => void;
  savePreset: (name: string) => void;
  toggleColumn: (col: string) => void;
  visibleColumns: Set<string>;
} {
  const visKey = `dc:col-vis:${tableId}`;
  const orderKey = `dc:col-order:${tableId}`;
  const presetsKey = `dc:col-presets:${tableId}`;

  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(visKey);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch { /* ignore */ }
    return new Set<string>();
  });

  const [order, setOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(orderKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        const storedSet = new Set(parsed);
        const merged = [...parsed];
        for (const col of defaultColumns) {
          if (!storedSet.has(col)) merged.push(col);
        }
        return merged;
      }
    } catch { /* ignore */ }
    return defaultColumns;
  });

  const [presets, setPresets] = useState<ColumnPreset[]>(() => {
    try {
      const stored = localStorage.getItem(presetsKey);
      if (stored) return JSON.parse(stored) as ColumnPreset[];
    } catch { /* ignore */ }
    return [];
  });

  const visibleColumns = useMemo(() => new Set(order.filter((c) => !hidden.has(c))), [order, hidden]);
  const columnOrder = useMemo(() => order.filter((c) => defaultColumns.includes(c)), [order, defaultColumns]);

  const persist = useCallback((h: Set<string>, o: string[]) => {
    try {
      localStorage.setItem(visKey, JSON.stringify([...h]));
      localStorage.setItem(orderKey, JSON.stringify(o));
    } catch { /* ignore */ }
  }, [visKey, orderKey]);

  const toggleColumn = useCallback((col: string): void => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(col)) { next.delete(col); } else {
        if (visibleColumns.size <= 1 && !next.has(col)) return prev;
        next.add(col);
      }
      persist(next, order);
      return next;
    });
  }, [visibleColumns.size, persist, order]);

  const moveColumn = useCallback((key: string, direction: 'up' | 'down'): void => {
    setOrder((prev) => {
      const idx = prev.indexOf(key);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      persist(hidden, next);
      return next;
    });
  }, [persist, hidden]);

  const reset = useCallback((): void => {
    const emptyHidden = new Set<string>();
    setHidden(emptyHidden);
    setOrder(defaultColumns);
    persist(emptyHidden, defaultColumns);
  }, [defaultColumns, persist]);

  const savePreset = useCallback((name: string): void => {
    setPresets((prev) => {
      const preset: ColumnPreset = { name, hidden: [...hidden], order: [...order] };
      const next = [...prev.filter((p) => p.name !== name), preset];
      try { localStorage.setItem(presetsKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [hidden, order, presetsKey]);

  const loadPreset = useCallback((preset: ColumnPreset): void => {
    const h = new Set(preset.hidden);
    // Merge preset order with any new columns
    const pSet = new Set(preset.order);
    const merged = [...preset.order];
    for (const col of defaultColumns) {
      if (!pSet.has(col)) merged.push(col);
    }
    setHidden(h);
    setOrder(merged);
    persist(h, merged);
  }, [defaultColumns, persist]);

  const deletePreset = useCallback((name: string): void => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.name !== name);
      try { localStorage.setItem(presetsKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [presetsKey]);

  const isVisible = useCallback((col: string): boolean => !hidden.has(col), [hidden]);

  return { columnOrder, deletePreset, isVisible, loadPreset, moveColumn, presets, reset, savePreset, toggleColumn, visibleColumns };
}
