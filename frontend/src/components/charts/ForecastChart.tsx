import { Bar, BarChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { ForecastData } from '@/lib/api/project-budget';

interface Props {
  forecast: ForecastData;
  totalBudget: number;
}

export function ForecastChart({ forecast, totalBudget }: Props): JSX.Element {
  const data = [
    { name: 'Projected', value: forecast.projectedTotalCost },
    { name: 'Budget', value: totalBudget },
  ];

  const color = forecast.onTrack ? '#22c55e' : '#ef4444';

  return (
    <div>
      <div style={{ flex: 1, minHeight: 200 }}>

      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} layout="vertical" style={{ cursor: 'pointer' }}>
          <XAxis tick={{ fontSize: 11 }} type="number" />
          <YAxis dataKey="name" tick={{ fontSize: 11 }} type="category" width={70} />
          <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, '']} />
          <Legend />
          <Bar dataKey="value" name="Amount ($)" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? color : '#6366f1'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      {totalBudget > 0 ? (
        <p className={`text-sm font-medium mt-2 ${forecast.onTrack ? 'text-green-600' : 'text-red-600'}`}>
          {forecast.onTrack ? 'On track' : 'Over budget risk'}
          {' — '}Remaining budget: ${forecast.remainingBudget.toFixed(2)}
        </p>
      ) : (
        <p className="text-sm font-medium mt-2 text-gray-500">
          No budget configured — set a budget to track spend against target.
        </p>
      )}
    </div>
  );
}
