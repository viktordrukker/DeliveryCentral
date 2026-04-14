export function FulfilmentProgressBar({
  fulfilled,
  required,
}: {
  fulfilled: number;
  required: number;
}): JSX.Element {
  const pct = required > 0 ? Math.min(100, Math.round((fulfilled / required) * 100)) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: 'var(--color-border)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 100 ? 'var(--color-status-active)' : pct >= 50 ? 'var(--color-accent)' : 'var(--color-status-warning)',
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
        {fulfilled}/{required}
      </span>
    </div>
  );
}
