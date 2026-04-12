import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  weekStart: string;
  allocationPercent: number;
}

interface WorkloadTrendChartProps {
  data: DataPoint[];
}

export function WorkloadTrendChart({ data }: WorkloadTrendChartProps): JSX.Element {
  const chartData = data.map((d) => ({
    week: d.weekStart.slice(5),
    allocation: d.allocationPercent,
  }));

  return (
    <div style={{ flex: 1, minHeight: 220 }}>

    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} style={{ cursor: 'pointer' }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 150]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip formatter={(v) => `${v}%`} />
        <ReferenceLine label="100%" stroke="#ef4444" strokeDasharray="4 4" y={100} />
        <Line
          dataKey="allocation"
          dot={{ r: 4 }}
          name="Allocation %"
          stroke="#0ea5e9"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
