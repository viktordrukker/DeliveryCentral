interface ViewToggleProps {
  view: 'chart' | 'table';
  onChange: (view: 'chart' | 'table') => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps): JSX.Element {
  return (
    <div style={{ display: 'inline-flex', gap: 0, borderRadius: 'var(--radius-control, 4px)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => onChange('chart')}
        style={{
          padding: '2px 10px',
          fontSize: 11,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          background: view === 'chart' ? 'var(--color-accent)' : 'var(--color-surface)',
          color: view === 'chart' ? 'var(--color-surface)' : 'var(--color-text-muted)',
        }}
      >
        Chart
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        style={{
          padding: '2px 10px',
          fontSize: 11,
          fontWeight: 600,
          border: 'none',
          borderLeft: '1px solid var(--color-border)',
          cursor: 'pointer',
          background: view === 'table' ? 'var(--color-accent)' : 'var(--color-surface)',
          color: view === 'table' ? 'var(--color-surface)' : 'var(--color-text-muted)',
        }}
      >
        Table
      </button>
    </div>
  );
}
