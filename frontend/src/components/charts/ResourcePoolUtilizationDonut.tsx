import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { SrOnlyTable } from './SrOnlyTable';

interface ResourcePoolUtilizationDonutProps {
  allocated: number;
  idle: number;
}

export function ResourcePoolUtilizationDonut({
  allocated,
  idle,
}: ResourcePoolUtilizationDonutProps): JSX.Element {
  const navigate = useNavigate();

  const data = [
    { color: '#6366f1', href: '/assignments?status=active', name: 'Allocated', value: allocated },
    { color: '#94a3b8', href: '/org/people?filter=idle', name: 'Idle', value: idle },
  ];

  function handleClick(entry: unknown): void {
    const e = entry as { href?: string } | null;
    if (e?.href) void navigate(e.href);
  }

  return (
    <>
      <SrOnlyTable
        caption="Resource pool utilization"
        headers={['Status', 'Count']}
        rows={data.map((d) => [d.name, d.value])}
      />
      <div style={{ flex: 1, minHeight: 250 }}>

      <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Pie
          cx="50%"
          cy="50%"
          data={data}
          dataKey="value"
          innerRadius={55}
          nameKey="name"
          onClick={handleClick}
          outerRadius={85}
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
