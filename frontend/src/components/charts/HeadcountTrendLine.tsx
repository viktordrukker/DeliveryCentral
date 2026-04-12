import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface HeadcountTrendLineProps {
  data: Array<{ count: number; month: string }>;
}

export function HeadcountTrendLine({ data }: HeadcountTrendLineProps): JSX.Element {
  return (
    <div style={{ width: '100%', height: 250 }}>

    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={data} style={{ cursor: 'pointer' }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Line
          dataKey="count"
          dot={{ r: 3 }}
          name="Active Employees"
          stroke="#6366f1"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
