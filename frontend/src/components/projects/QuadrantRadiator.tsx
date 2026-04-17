import { useState } from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { EnhancedComputedRag, RagSnapshotDto, RagRating, SubCriterionValue } from '@/lib/api/project-rag';

interface QuadrantRadiatorProps {
  enhanced: EnhancedComputedRag | null;
  latestSnapshot: RagSnapshotDto | null;
  loading?: boolean;
  onDimensionClick?: (dimension: 'scope' | 'schedule' | 'budget' | 'business') => void;
}

const RAG_COLORS: Record<string, string> = {
  GREEN: 'var(--color-status-active)',
  AMBER: 'var(--color-status-warning)',
  RED: 'var(--color-status-danger)',
};

type Dimension = 'scope' | 'schedule' | 'budget' | 'business';

interface CriterionDef {
  key: string;
  label: string;
}

const DIMENSION_CRITERIA: Record<Dimension, CriterionDef[]> = {
  scope: [
    { key: 'staffingFill', label: 'Staffing Fill' },
    { key: 'requirementsStability', label: 'Requirements Stability' },
    { key: 'scopeCreep', label: 'Scope Creep' },
    { key: 'deliverableAcceptance', label: 'Deliverable Acceptance' },
    { key: 'changeRequestVolume', label: 'Change Requests' },
  ],
  schedule: [
    { key: 'milestoneAdherence', label: 'Milestone Adherence' },
    { key: 'velocity', label: 'Velocity' },
    { key: 'timelineDeviation', label: 'Timeline Deviation' },
    { key: 'criticalPathHealth', label: 'Critical Path Health' },
  ],
  budget: [
    { key: 'spendRate', label: 'Spend Rate' },
    { key: 'forecastAccuracy', label: 'Forecast Accuracy' },
    { key: 'capexCompliance', label: 'CAPEX Compliance' },
    { key: 'costVariance', label: 'Cost Variance' },
  ],
  business: [
    { key: 'clientSatisfaction', label: 'Client Satisfaction' },
    { key: 'stakeholderEngagement', label: 'Stakeholder Engagement' },
    { key: 'businessValueDelivery', label: 'Value Delivery' },
    { key: 'strategicAlignment', label: 'Strategic Alignment' },
    { key: 'teamMood', label: 'Team Mood' },
  ],
};

const DIMENSION_LABELS: Record<Dimension, string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  business: 'Business',
};

function ragForDimension(enhanced: EnhancedComputedRag, dim: Dimension): RagRating {
  if (dim === 'scope') return enhanced.scopeRag;
  if (dim === 'schedule') return enhanced.scheduleRag;
  if (dim === 'budget') return enhanced.budgetRag;
  return enhanced.businessRag;
}

function barColor(rating: number): string {
  if (rating >= 4) return 'var(--color-status-active)';
  if (rating >= 3) return 'var(--color-status-warning)';
  return 'var(--color-status-danger)';
}

function RatingBar({ value }: { value: number }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 16,
            height: 8,
            borderRadius: 2,
            background: i <= value ? barColor(value) : 'var(--color-border)',
          }}
        />
      ))}
    </span>
  );
}

const DIMENSIONS: Dimension[] = ['scope', 'schedule', 'budget', 'business'];

export function QuadrantRadiator({ enhanced, latestSnapshot, loading, onDimensionClick }: QuadrantRadiatorProps): JSX.Element {
  const [hovered, setHovered] = useState<Dimension | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 180,
              borderRadius: 8,
              background: 'var(--color-border)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    );
  }

  if (!enhanced) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: 13 }}>
        Enhanced RAG data not available for this project.
      </div>
    );
  }

  const details = enhanced.dimensionHints;

  return (
    <div data-testid="quadrant-radiator">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        {DIMENSIONS.map((dim) => {
          const rag = ragForDimension(enhanced, dim);
          const criteria = DIMENSION_CRITERIA[dim];
          const dimDetails = details?.[dim] as Record<string, SubCriterionValue | undefined> | undefined;

          return (
            <div
              key={dim}
              onClick={() => onDimensionClick?.(dim)}
              onMouseEnter={() => setHovered(dim)}
              onMouseLeave={() => setHovered(null)}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: 'var(--space-3)',
                background: hovered === dim ? 'var(--color-surface-alt)' : 'var(--color-surface)',
                cursor: onDimensionClick ? 'pointer' : 'default',
                transition: 'background 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                  {DIMENSION_LABELS[dim]}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: RAG_COLORS[rag] ?? 'var(--color-border)',
                    flexShrink: 0,
                  }}
                  title={`${DIMENSION_LABELS[dim]}: ${rag}`}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {criteria.map((c) => {
                  const sub = dimDetails?.[c.key];
                  const rating = sub?.rating ?? 0;
                  return (
                    <div
                      key={c.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 12 }}
                    >
                      <span style={{ flex: '1 1 0', color: 'var(--color-text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.label}
                      </span>
                      {sub?.auto && (
                        <span style={{ fontSize: 10, color: 'var(--color-text-subtle)', flexShrink: 0 }}>auto</span>
                      )}
                      <RatingBar value={rating} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        textAlign: 'center',
        marginTop: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Overall:</span>
          <StatusBadge status={enhanced.overallRag} variant="chip" />
        </div>
        {latestSnapshot?.narrative && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', maxWidth: 500 }}>
            {latestSnapshot.narrative}
          </div>
        )}
      </div>
    </div>
  );
}
