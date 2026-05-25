import { LineChart, Line } from 'recharts';

interface SparklineProps {
  color?: string;
  data: number[];
  height?: number;
  width?: number;
}

/**
 * @deprecated V2-D.3 (2026-05-25) — recharts-based legacy.
 * Use `SparklineDs` from `@/components/ds` instead — pure inline-SVG, no
 * recharts dependency, matches the DS canvas visual contract.
 *
 * Migration: `<Sparkline data={…} color={…} />` → `<SparklineDs data={…} stroke={…} />`.
 * `color` prop maps to `stroke`; accepts CSS tokens (`var(--color-chart-1)`).
 *
 * The component still renders so existing callsites stay green. The
 * MASTER_TRACKER V2-B.4 row tracks the per-site migration (6 remaining:
 * `RmKpiStrip`, `WorkloadCard`, `DirectorKpiStrip`, `DashboardPage`,
 * `DirectorDashboardPage`, `PulseTrendCard`). When the sweep finishes,
 * delete this file.
 */
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
