import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AssignmentItem {
  allocationPercent: number;
  projectName: string;
  validFrom: string;
  validTo: string | null;
}

interface WeeklyAllocationAreaProps {
  assignments: AssignmentItem[];
  weeks: string[];
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function formatLabel(label: string): string {
  return label.replace(/([A-Z])/g, ' $1').trim();
}

export function WeeklyAllocationArea({ assignments, weeks }: WeeklyAllocationAreaProps): JSX.Element {
  const projects = [...new Set(assignments.map((a) => a.projectName))];

  const data = weeks.map((week) => {
    const weekDate = new Date(week);
    const row: Record<string, number | string> = { week };
    for (const project of projects) {
      const pAssignments = assignments.filter(
        (a) =>
          a.projectName === project &&
          new Date(a.validFrom) <= weekDate &&
          (a.validTo === null || new Date(a.validTo) >= weekDate),
      );
      row[project] = pAssignments.reduce((sum, a) => sum + a.allocationPercent, 0);
    }
    return row;
  });

  return (
    <div style={{ flex: 1, minHeight: 250 }}>

    <ResponsiveContainer height="100%" width="100%">
      <AreaChart data={data} style={{ cursor: 'pointer' }}>
        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} />
        <Tooltip formatter={(v, name) => [`${String(v)}%`, formatLabel(String(name))]} />
        <Legend formatter={(value) => formatLabel(String(value))} />
        {projects.map((project, idx) => (
          <Area
            dataKey={project}
            fill={COLORS[idx % COLORS.length]}
            fillOpacity={0.6}
            key={project}
            stackId="a"
            stroke="#ffffff"
            strokeWidth={1}
            type="monotone"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
    </div>
  );
}
