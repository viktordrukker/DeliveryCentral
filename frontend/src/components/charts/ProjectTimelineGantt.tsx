import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface GanttProject {
  endDate: string | null;
  name: string;
  startDate: string | null;
  status: string;
}

interface ProjectTimelineGanttProps {
  projects: GanttProject[];
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#22c55e',
  CANCELLED: '#94a3b8',
  CLOSED: '#6366f1',
  DRAFT: '#f59e0b',
};

export function ProjectTimelineGantt({ projects }: ProjectTimelineGanttProps): JSX.Element {
  const now = Date.now();

  const data = projects
    .filter((p) => p.startDate)
    .map((p) => {
      const start = new Date(p.startDate!).getTime();
      const end = p.endDate ? new Date(p.endDate).getTime() : now + 90 * 86400 * 1000;
      return {
        duration: Math.max(1, Math.round((end - start) / 86400000)),
        name: p.name,
        status: p.status,
      };
    });

  return (
    <ResponsiveContainer height={Math.max(200, data.length * 40)} width="100%">
      <BarChart data={data} layout="vertical" style={{ cursor: 'pointer' }}>
        <XAxis label={{ offset: -5, position: 'insideBottom', value: 'Days' }} type="number" />
        <YAxis dataKey="name" type="category" width={120} />
        <Tooltip formatter={(v) => [`${String(v)} days`, 'Duration']} />
        <Bar dataKey="duration" name="Duration">
          {data.map((entry) => (
            <Cell
              fill={STATUS_COLORS[entry.status] ?? '#6366f1'}
              key={entry.name}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
