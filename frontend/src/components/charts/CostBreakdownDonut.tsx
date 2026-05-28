import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { CostByRole } from '@/lib/api/project-budget';

interface Props {
  data: CostByRole[];
}

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-chart-8)',
];

export function CostBreakdownDonut({ data }: Props): JSX.Element {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No cost breakdown data available.</p>;
  }

  const chartData = data.map((d) => ({ name: d.role, value: d.cost }));

  return (
    <div style={{ flex: 1, minHeight: 260 }}>

    <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="50%"
          data={chartData}
          dataKey="value"
          innerRadius={60}
          outerRadius={100}
          style={{ cursor: 'pointer' }}
        >
          {chartData.map((_entry, index) => (
            <Cell fill={COLORS[index % COLORS.length]} key={`cell-${index}`} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Cost']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}
