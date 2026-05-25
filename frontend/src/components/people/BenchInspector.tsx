import { Link } from 'react-router-dom';

import { Avatar, Button } from '@/components/ds';
import { Pct } from '@/components/ds/Pct';
import type { BenchEnrichedRowDto } from '@/lib/api/people-bench';

interface BenchInspectorProps {
  row: BenchEnrichedRowDto;
  onClose: () => void;
}

function daysTone(days: number): 'active' | 'info' | 'warning' | 'danger' {
  if (days <= 7) return 'active';
  if (days <= 30) return 'info';
  if (days <= 60) return 'warning';
  return 'danger';
}

const S_PANEL: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: 16,
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  boxShadow: 'var(--shadow-card)',
};
const S_HEADER: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
};
const S_IDENTITY: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 0,
  flex: 1,
};
const S_META_ROW: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12,
  paddingTop: 8,
  borderTop: '1px solid var(--color-border)',
};
const S_META_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
};
const S_META_VALUE: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums',
};
const S_SECTION_LABEL: React.CSSProperties = {
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--color-text-subtle)',
  marginBottom: 6,
};

/**
 * V2-A.7 — right-pane inspector for the Bench list-detail layout.
 *
 * Renders person identity, bench metadata (days idle, availability,
 * 14d utilization headroom), the suggested-fill project IDs (linked to
 * the project page), and a CTA row. Designed to mount inside the
 * Bench surface alongside the master list.
 */
export function BenchInspector({ row, onClose }: BenchInspectorProps): JSX.Element {
  const tone = daysTone(row.daysOnBench);
  const toneColor: Record<'active' | 'info' | 'warning' | 'danger', string> = {
    active: 'var(--color-status-active)',
    info: 'var(--color-status-info)',
    warning: 'var(--color-status-warning)',
    danger: 'var(--color-status-danger)',
  };
  const headroomPct = Math.min(100, Math.round((row.availabilityHours14d / 80) * 100));

  return (
    <aside style={S_PANEL} aria-label="Bench person inspector" data-testid="bench-inspector">
      <div style={S_HEADER}>
        <div style={S_IDENTITY}>
          <Avatar name={row.name} size="md" />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>{row.name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
              {row.role}
              {row.grade ? ` · ${row.grade}` : ''}
              {row.office ? ` · ${row.office}` : ''}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} type="button" aria-label="Close inspector">×</Button>
      </div>

      <div style={S_META_ROW}>
        <div>
          <div style={S_META_LABEL}>Days idle</div>
          <div style={{ ...S_META_VALUE, color: toneColor[tone] }}>{row.daysOnBench}d</div>
        </div>
        <div>
          <div style={S_META_LABEL}>Availability 14d</div>
          <div style={S_META_VALUE}>{row.availabilityHours14d}h</div>
        </div>
        <div>
          <div style={S_META_LABEL}>Headroom</div>
          <div style={S_META_VALUE}><Pct value={headroomPct} fractionDigits={0} /></div>
        </div>
      </div>

      <div>
        <div style={S_SECTION_LABEL}>
          Suggested fills{row.suggestedProjectIds.length > 0 ? ` (${row.suggestedProjectIds.length})` : ''}
        </div>
        {row.suggestedProjectIds.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            No matching engine suggestions for this person yet.
          </div>
        ) : (
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {row.suggestedProjectIds.map((projectId) => (
              <li key={projectId} style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
                <Link
                  to={`/projects/${projectId}`}
                  style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
                >
                  {projectId}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button as={Link} variant="secondary" size="sm" to={`/people/${row.personId}`}>
          Open profile
        </Button>
        <Button
          variant="primary"
          size="sm"
          type="button"
          disabled={row.suggestedProjectIds.length === 0}
          onClick={() => {
            // V2-A.7 v1 — "Propose to position" routes to the staffing-request
            // creation flow, pre-filling the candidate. Wiring the full slate
            // pre-fill to the matching engine is V2-A.7-followup.
            window.location.href = `/staffing-requests/new?candidatePersonId=${row.personId}`;
          }}
        >
          Propose to position
        </Button>
      </div>
    </aside>
  );
}
