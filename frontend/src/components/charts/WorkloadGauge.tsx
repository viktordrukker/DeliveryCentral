import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from 'recharts';

interface WorkloadGaugeProps {
  allocationPercent: number;
}

function getColor(pct: number): string {
  if (pct > 100) return '#ef4444';
  if (pct >= 80) return '#f59e0b';
  return '#22c55e';
}

export function WorkloadGauge({ allocationPercent }: WorkloadGaugeProps): JSX.Element {
  const clamped = Math.min(allocationPercent, 150);
  const color = getColor(allocationPercent);
  const data = [{ fill: color, name: 'Allocation', value: (clamped / 150) * 100 }];

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer height={200} width="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            data={data}
            endAngle={-270}
            innerRadius="60%"
            outerRadius="80%"
            startAngle={90}
          >
            <RadialBar background dataKey="value" />
            <Tooltip formatter={(v) => [`${Math.round((Number(v) / 100) * 150)}%`, 'Allocation']} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div
          aria-hidden="true"
          style={{
            bottom: 0,
            color,
            display: 'flex',
            flexDirection: 'column',
            fontSize: '2rem',
            fontWeight: 700,
            justifyContent: 'center',
            left: 0,
            lineHeight: 1,
            pointerEvents: 'none',
            position: 'absolute',
            right: 0,
            top: 0,
          }}
        >
          {allocationPercent}%
        </div>
      </div>
      <p style={{ color, fontWeight: 600, margin: '4px 0 0' }}>
        Allocation: {allocationPercent}%
      </p>
    </div>
  );
}
