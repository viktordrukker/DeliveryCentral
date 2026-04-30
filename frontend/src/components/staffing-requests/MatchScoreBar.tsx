interface MatchScoreBarProps {
  score: number;
  width?: number;
  height?: number;
  showLabel?: boolean;
}

function colorFor(score: number): string {
  if (score >= 75) return 'var(--color-status-active)';
  if (score >= 45) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

export function MatchScoreBar({
  score,
  width = 80,
  height = 8,
  showLabel = true,
}: MatchScoreBarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const fill = colorFor(clamped);
  return (
    <div
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Match score ${clamped} of 100`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <div
        style={{
          width,
          height,
          background: 'var(--color-surface-alt)',
          borderRadius: height,
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: '100%',
            background: fill,
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      {showLabel ? (
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', minWidth: 28, textAlign: 'right' }}>
          {clamped}
        </span>
      ) : null}
    </div>
  );
}
