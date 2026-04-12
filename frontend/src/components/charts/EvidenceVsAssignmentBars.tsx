import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { ChartPatternDefs } from './ChartPatterns';
import { SrOnlyTable } from './SrOnlyTable';

interface EvidenceVsAssignmentBarsProps {
  data: Array<{ expected: number; logged: number; project: string; projectId?: string }>;
}

export function EvidenceVsAssignmentBars({ data }: EvidenceVsAssignmentBarsProps): JSX.Element {
  const navigate = useNavigate();

  function handleClick(entry: unknown): void {
    const e = entry as { activePayload?: Array<{ payload: { project: string; projectId?: string } }> } | null;
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.projectId) {
      void navigate(`/work-evidence?projectId=${payload.projectId}`);
    }
  }

  return (
    <>
      <SrOnlyTable
        caption="Evidence vs Assignment hours per project"
        headers={['Project', 'Expected Hours', 'Logged Hours']}
        rows={data.map((d) => [d.project, d.expected, d.logged])}
      />
      <div style={{ flex: 1, minHeight: 300 }}>
      <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data} layout="vertical" onClick={handleClick} style={{ cursor: 'pointer' }}>
        <ChartPatternDefs />
        <XAxis type="number" />
        <YAxis dataKey="project" type="category" width={140} />
        <Tooltip formatter={(v) => [`${String(v)}h`, '']} />
        <Legend />
        <Bar dataKey="expected" fill="url(#pattern-stripe)" name="Expected Hours" stroke="#64748b" strokeWidth={1} />
        <Bar dataKey="logged" fill="url(#pattern-stripe-indigo)" name="Logged Hours" stroke="#6366f1" strokeWidth={1} />
      </BarChart>
    </ResponsiveContainer>
    </div>
    </>
  );
}
