import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PlannedVsActualBarsProps {
  data: Array<{ actual: number; person: string; planned: number }>;
}

export function PlannedVsActualBars({ data }: PlannedVsActualBarsProps): JSX.Element {
  return (
    <ResponsiveContainer height={Math.max(200, data.length * 50)} width="100%">
      <BarChart data={data} layout="vertical" style={{ cursor: 'pointer' }}>
        <XAxis type="number" />
        <YAxis dataKey="person" type="category" width={140} />
        <Tooltip formatter={(v) => [`${String(v)}h`, '']} />
        <Legend />
        <Bar dataKey="planned" fill="var(--color-chart-1)" name="Planned Hours" />
        <Bar dataKey="actual" fill="var(--color-chart-2)" name="Actual Hours" />
      </BarChart>
    </ResponsiveContainer>
  );
}
