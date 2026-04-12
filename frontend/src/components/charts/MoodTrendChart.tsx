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
  mood: number | null;
}

interface MoodTrendChartProps {
  data: DataPoint[];
}

export function MoodTrendChart({ data }: MoodTrendChartProps): JSX.Element {
  const chartData = data.map((d) => ({
    week: d.weekStart.slice(5), // MM-DD
    mood: d.mood,
  }));

  return (
    <ResponsiveContainer height={220} width="100%">
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }} style={{ cursor: 'pointer' }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <ReferenceLine label="Alert" stroke="#ef4444" strokeDasharray="4 4" y={2} />
        <ReferenceLine label="Neutral" stroke="#eab308" strokeDasharray="4 4" y={3} />
        <Line
          connectNulls={false}
          dataKey="mood"
          dot={{ r: 4 }}
          name="Mood"
          stroke="#6366f1"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
