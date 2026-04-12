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

interface WorkloadDistributionChartProps {
  data: Array<Record<string, number | string> & { name: string }>;
}

const ROLE_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
];

function formatLabel(label: string): string {
  return label.replace(/([A-Z])/g, ' $1').trim();
}

export function WorkloadDistributionChart({ data }: WorkloadDistributionChartProps): JSX.Element {
  const navigate = useNavigate();
  const roles = data.length > 0
    ? Object.keys(data[0]).filter((k) => k !== 'name')
    : [];

  function handleClick(entry: unknown): void {
    const e = entry as { activePayload?: Array<{ payload: { name: string } }> } | null;
    const projectName = e?.activePayload?.[0]?.payload?.name;
    if (projectName) {
      void navigate(`/projects?name=${encodeURIComponent(projectName)}`);
    }
  }

  return (
    <>
      <SrOnlyTable
        caption="Workload distribution by role per project"
        headers={['Project', ...roles.map(formatLabel)]}
        rows={data.map((d) => [d.name, ...roles.map((r) => d[r] ?? 0)])}
      />
      <div style={{ flex: 1, minHeight: 300 }}>
      <ResponsiveContainer height="100%" width="100%">
      <BarChart
        data={data}
        layout="vertical"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
      >
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={140} />
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
