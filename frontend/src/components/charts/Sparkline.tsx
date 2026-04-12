import { LineChart, Line, ResponsiveContainer } from 'recharts';

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
}: SparklineProps): JSX.Element {
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer height={height} width={width}>
      <LineChart data={chartData}>
        <Line dataKey="v" dot={false} isAnimationActive={false} stroke={color} strokeWidth={2} type="monotone" />
      </LineChart>
    </ResponsiveContainer>
  );
}
