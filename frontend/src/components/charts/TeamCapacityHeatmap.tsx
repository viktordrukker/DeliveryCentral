import { useNavigate } from 'react-router-dom';

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
  if (pct === 0) return '#f0f0f0';
  if (pct <= 50) return '#bbf7d0';
  if (pct <= 80) return '#22c55e';
  if (pct <= 100) return '#f59e0b';
  if (pct <= 120) return '#f97316';
  return '#ef4444';
}

export function TeamCapacityHeatmap({ people, weeks }: TeamCapacityHeatmapProps): JSX.Element {
  const navigate = useNavigate();

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ padding: '4px 8px', textAlign: 'left' }}>Person</th>
            {weeks.map((w) => (
              <th
                key={w}
                style={{ fontSize: '11px', padding: '4px 6px', textAlign: 'center', whiteSpace: 'nowrap' }}
              >
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.name}>
              <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>{person.name}</td>
              {weeks.map((w, idx) => {
                const pct = person.allocationByWeek[idx] ?? 0;
                const isClickable = Boolean(person.personId);
                return (
                  <td
                    key={w}
                    onClick={
                      isClickable
                        ? () => navigate(`/assignments?personId=${person.personId}&weekStart=${w}`)
                        : undefined
                    }
                    style={{
                      backgroundColor: cellColor(pct),
                      borderRadius: '3px',
                      cursor: isClickable ? 'pointer' : 'default',
                      fontSize: '11px',
                      padding: '4px',
                      textAlign: 'center',
                      transition: 'opacity 0.15s',
                    }}
                    title={
                      isClickable
                        ? `${person.name} — ${w}: ${pct}% — click to view assignments`
                        : `${person.name} — ${w}: ${pct}%`
                    }
                    onMouseEnter={(e) => { if (isClickable) (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
                    onMouseLeave={(e) => { if (isClickable) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                  >
                    {pct > 0 ? `${pct}%` : '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
