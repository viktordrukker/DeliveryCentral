import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

export interface CostDistributionEntry {
  projectName: string;
  totalHours: number;
}

interface CostDistributionPieProps {
  data: CostDistributionEntry[];
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
