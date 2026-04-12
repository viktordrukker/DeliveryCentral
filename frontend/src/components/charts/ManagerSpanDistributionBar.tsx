import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ManagerSpanDistributionBarProps {
  data: Array<{ managerName: string; reportCount: number }>;
}

export function ManagerSpanDistributionBar({ data }: ManagerSpanDistributionBarProps): JSX.Element {
  return (
    <ResponsiveContainer height={Math.max(200, data.length * 36)} width="100%">
      <BarChart data={data} layout="vertical" style={{ cursor: 'pointer' }}>
        <XAxis allowDecimals={false} type="number" />
        <YAxis dataKey="managerName" type="category" width={130} />
        <Tooltip formatter={(v) => [`${String(v)} reports`, 'Direct Reports']} />
        <Bar dataKey="reportCount" fill="#6366f1" name="Direct Reports" />
      </BarChart>
    </ResponsiveContainer>
  );
}
