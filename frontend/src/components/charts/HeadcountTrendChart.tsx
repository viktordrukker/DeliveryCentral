import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { SrOnlyTable } from './SrOnlyTable';

interface HeadcountTrendChartProps {
  data: Array<{ count: number; week: string }>;
}

export function HeadcountTrendChart({ data }: HeadcountTrendChartProps): JSX.Element {
  return (
    <>
      <SrOnlyTable
        caption="Headcount trend over time"
        headers={['Week', 'Active Assignments']}
        rows={data.map((d) => [d.week, d.count])}
      />
      <div style={{ minHeight: 250, width: '100%' }}>
      <ResponsiveContainer height="100%" width="100%">
      <AreaChart data={data} style={{ cursor: 'pointer' }}>
        <defs>
          <linearGradient id="headcountGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Area
          dataKey="count"
          fill="url(#headcountGradient)"
          name="Active Assignments"
          stroke="#6366f1"
          strokeWidth={2}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
    </div>
    </>
  );
}
