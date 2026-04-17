import type { RagSnapshotDto } from '@/lib/api/project-rag';

interface RagTrendTimelineProps {
  snapshots: RagSnapshotDto[];
}

const RAG_COLORS: Record<string, string> = {
  GREEN: 'var(--color-status-active)',
  AMBER: 'var(--color-status-warning)',
  RED: 'var(--color-status-danger)',
};

const DIMENSIONS = ['staffingRag', 'scheduleRag', 'budgetRag', 'overallRag'] as const;
const DIMENSION_LABELS: Record<string, string> = {
  staffingRag: 'Staffing',
  scheduleRag: 'Schedule',
  budgetRag: 'Budget',
  overallRag: 'Overall',
};

export function RagTrendTimeline({ snapshots }: RagTrendTimelineProps): JSX.Element {
  if (snapshots.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No status history recorded yet.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="dash-compact-table" style={{ fontSize: 11 }}>
        <caption className="sr-only">RAG status trend over time</caption>
        <thead>
          <tr>
            <th scope="col" style={{ width: 70 }}>Dimension</th>
            {snapshots.map((s) => (
              <th key={s.weekStarting} scope="col" style={{ textAlign: 'center', width: 30, fontSize: 10 }}>
                {s.weekStarting.slice(5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((dim) => (
            <tr key={dim}>
              <td style={{ fontWeight: 500 }}>{DIMENSION_LABELS[dim]}</td>
              {snapshots.map((s) => {
                const value = s[dim] as string | null;
                return (
                  <td key={s.weekStarting} style={{ textAlign: 'center', padding: '4px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        background: value ? RAG_COLORS[value] ?? 'var(--color-border)' : 'var(--color-border)',
                      }}
                      title={`${DIMENSION_LABELS[dim]}: ${value ?? 'N/A'}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {snapshots.length > 0 && snapshots[snapshots.length - 1].narrative ? (
        <div style={{ marginTop: 'var(--space-2)', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Latest: {snapshots[snapshots.length - 1].narrative}
        </div>
      ) : null}
    </div>
  );
}
