import type { DimensionDetailsJson, SubCriterionValue } from '@/lib/api/project-rag';

type Dimension = 'scope' | 'schedule' | 'budget' | 'business';

interface DimensionDetailPanelProps {
  dimension: Dimension;
  details: DimensionDetailsJson[keyof DimensionDetailsJson] | undefined;
  onClose: () => void;
}

const DIMENSION_TITLES: Record<Dimension, string> = {
  scope: 'Scope',
  schedule: 'Schedule',
  budget: 'Budget',
  business: 'Business',
};

const SUB_CRITERION_LABELS: Record<string, string> = {
  staffingFill: 'Staffing Fill Rate',
  requirementsStability: 'Requirements Stability',
  scopeCreep: 'Scope Creep',
  deliverableAcceptance: 'Deliverable Acceptance',
  changeRequestVolume: 'Change Request Volume',
  milestoneAdherence: 'Milestone Adherence',
  velocity: 'Velocity / Speed',
  timelineDeviation: 'Timeline Deviation',
  criticalPathHealth: 'Critical Path Health',
  spendRate: 'Spend Rate',
  forecastAccuracy: 'Forecast Accuracy',
  capexCompliance: 'CAPEX Compliance',
  costVariance: 'Cost Variance',
  clientSatisfaction: 'Client Satisfaction (CSAT)',
  stakeholderEngagement: 'Stakeholder Engagement',
  businessValueDelivery: 'Business Value Delivery',
  strategicAlignment: 'Strategic Alignment',
  teamMood: 'Team Mood',
};

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

export function DimensionDetailPanel({ dimension, details, onClose }: DimensionDetailPanelProps): JSX.Element {
  const entries = details
    ? Object.entries(details as Record<string, SubCriterionValue>).filter(
        ([, v]) => v && typeof v === 'object' && 'rating' in v,
      )
    : [];

  return (
    <div
      data-testid="dimension-detail-panel"
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 8,
        background: 'var(--color-surface-alt)',
        padding: 'var(--space-4)',
        position: 'relative',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close panel"
        style={{
          position: 'absolute',
          top: 'var(--space-2)',
          right: 'var(--space-2)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          color: 'var(--color-text-muted)',
          lineHeight: 1,
          padding: 'var(--space-1)',
        }}
      >
        x
      </button>

      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
        {DIMENSION_TITLES[dimension]} Detail
      </div>

      {entries.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          No sub-criteria data available for this dimension.
        </div>
      ) : (
        <table className="dash-compact-table" style={{ fontSize: 12, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ minWidth: 160 }}>Sub-Criterion</th>
              <th style={{ width: 110 }}>Rating</th>
              <th style={{ width: 70 }}>Source</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key}>
                <td style={{ fontWeight: 500 }}>{SUB_CRITERION_LABELS[key] ?? key}</td>
                <td><RatingBar value={val.rating} /></td>
                <td>
                  {val.auto ? (
                    <span style={{
                      display: 'inline-block',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 3,
                      background: 'var(--color-status-info)',
                      color: 'var(--color-surface)',
                    }}>
                      Auto
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Manual</span>
                  )}
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{val.note || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
