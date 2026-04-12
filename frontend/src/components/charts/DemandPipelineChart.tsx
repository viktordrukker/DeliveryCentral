import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { SrOnlyTable } from './SrOnlyTable';

interface DemandPipelineChartProps {
  data: Array<Record<string, number | string> & { week: string }>;
}

const ROLE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatLabel(label: string): string {
  return label.replace(/([A-Z])/g, ' $1').trim();
}

export function DemandPipelineChart({ data }: DemandPipelineChartProps): JSX.Element {
  const navigate = useNavigate();
  const roles = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== 'week') : [];

  function handleClick(entry: unknown): void {
    const e = entry as { activePayload?: Array<{ payload: { week: string } }> } | null;
    const week = e?.activePayload?.[0]?.payload?.week;
    if (week) void navigate(`/assignments?weekStart=${week}`);
  }

  return (
    <>
      <SrOnlyTable
        caption="Demand pipeline: assignments starting per week by role"
        headers={['Week', ...roles.map(formatLabel)]}
        rows={data.map((d) => [d.week, ...roles.map((r) => d[r] ?? 0)])}
      />
      <div style={{ flex: 1, minHeight: 250 }}>

      <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data} onClick={handleClick} style={{ cursor: 'pointer' }}>
        <XAxis dataKey="week" />
        <YAxis />
        <Tooltip formatter={(v, name) => [v, formatLabel(String(name))]} />
        <Legend formatter={(value) => formatLabel(String(value))} />
        {roles.map((role, idx) => (
          <Bar
            dataKey={role}
            fill={ROLE_COLORS[idx % ROLE_COLORS.length]}
            key={role}
            name={formatLabel(role)}
            stackId="a"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
    </div>
    </>
  );
}
