import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface DataPoint {
  weekStart: string;
  hours: number;
}

interface HoursLoggedChartProps {
  data: DataPoint[];
}

export function HoursLoggedChart({ data }: HoursLoggedChartProps): JSX.Element {
  const chartData = data.map((d) => ({
    week: d.weekStart.slice(5),
    hours: d.hours,
  }));

  return (
    <div style={{ flex: 1, minHeight: 220 }}>

    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} style={{ cursor: 'pointer' }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}h`} />
        <Tooltip formatter={(v) => `${v}h`} />
        <Bar dataKey="hours" fill="#8b5cf6" name="Hours" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
