import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DeviationScatterProps {
  data: Array<{ actual: number; person: string; planned: number }>;
  height?: number;
}

export function DeviationScatter({ data, height = 350 }: DeviationScatterProps): JSX.Element {
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.planned, d.actual)),
    10,
  );

  return (
    <div style={{ minHeight: height }}>
      <ResponsiveContainer height={height} width="100%">
        <ScatterChart style={{ cursor: 'pointer' }}>
          <XAxis
            dataKey="planned"
            domain={[0, maxVal]}
            label={{ offset: -5, position: 'insideBottom', value: 'Planned (h)' }}
            name="Planned"
            type="number"
          />
          <YAxis
            dataKey="actual"
            domain={[0, maxVal]}
            label={{ angle: -90, position: 'insideLeft', value: 'Actual (h)' }}
            name="Actual"
            type="number"
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload as { actual: number; person: string; planned: number };
              const delta = d.actual - d.planned;
              const deltaLabel = delta > 0 ? `+${delta.toFixed(1)}h over` : delta < 0 ? `${Math.abs(delta).toFixed(1)}h under` : 'On target';
              return (
                <div style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  fontSize: 12,
                  padding: '8px 12px',
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.person}</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Planned: {d.planned.toFixed(1)}h</div>
                  <div style={{ color: 'var(--color-text-muted)' }}>Actual: {d.actual.toFixed(1)}h</div>
                  <div style={{
                    color: delta > 2 ? 'var(--color-status-danger)' : delta < -2 ? 'var(--color-status-warning)' : 'var(--color-status-active)',
                    fontWeight: 600,
                    marginTop: 4,
                  }}>
                    {deltaLabel}
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine
            segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]}
            stroke="var(--color-border)"
            strokeDasharray="4 4"
          />
          <Scatter data={data} fill="var(--color-chart-1)" name="People" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
