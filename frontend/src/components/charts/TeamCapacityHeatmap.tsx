import { useNavigate } from 'react-router-dom';

import { Table, type Column } from '@/components/ds';

interface TeamCapacityHeatmapPerson {
  allocationByWeek: number[];
  name: string;
  personId?: string;
}

interface TeamCapacityHeatmapProps {
  people: TeamCapacityHeatmapPerson[];
  weeks: string[];
}

function cellColor(pct: number): string {
  if (pct === 0) return 'var(--color-border)';
  if (pct <= 50) return 'color-mix(in srgb, var(--color-status-active) 40%, var(--color-surface))';
  if (pct <= 80) return 'var(--color-status-active)';
  if (pct <= 100) return 'var(--color-status-warning)';
  if (pct <= 120) return 'color-mix(in srgb, var(--color-status-warning) 70%, var(--color-status-danger))';
  return 'var(--color-status-danger)';
}

export function TeamCapacityHeatmap({ people, weeks }: TeamCapacityHeatmapProps): JSX.Element {
  const navigate = useNavigate();

  const columns: Column<TeamCapacityHeatmapPerson>[] = [
    { key: 'name', title: 'Person', getValue: (p) => p.name, render: (p) => <span style={{ whiteSpace: 'nowrap' }}>{p.name}</span> },
    ...weeks.map((w, idx) => ({
      key: `wk-${w}`,
      title: <span style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>{w}</span>,
      align: 'center' as const,
      render: (p: TeamCapacityHeatmapPerson) => {
        const pct = p.allocationByWeek[idx] ?? 0;
        const isClickable = Boolean(p.personId);
        return (
          <span
            onClick={isClickable ? () => navigate(`/assignments?personId=${p.personId}&weekStart=${w}`) : undefined}
            style={{
              backgroundColor: cellColor(pct),
              borderRadius: '3px',
              cursor: isClickable ? 'pointer' : 'default',
              fontSize: '11px',
              padding: '2px 6px',
              display: 'inline-block',
              transition: 'opacity 0.15s',
            }}
            title={isClickable
              ? `${p.name} — ${w}: ${pct}% — click to view assignments`
              : `${p.name} — ${w}: ${pct}%`}
          >
            {pct > 0 ? `${pct}%` : '—'}
          </span>
        );
      },
    })),
  ];

  return (
    <Table
      variant="compact"
      columns={columns}
      rows={people}
      getRowKey={(p) => p.name}
    />
  );
}
