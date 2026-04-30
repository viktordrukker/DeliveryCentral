import { useState } from 'react';

import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { QuadrantScore, SubDimensionScore } from '@/lib/api/project-radiator';

import { AXIS_LABELS } from './ProjectRadiator';
import { Button, Table, type Column } from '@/components/ds';

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
          <Button aria-label="Close drill-down" variant="secondary" size="sm" onClick={onClose} type="button">
            Close
          </Button>
        </div>

        <Table
          variant="compact"
          columns={(() => {
            const cols: Column<SubDimensionScore>[] = [
              { key: 'index', title: '#', width: 28, render: (_s: SubDimensionScore, idx: number) => idx + 1 },
              { key: 'sub', title: 'Sub-dimension', getValue: (s) => AXIS_LABELS[s.key] ?? s.key, render: (s) => <span style={{ fontWeight: 500 }}>{AXIS_LABELS[s.key] ?? s.key}</span> },
              { key: 'auto', title: 'Auto', align: 'center', width: 64, render: (s) => (
                <StatusBadge score={s.autoScore ?? undefined} label={scoreLabel(s.autoScore)} tone={scoreTone(s.autoScore)} variant="score" />
              ) },
              { key: 'override', title: 'Override', width: 140, render: (s) => (
                s.overrideScore !== null ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <StatusBadge score={s.overrideScore} tone={scoreTone(s.overrideScore)} variant="score" />
                    {s.overriddenBy ? <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>by {s.overriddenBy}</span> : null}
                  </span>
                ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>
              ) },
              { key: 'explanation', title: 'Explanation', getValue: (s) => s.explanation, render: (s) => <span style={{ color: 'var(--color-text-muted)' }}>{s.explanation}</span> },
            ];
            if (canOverride) {
              cols.push({ key: 'action', title: 'Action', align: 'right', width: 100, render: (s) => (
                <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); onOverrideClick(s); }} type="button">
                  Override
                </Button>
              ) });
            }
            return cols;
          })()}
          rows={quadrant.subs}
          getRowKey={(s) => s.key}
          onRowClick={(s) => setExpandedKey(expandedKey === s.key ? null : s.key)}
        />
        {expandedKey ? (() => {
          const expanded = quadrant.subs.find((s) => s.key === expandedKey);
          if (!expanded?.reason) return null;
          return (
            <div style={{ padding: 'var(--space-2)', background: 'var(--color-surface-alt)', marginTop: 'var(--space-1)', borderRadius: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                Override reason — {AXIS_LABELS[expanded.key] ?? expanded.key}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text)' }}>{expanded.reason}</div>
            </div>
          );
        })() : null}
      </SectionCard>
    </div>
  );
}
