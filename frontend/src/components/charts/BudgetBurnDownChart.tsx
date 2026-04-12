import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { BurnDownPoint } from '@/lib/api/project-budget';

interface Props {
  data: BurnDownPoint[];
}

export function BudgetBurnDownChart({ data }: Props): JSX.Element {
  if (data.length === 0) {
    return <p className="text-sm text-gray-500">No burn-down data available.</p>;
  }

  return (
    <div style={{ flex: 1, minHeight: 280 }}>

    <ResponsiveContainer height="100%" width="100%">
      <LineChart data={data} style={{ cursor: 'pointer' }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, '']} />
        <Legend />
        <Line
          dataKey="cumCost"
          dot={false}
          name="Actual Cost"
          stroke="#6366f1"
          strokeWidth={2}
          type="monotone"
        />
        <Line
          dataKey="budgetLine"
          dot={false}
          name="Budget Line"
          stroke="#e2e8f0"
          strokeDasharray="4 4"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
    </div>
  );
}
