import { useEffect, useRef, useState } from 'react';

interface ColumnVisibilityMenuProps {
  columns: Array<{ key: string; label: string }>;
  isVisible: (col: string) => boolean;
  onToggle: (col: string) => void;
}

export function ColumnVisibilityMenu({
  columns,
  isVisible,
  onToggle,
}: ColumnVisibilityMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        aria-expanded={open}
        aria-label="Customize columns"
        className="button button--secondary"
        onClick={() => setOpen((v) => !v)}
        style={{ fontSize: '12px', padding: '4px 10px' }}
        title="Show/hide columns"
        type="button"
      >
        Columns ⚙
      </button>
      {open ? (
        <div
          role="menu"
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            minWidth: '160px',
            padding: '8px 0',
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 4px)',
            zIndex: 50,
          }}
        >
          {columns.map((col) => (
            <label
              key={col.key}
              role="menuitemcheckbox"
              style={{ alignItems: 'center', cursor: 'pointer', display: 'flex', gap: '8px', padding: '6px 14px' }}
            >
              <input
                checked={isVisible(col.key)}
                onChange={() => onToggle(col.key)}
                style={{ cursor: 'pointer' }}
                type="checkbox"
              />
              <span style={{ fontSize: '13px' }}>{col.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
