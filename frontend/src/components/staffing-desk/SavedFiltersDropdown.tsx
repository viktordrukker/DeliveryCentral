import { useCallback, useMemo, useState } from 'react';

import { useOutsideClick } from '@/hooks/useOutsideClick';
import { Button, IconButton } from '@/components/ds';

interface SavedFilter {
  name: string;
  filters: Record<string, string>;
  createdAt: string;
}

const DEFAULT_STORAGE_KEY = 'staffing-desk-saved-filters';

function loadSaved(key: string): SavedFilter[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToDisk(key: string, filters: SavedFilter[]): void {
  localStorage.setItem(key, JSON.stringify(filters));
}

interface Props {
  currentFilters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
  storageKey?: string;
}

export function SavedFiltersDropdown({ currentFilters, onApply, storageKey }: Props): JSX.Element {
  const key = storageKey ?? DEFAULT_STORAGE_KEY;
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(() => loadSaved(key));
  const [newName, setNewName] = useState('');

  const handleSave = useCallback(() => {
    const name = newName.trim();
    if (!name) return;
    const updated = [...saved.filter((f) => f.name !== name), { name, filters: { ...currentFilters }, createdAt: new Date().toISOString() }];
    setSaved(updated);
    saveToDisk(key, updated);
    setNewName('');
  }, [newName, currentFilters, saved]);

  const handleDelete = useCallback((name: string) => {
    const updated = saved.filter((f) => f.name !== name);
    setSaved(updated);
    saveToDisk(key, updated);
  }, [saved]);

  const handleApply = useCallback((f: SavedFilter) => {
    onApply(f.filters);
    setOpen(false);
  }, [onApply]);

  const closeMenu = useCallback(() => setOpen(false), []);
  const wrapRef = useOutsideClick<HTMLDivElement>(open, closeMenu);

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <Button variant="secondary" size="sm" onClick={() => setOpen((v) => !v)} type="button" style={{ fontSize: 10 }}>
        Saved Filters ({saved.length})
      </Button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          width: 280, background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 8, boxShadow: 'var(--shadow-dropdown)', zIndex: 50, padding: 'var(--space-2)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 'var(--space-1)', color: 'var(--color-text-muted)' }}>
            Saved Filters
          </div>

          {saved.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--color-text-subtle)', padding: 'var(--space-2) 0' }}>
              No saved filters yet.
            </div>
          )}

          {saved.map((f) => (
            <div key={f.name} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
              padding: '4px 6px', borderRadius: 4, cursor: 'pointer',
              fontSize: 11,
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-alt)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                onClick={() => handleApply(f)}
              >
                {f.name}
              </span>
              <IconButton
                aria-label={`Delete ${f.name}`}
                size="sm"
                onClick={() => handleDelete(f.name)}
                style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}
                title="Delete"
              >
                ×
              </IconButton>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--space-1)', paddingTop: 'var(--space-1)', display: 'flex', gap: 'var(--space-1)' }}>
            <input
              className="field__control"
              style={{ flex: 1, fontSize: 10, padding: '3px 6px' }}
              placeholder="Filter name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
            <Button variant="primary" size="sm" onClick={handleSave} type="button" style={{ fontSize: 10, padding: '3px 8px' }}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
