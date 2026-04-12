interface PortfolioProject {
  evidence: 'green' | 'red' | 'yellow';
  name: string;
  staffing: 'green' | 'red' | 'yellow';
  timeline: 'green' | 'red' | 'yellow';
}

interface PortfolioHealthHeatmapProps {
  projects: PortfolioProject[];
}

const COLOR_MAP = {
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#f59e0b',
};

const LABEL_MAP = {
  green: 'Good',
  red: 'At Risk',
  yellow: 'Warning',
};

export function PortfolioHealthHeatmap({ projects }: PortfolioHealthHeatmapProps): JSX.Element {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '6px 10px', textAlign: 'left' }}>Project</th>
            <th style={{ padding: '6px 10px', textAlign: 'center' }} title="Active assignments covering the project">Staffing</th>
            <th style={{ padding: '6px 10px', textAlign: 'center' }} title="Recent work evidence submitted against the project">Evidence</th>
            <th style={{ padding: '6px 10px', textAlign: 'center' }} title="Project timeline relative to planned end date">Timeline</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.name}>
              <td style={{ padding: '6px 10px' }}>{p.name}</td>
              {(['staffing', 'evidence', 'timeline'] as const).map((dim) => (
                <td key={dim} style={{ padding: '4px 6px', textAlign: 'center' }}>
                  <span
                    style={{
                      backgroundColor: COLOR_MAP[p[dim]],
                      borderRadius: '4px',
                      color: '#fff',
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                    }}
                  >
                    {LABEL_MAP[p[dim]]}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
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
