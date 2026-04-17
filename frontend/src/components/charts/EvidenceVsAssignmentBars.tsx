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

import { SrOnlyTable } from './SrOnlyTable';

interface EvidenceVsAssignmentBarsProps {
  data: Array<{ expected: number; logged: number; project: string; projectId?: string }>;
  height?: number;
}

export function EvidenceVsAssignmentBars({ data, height }: EvidenceVsAssignmentBarsProps): JSX.Element {
  const computedHeight = height ?? Math.max(300, data.length * 50);
  const navigate = useNavigate();

  function handleClick(entry: unknown): void {
    const e = entry as { activePayload?: Array<{ payload: { project: string; projectId?: string } }> } | null;
    const projectId = e?.activePayload?.[0]?.payload?.projectId;
    if (projectId) {
      void navigate(`/projects/${projectId}/dashboard`);
    }
  }

  return (
    <>
      <SrOnlyTable
        caption="Evidence vs Assignment hours per project"
        headers={['Project', 'Expected Hours', 'Logged Hours']}
        rows={data.map((d) => [d.project, d.expected, d.logged])}
      />
      <div style={{ minHeight: computedHeight }}>
        <ResponsiveContainer height={computedHeight} width="100%">
          <BarChart data={data} layout="vertical" onClick={handleClick} style={{ cursor: 'pointer' }}>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="project" type="category" width={140} tick={{ fontSize: 11 }} />
            <Tooltip
              cursor={false}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0]?.payload as { expected: number; logged: number; project: string };
                const delta = d.logged - d.expected;
                return (
                  <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 6,
                    fontSize: 12,
                    padding: '8px 12px',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.project}</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Expected: {d.expected}h</div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Logged: {d.logged}h</div>
                    {delta !== 0 && (
                      <div style={{
                        color: delta > 0 ? 'var(--color-status-warning)' : 'var(--color-status-danger)',
                        fontWeight: 600,
                        marginTop: 4,
                      }}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}h variance
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" iconSize={8} />
            <Bar dataKey="expected" fill="var(--color-status-neutral)" name="Expected Hours" radius={[0, 2, 2, 0]} />
            <Bar dataKey="logged" fill="var(--color-chart-5)" name="Logged Hours" radius={[0, 2, 2, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
