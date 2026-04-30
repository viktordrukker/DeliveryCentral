import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ds';

interface ColumnDef {
  key: string;
  title: string;
}

interface UseColumnVisibilityResult<T extends ColumnDef> {
  visibleColumns: T[];
  ColumnVisibilityMenu: JSX.Element;
}

/**
 * Manages per-table column visibility with localStorage persistence.
 * @param tableKey - unique key for localStorage (e.g. 'assignments', 'people')
 * @param allColumns - full column definition array
 */
export function useColumnVisibility<T extends ColumnDef>(
  tableKey: string,
  allColumns: T[],
): UseColumnVisibilityResult<T> {
  const storageKey = `dc:col-vis:${tableKey}`;

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return new Set(JSON.parse(raw ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const toggleColumn = useCallback(
    (key: string): void => {
      setHiddenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          // Don't hide last visible column
          if (allColumns.length - prev.size <= 1) return prev;
          next.add(key);
        }
        try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch { /* ignore */ }
        return next;
      });
    },
    [allColumns.length, storageKey],
  );

  const visibleColumns = allColumns.filter((col) => !hiddenKeys.has(col.key));

  const ColumnVisibilityMenu = (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <Button aria-label="Customize columns" variant="secondary" onClick={() => setMenuOpen((v) => !v)} style={{ fontSize: '12px', padding: '4px 10px' }} title="Show/hide columns" type="button">
        Columns ▾
      </Button>
      {menuOpen ? (
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            minWidth: '160px',
            padding: '8px 0',
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 50,
          }}
        >
          {allColumns.map((col) => (
            <label
              key={col.key}
              style={{
                alignItems: 'center',
                cursor: 'pointer',
                display: 'flex',
                gap: '8px',
                padding: '6px 14px',
                fontSize: '13px',
              }}
            >
              <input
                checked={!hiddenKeys.has(col.key)}
                onChange={() => toggleColumn(col.key)}
                type="checkbox"
              />
              {col.title}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );

  return { visibleColumns, ColumnVisibilityMenu };
}
