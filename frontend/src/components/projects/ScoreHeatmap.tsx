import { useMemo } from 'react';

import { Button } from '@/components/ds';

import { usePulseHover } from '@/features/project-pulse/hover-context';
import {
  DEFAULT_RAG_CUTOFFS,
  bandColor,
  bandForScore,
  formatScore,
  type RagCutoffs,
} from '@/features/project-pulse/rag-bands';
import { activeAxesFor, type ProjectShape } from '@/features/project-pulse/shape-defaults';
import type { RadiatorSnapshotDto, SubDimensionScore } from '@/lib/api/project-radiator';

import { AXIS_LABELS } from './ProjectRadiator';

interface ScoreHeatmapProps {
  snapshot: RadiatorSnapshotDto;
  onAxisClick?: (subKey: string) => void;
  shape?: ProjectShape | null;
  cutoffs?: RagCutoffs;
}

const QUADRANT_LABELS: Record<'scope' | 'schedule' | 'budget' | 'people', string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  people: 'People',
};

const QUADRANT_ORDER: Array<'scope' | 'schedule' | 'budget' | 'people'> = [
  'scope',
  'schedule',
  'budget',
  'people',
];

interface HeatmapCell {
  sub: SubDimensionScore;
  fill: string;
  isActive: boolean;
}

export function ScoreHeatmap({
  snapshot,
  onAxisClick,
  shape = null,
  cutoffs = DEFAULT_RAG_CUTOFFS,
}: ScoreHeatmapProps): JSX.Element {
  const pulseHover = usePulseHover();
  const active = shape ? new Set(activeAxesFor(shape)) : null;

  const rows = useMemo(() => {
    return QUADRANT_ORDER.map((qKey) => {
      const quadrant = snapshot.quadrants.find((q) => q.key === qKey);
      const cells: HeatmapCell[] = (quadrant?.subs ?? []).map((s) => {
        const band = bandForScore(s.effectiveScore, cutoffs);
        return {
          sub: s,
          fill: bandColor(band),
          isActive: active ? active.has(s.key) : true,
        };
      });
      return { key: qKey, label: QUADRANT_LABELS[qKey], quadrantScore: quadrant?.score ?? null, cells };
    });
  }, [snapshot, active, cutoffs]);

  return (
    <div data-testid="score-heatmap" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 'var(--space-2)' }}>
      {rows.map((row) => (
        <div key={row.key} style={{ alignItems: 'center', display: 'grid', gap: 8, gridTemplateColumns: '110px 80px 1fr' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{row.label}</span>
          <span
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 11,
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'right',
            }}
          >
            {row.quadrantScore !== null ? `${Math.round(row.quadrantScore)}/25` : '—'}
          </span>
          <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
            {row.cells.map((cell) => {
              const faded = !cell.isActive;
              const isHovered =
                pulseHover.hoverTarget?.kind === 'axis' && pulseHover.hoverTarget.axisKey === cell.sub.key;
              return (
                <Button
                  aria-label={`${AXIS_LABELS[cell.sub.key] ?? cell.sub.key}: ${formatScore(cell.sub.effectiveScore)}`}
                  variant="secondary"
                  data-axis-key={cell.sub.key}
                  disabled={faded || !onAxisClick}
                  key={cell.sub.key}
                  onClick={() => onAxisClick?.(cell.sub.key)}
                  onMouseEnter={() => pulseHover.setHoverTarget({ kind: 'axis', axisKey: cell.sub.key })}
                  onMouseLeave={() => pulseHover.setHoverTarget(null)}
                  style={{
                    background: faded ? 'var(--color-surface-alt)' : cell.fill,
                    border: isHovered
                      ? '2px solid var(--color-accent)'
                      : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-control)',
                    color: faded ? 'var(--color-text-subtle)' : 'var(--color-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: 10,
                    gap: 2,
                    justifyContent: 'space-between',
                    minHeight: 44,
                    opacity: faded ? 0.45 : 1,
                    padding: '6px 8px',
                    textAlign: 'left',
                    transition: 'transform 120ms ease, box-shadow 120ms ease',
                    ...(isHovered ? { transform: 'scale(1.02)', boxShadow: 'var(--shadow-card)' } : {}),
                  }}
                  type="button"
                >
                  <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.9 }}>
                    {AXIS_LABELS[cell.sub.key] ?? cell.sub.key}
                  </span>
                  <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {formatScore(cell.sub.effectiveScore)}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
