import type { RiskMatrixCell } from '@/lib/api/project-risks';

interface RiskHeatMapProps {
  matrixData: RiskMatrixCell[];
  onCellClick?: (probability: number, impact: number) => void;
}

function cellColor(probability: number, impact: number): string {
  const score = probability * impact;
  if (score >= 15) return 'var(--color-status-danger)';
  if (score >= 8) return 'var(--color-status-warning)';
  if (score >= 4) return 'var(--color-status-warning)';
  return 'var(--color-status-neutral)';
}

function cellOpacity(probability: number, impact: number): number {
  const score = probability * impact;
  if (score >= 15) return 0.35;
  if (score >= 8) return 0.25;
  if (score >= 4) return 0.15;
  return 0.08;
}

export function RiskHeatMap({ matrixData, onCellClick }: RiskHeatMapProps): JSX.Element {
  const cellMap = new Map<string, RiskMatrixCell>();
  for (const cell of matrixData) {
    cellMap.set(`${cell.probability}-${cell.impact}`, cell);
  }

  const levels = [5, 4, 3, 2, 1];

  return (
    <div data-testid="risk-heat-map" style={{ display: 'inline-block' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto repeat(5, 48px)', gridTemplateRows: 'repeat(5, 48px) auto', gap: 2, alignItems: 'center' }}>
        {/* Y-axis label */}
        <div style={{
          gridColumn: '1',
          gridRow: '1 / 6',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text)',
          paddingRight: 'var(--space-2)',
        }}>
          Probability
        </div>

        {/* Grid cells: probability descending (5 at top) */}
        {levels.map((prob, rowIdx) =>
          [1, 2, 3, 4, 5].map((imp) => {
            const key = `${prob}-${imp}`;
            const cell = cellMap.get(key);
            const count = cell?.count ?? 0;
            const bg = cellColor(prob, imp);
            const opacity = cellOpacity(prob, imp);

            return (
              <div
                key={key}
                onClick={() => onCellClick?.(prob, imp)}
                title={`P${prob} x I${imp} = ${prob * imp}${count ? ` (${count} risk${count > 1 ? 's' : ''})` : ''}`}
                style={{
                  gridColumn: imp + 1,
                  gridRow: rowIdx + 1,
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  background: bg,
                  opacity: count > 0 ? 1 : opacity,
                  cursor: onCellClick ? 'pointer' : 'default',
                  fontSize: 14,
                  fontWeight: 700,
                  color: count > 0 ? 'var(--color-text)' : 'transparent',
                  fontVariantNumeric: 'tabular-nums',
                  transition: 'opacity 0.15s ease',
                  border: '1px solid var(--color-border)',
                }}
              >
                {count > 0 ? count : ''}
              </div>
            );
          }),
        )}

        {/* Empty corner */}
        <div style={{ gridColumn: 1, gridRow: 6 }} />

        {/* X-axis numbers */}
        {[1, 2, 3, 4, 5].map((imp) => (
          <div
            key={`x-${imp}`}
            style={{
              gridColumn: imp + 1,
              gridRow: 6,
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              paddingTop: 'var(--space-1)',
            }}
          >
            {imp}
          </div>
        ))}
      </div>

      {/* X-axis label */}
      <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--color-text)', marginTop: 'var(--space-2)', paddingLeft: 24 }}>
        Impact
      </div>
    </div>
  );
}
