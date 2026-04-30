import type { RagSnapshotDto } from '@/lib/api/project-rag';
import { Table, type Column } from '@/components/ds';

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

type DimensionKey = typeof DIMENSIONS[number];

interface DimensionRow {
  dim: DimensionKey;
  label: string;
  values: Array<{ weekStarting: string; rating: string | null }>;
}

export function RagTrendTimeline({ snapshots }: RagTrendTimelineProps): JSX.Element {
  if (snapshots.length === 0) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No status history recorded yet.</p>;
  }

  const rows: DimensionRow[] = DIMENSIONS.map((dim) => ({
    dim,
    label: DIMENSION_LABELS[dim],
    values: snapshots.map((s) => ({ weekStarting: s.weekStarting, rating: (s[dim] as string | null) ?? null })),
  }));

  const columns: Column<DimensionRow>[] = [
    { key: 'dim', title: 'Dimension', width: 70, getValue: (r) => r.label, render: (r) => <span style={{ fontWeight: 500 }}>{r.label}</span> },
    ...snapshots.map((s, i) => ({
      key: `wk-${s.weekStarting}`,
      title: <span style={{ fontSize: 10 }}>{s.weekStarting.slice(5)}</span>,
      align: 'center' as const,
      width: 30,
      render: (r: DimensionRow) => {
        const cell = r.values[i];
        const value = cell?.rating ?? null;
        return (
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: value ? RAG_COLORS[value] ?? 'var(--color-border)' : 'var(--color-border)',
            }}
            title={`${r.label}: ${value ?? 'N/A'}`}
          />
        );
      },
    })),
  ];

  const latest = snapshots[snapshots.length - 1];

  return (
    <>
      <Table
        variant="compact"
        columns={columns}
        rows={rows}
        getRowKey={(r) => r.dim}
      />
      {latest?.narrative ? (
        <div style={{ marginTop: 'var(--space-2)', fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Latest: {latest.narrative}
        </div>
      ) : null}
    </>
  );
}
