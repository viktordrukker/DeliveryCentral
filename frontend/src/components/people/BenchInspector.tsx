import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, Button } from '@/components/ds';
import { Pct } from '@/components/ds/Pct';
import type { BenchEnrichedRowDto } from '@/lib/api/people-bench';
import {
  fetchPersonSuggestedPositions,
  type PersonSuggestedPosition,
} from '@/lib/api/project-positions';

interface BenchInspectorProps {
  row: BenchEnrichedRowDto;
  onClose: () => void;
  /** V2-A.9 — prev/next stepper across the sorted bench list. */
  position?: { index: number; total: number; onPrev?: () => void; onNext?: () => void };
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
export function BenchInspector({ row, onClose, position }: BenchInspectorProps): JSX.Element {
  // BE-track / Bench suggested-fills — load on personId change. The legacy
  // hardcoded `row.suggestedProjectIds` is kept as a fallback while loading;
  // a fetch failure leaves the section empty rather than crashing.
  const [suggestions, setSuggestions] = useState<PersonSuggestedPosition[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  useEffect(() => {
    let active = true;
    setLoadingSuggestions(true);
    void fetchPersonSuggestedPositions(row.personId, 5)
      .then((res) => {
        if (active) {
          setSuggestions(res.candidates);
          setLoadingSuggestions(false);
        }
      })
      .catch(() => {
        if (active) {
          setSuggestions([]);
          setLoadingSuggestions(false);
        }
      });
    return () => {
      active = false;
    };
  }, [row.personId]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {position ? (
            <span
              style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
              data-testid="bench-inspector-stepper"
            >
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={!position.onPrev}
                onClick={position.onPrev}
                aria-label="Previous person"
              >
                ‹
              </Button>
              <span
                className="compact muted"
                style={{ fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'center' }}
              >
                {position.index + 1} / {position.total}
              </span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                disabled={!position.onNext}
                onClick={position.onNext}
                aria-label="Next person"
              >
                ›
              </Button>
            </span>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onClose} type="button" aria-label="Close inspector">×</Button>
        </div>
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

      <div data-testid="bench-inspector-suggestions">
        <div style={S_SECTION_LABEL}>
          Suggested fills{suggestions && suggestions.length > 0 ? ` (${suggestions.length})` : ''}
        </div>
        {loadingSuggestions ? (
          <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>Loading suggestions…</div>
        ) : !suggestions || suggestions.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            No matching open positions found for this person.
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
            {suggestions.map((s) => (
              <li
                key={s.positionId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  padding: '4px 0',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <Link
                  to={`/projects/${s.projectId}/positions/${s.positionId}`}
                  style={{
                    flex: 1,
                    color: 'var(--color-accent)',
                    textDecoration: 'none',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={`${s.matchedSkills.length} matched · ${s.missingSkills.length} missing`}
                >
                  {s.role}
                  <span style={{ color: 'var(--color-text-muted)' }}> · {s.projectName}</span>
                </Link>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}
                >
                  {Math.round(s.matchScore * 100)}%
                </span>
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
          disabled={!suggestions || suggestions.length === 0}
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
