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
          background: '#e5e7eb',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#d97706',
            borderRadius: 4,
            transition: 'width 0.3s',
          }}
        />
      </div>
      <span style={{ fontSize: '0.75rem', color: '#374151', whiteSpace: 'nowrap' }}>
        {fulfilled}/{required}
      </span>
    </div>
  );
}
