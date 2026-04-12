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
}

export function DeviationScatter({ data }: DeviationScatterProps): JSX.Element {
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.planned, d.actual)),
    10,
  );

  return (
    <div style={{ flex: 1, minHeight: 300 }}>

    <ResponsiveContainer height="100%" width="100%">
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
            return (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 10px' }}>
                <strong>{d.person}</strong>
                <br />
                Planned: {d.planned}h / Actual: {d.actual}h
              </div>
            );
          }}
        />
        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxVal, y: maxVal }]} stroke="#94a3b8" strokeDasharray="4 4" />
        <Scatter data={data} fill="#6366f1" name="People" />
      </ScatterChart>
    </ResponsiveContainer>
    </div>
  );
}
