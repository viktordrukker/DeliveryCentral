import { Fragment, useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { QuadrantScore, SubDimensionScore } from '@/lib/api/project-radiator';

import { AXIS_LABELS } from './ProjectRadiator';

interface RadiatorDrillDownProps {
  quadrant: QuadrantScore;
  canOverride: boolean;
  onOverrideClick: (sub: SubDimensionScore) => void;
  onClose: () => void;
}

const QUADRANT_LABEL: Record<string, string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  people: 'People',
};

function scoreTone(score: number | null): 'active' | 'warning' | 'danger' | 'neutral' {
  if (score === null) return 'neutral';
  if (score >= 4) return 'active';
  if (score >= 2) return 'warning';
  return 'danger';
}

function scoreLabel(score: number | null): string {
  if (score === null) return '—';
  return String(score);
}

export function RadiatorDrillDown({
  quadrant,
  canOverride,
  onOverrideClick,
  onClose,
}: RadiatorDrillDownProps): JSX.Element {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const quadrantName = QUADRANT_LABEL[quadrant.key] ?? quadrant.key;

  return (
    <div
      data-testid="radiator-drill-down"
      style={{ borderLeft: '3px solid var(--color-accent)', paddingLeft: 'var(--space-2)' }}
    >
      <SectionCard
        title={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span>{quadrantName} Details</span>
            {quadrant.score !== null ? (
              <StatusBadge
                label={`${quadrant.score}/100`}
                status={quadrant.band ? quadrant.band.toLowerCase() : 'neutral'}
                variant="chip"
              />
            ) : null}
          </span>
        }
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-2)' }}>
          <button
            aria-label="Close drill-down"
            className="button button--secondary button--sm"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <table className="dash-compact-table" style={{ width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ width: 28, textAlign: 'left' }}>#</th>
              <th style={{ textAlign: 'left' }}>Sub-dimension</th>
              <th style={{ width: 64, textAlign: 'center' }}>Auto</th>
              <th style={{ width: 140, textAlign: 'left' }}>Override</th>
              <th style={{ textAlign: 'left' }}>Explanation</th>
              {canOverride ? <th style={{ width: 100, textAlign: 'right' }}>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {quadrant.subs.map((sub, idx) => {
              const isExpanded = expandedKey === sub.key;
              return (
                <Fragment key={sub.key}>
                  <tr
                    onClick={() => setExpandedKey(isExpanded ? null : sub.key)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 500 }}>{AXIS_LABELS[sub.key] ?? sub.key}</td>
                    <td style={{ textAlign: 'center' }}>
                      <StatusBadge
                        score={sub.autoScore ?? undefined}
                        label={scoreLabel(sub.autoScore)}
                        tone={scoreTone(sub.autoScore)}
                        variant="score"
                      />
                    </td>
                    <td>
                      {sub.overrideScore !== null ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          <StatusBadge
                            score={sub.overrideScore}
                            tone={scoreTone(sub.overrideScore)}
                            variant="score"
                          />
                          {sub.overriddenBy ? (
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                              by {sub.overriddenBy}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{sub.explanation}</td>
                    {canOverride ? (
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="button button--secondary button--sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOverrideClick(sub);
                          }}
                          type="button"
                        >
                          Override
                        </button>
                      </td>
                    ) : null}
                  </tr>
                  {isExpanded && sub.reason ? (
                    <tr>
                      <td colSpan={canOverride ? 6 : 5} style={{ padding: 'var(--space-2)', background: 'var(--color-surface-alt)' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>Override reason</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text)' }}>{sub.reason}</div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
