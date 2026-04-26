import { LineChart, Line } from 'recharts';

interface SparklineProps {
  color?: string;
  data: number[];
  height?: number;
  width?: number;
}

export function Sparkline({
  color = '#6366f1',
  data,
  height = 32,
  width = 80,
}: SparklineProps): JSX.Element | null {
  // Recharts logs width(-1)/height(-1) warnings when ResponsiveContainer measures
  // before layout settles. Sparkline receives explicit pixel dimensions — render
  // the chart directly, no measurement needed. Also skip render on empty data.
  if (data.length === 0) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <LineChart data={chartData} height={height} width={width}>
      <Line dataKey="v" dot={false} isAnimationActive={false} stroke={color} strokeWidth={2} type="monotone" />
    </LineChart>
  );
}
