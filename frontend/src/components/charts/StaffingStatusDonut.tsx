import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { SrOnlyTable } from './SrOnlyTable';

interface StaffingStatusDonutProps {
  data: Array<{ color: string; href?: string; name: string; value: number }>;
}

export function StaffingStatusDonut({ data }: StaffingStatusDonutProps): JSX.Element {
  const navigate = useNavigate();

  function handleClick(entry: unknown): void {
    const e = entry as { href?: string } | null;
    if (e?.href) void navigate(e.href);
  }

  return (
    <>
      <SrOnlyTable
        caption="Staffing status distribution"
        headers={['Status', 'Count']}
        rows={data.map((d) => [d.name, d.value])}
      />
      <div style={{ flex: 1, minHeight: 300 }}>
      <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="value"
          innerRadius={60}
          nameKey="name"
          onClick={handleClick}
          outerRadius={100}
          style={{ cursor: 'pointer' }}
        >
          {data.map((entry) => (
            <Cell fill={entry.color} key={entry.name} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
    </div>
    </>
  );
}
