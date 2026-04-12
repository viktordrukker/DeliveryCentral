import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface EvidenceTimelineBarProps {
  data: Array<{ date: string; hours: number }>;
}

export function EvidenceTimelineBar({ data }: EvidenceTimelineBarProps): JSX.Element {
  return (
    <div style={{ flex: 1, minHeight: 200, height: 200 }}>

    <ResponsiveContainer height={200} width="100%">
      <BarChart data={data} style={{ cursor: 'pointer' }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip formatter={(v) => [`${String(v)}h`, 'Hours']} />
        <Bar dataKey="hours" fill="#6366f1" name="Hours" />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
