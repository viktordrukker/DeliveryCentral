import { Table, type Column } from '@/components/ds';

interface PortfolioProject {
  name: string;
  staffing: 'green' | 'red' | 'yellow';
  time: 'green' | 'red' | 'yellow';
  timeline: 'green' | 'red' | 'yellow';
}

interface PortfolioHealthHeatmapProps {
  projects: PortfolioProject[];
}

const COLOR_MAP = {
  green: 'var(--color-status-active)',
  red: 'var(--color-status-danger)',
  yellow: 'var(--color-status-warning)',
};

const LABEL_MAP = {
  green: 'Good',
  red: 'At Risk',
  yellow: 'Warning',
};

function StatusPill({ status }: { status: 'green' | 'red' | 'yellow' }): JSX.Element {
  return (
    <span style={{
      backgroundColor: COLOR_MAP[status],
      borderRadius: '4px',
      color: 'var(--color-surface)',
      display: 'inline-block',
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 8px',
    }}>
      {LABEL_MAP[status]}
    </span>
  );
}

export function PortfolioHealthHeatmap({ projects }: PortfolioHealthHeatmapProps): JSX.Element {
  const columns: Column<PortfolioProject>[] = [
    { key: 'name', title: 'Project', getValue: (p) => p.name, render: (p) => p.name },
    { key: 'staffing', title: <span title="Active assignments covering the project">Staffing</span>, align: 'center', render: (p) => <StatusPill status={p.staffing} /> },
    { key: 'time', title: <span title="Approved time submitted against the project">Time</span>, align: 'center', render: (p) => <StatusPill status={p.time} /> },
    { key: 'timeline', title: <span title="Project timeline relative to planned end date">Timeline</span>, align: 'center', render: (p) => <StatusPill status={p.timeline} /> },
  ];

  return (
    <div>
      <Table
        variant="compact"
        columns={columns}
        rows={projects}
        getRowKey={(p) => p.name}
      />
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        <span style={{ fontWeight: 600 }}>Legend:</span>
        {(['green', 'yellow', 'red'] as const).map((status) => (
          <span key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: COLOR_MAP[status] }} />
            {LABEL_MAP[status]}
          </span>
        ))}
      </div>
    </div>
  );
}
