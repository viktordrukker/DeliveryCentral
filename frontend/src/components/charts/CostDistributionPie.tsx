import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface CostDistributionEntry {
  projectName: string;
  totalHours: number;
}

interface CostDistributionPieProps {
  data: CostDistributionEntry[];
}

const COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#14b8a6',
  '#8b5cf6',
  '#f97316',
  '#06b6d4',
];

export function CostDistributionPie({ data }: CostDistributionPieProps): JSX.Element {
  const chartData = data.map((d) => ({ name: d.projectName, value: d.totalHours }));

  return (
    <div style={{ flex: 1, minHeight: 240 }}>

    <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="45%"
          style={{ cursor: 'pointer' }}
          data={chartData}
          dataKey="value"
          label={({ name, percent }) =>
            `${String(name).slice(0, 14)}: ${Math.round((percent as number) * 100)}%`
          }
          labelLine={false}
          outerRadius={80}
        >
          {chartData.map((_entry, index) => (
            <Cell fill={COLORS[index % COLORS.length]} key={`cell-${index}`} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => [`${String(value)} hrs`, 'Total Hours']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}
