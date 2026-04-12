import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { CostByRole } from '@/lib/api/project-budget';

interface Props {
  data: CostByRole[];
}

const COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ec4899',
  '#3b82f6',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
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
