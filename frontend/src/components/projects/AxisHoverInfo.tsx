import { usePulseHover } from '@/features/project-pulse/hover-context';
import {
  bandColor,
  bandForScore,
  bandLabel,
  formatScore,
  type RagCutoffs,
} from '@/features/project-pulse/rag-bands';
import type { RadiatorSnapshotDto, SubDimensionScore } from '@/lib/api/project-radiator';

import { AXIS_LABELS } from './ProjectRadiator';

interface AxisHoverInfoProps {
  snapshot: RadiatorSnapshotDto;
  cutoffs?: RagCutoffs;
}

function findSub(snapshot: RadiatorSnapshotDto, axisKey: string): SubDimensionScore | null {
  for (const q of snapshot.quadrants) {
    for (const s of q.subs) {
      if (s.key === axisKey) return s;
    }
  }
  return null;
}

export function AxisHoverInfo({ snapshot, cutoffs }: AxisHoverInfoProps): JSX.Element {
  const { hoverTarget } = usePulseHover();
  const axisKey =
    hoverTarget && hoverTarget.kind === 'axis' ? hoverTarget.axisKey : null;
  const sub = axisKey ? findSub(snapshot, axisKey) : null;

  if (!sub || !axisKey) {
    return (
      <div
        aria-live="polite"
        style={{
          background: 'var(--color-surface-alt)',
          border: '1px dashed var(--color-border)',
          borderRadius: 'var(--radius-control)',
          color: 'var(--color-text-muted)',
          fontSize: 11,
          padding: '6px 10px',
          textAlign: 'center',
        }}
      >
        Hover an axis to see its score, band, and explanation · click to override
      </div>
    );
  }

  const effective = sub.effectiveScore;
  const band = bandForScore(effective, cutoffs);
  const tone = bandColor(band);
  const label = AXIS_LABELS[axisKey] ?? axisKey;
  const isOverridden = sub.overrideScore !== null;

  return (
    <div
      aria-live="polite"
      data-testid="axis-hover-info"
      style={{
        alignItems: 'center',
        background: 'var(--color-surface)',
        border: `1px solid ${tone}`,
        borderLeft: `3px solid ${tone}`,
        borderRadius: 'var(--radius-control)',
        display: 'grid',
        fontSize: 12,
        gap: 12,
        gridTemplateColumns: '160px 80px 70px 1fr auto',
        padding: '8px 10px',
      }}
    >
      <strong>{label}</strong>
      <span
        style={{
          background: tone,
          borderRadius: 'var(--radius-control)',
          color: 'var(--color-surface)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.04em',
          padding: '2px 6px',
          textAlign: 'center',
          textTransform: 'uppercase',
        }}
      >
        {bandLabel(band)}
      </span>
      <span style={{ color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
        {formatScore(effective)}/4.0
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>{sub.explanation}</span>
      <span style={{ color: 'var(--color-text-subtle)', fontSize: 10 }}>
        {isOverridden ? `⚙ Override · auto was ${formatScore(sub.autoScore)}` : 'click to override'}
      </span>
    </div>
  );
}
