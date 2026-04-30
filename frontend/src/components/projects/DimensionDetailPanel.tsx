import { SectionCard } from '@/components/common/SectionCard';
import { IconButton, Table, type Column } from '@/components/ds';
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

  const titleNode = (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <span>{DIMENSION_TITLES[dimension]} Detail</span>
      <IconButton onClick={onClose} aria-label="Close panel" size="sm">\u00d7</IconButton>
    </span>
  );

  const rows = entries.map(([key, val]) => ({ key, label: SUB_CRITERION_LABELS[key] ?? key, value: val }));

  const columns: Column<{ key: string; label: string; value: SubCriterionValue }>[] = [
    { key: 'criterion', title: 'Sub-Criterion', getValue: (r) => r.label, render: (r) => <span style={{ fontWeight: 500 }}>{r.label}</span> },
    { key: 'rating', title: 'Rating', width: 110, render: (r) => <RatingBar value={r.value.rating} /> },
    { key: 'source', title: 'Source', width: 70, getValue: (r) => r.value.auto ? 'Auto' : 'Manual', render: (r) => (
      r.value.auto ? (
        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3, background: 'var(--color-status-info)', color: 'var(--color-surface)' }}>Auto</span>
      ) : (
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Manual</span>
      )
    ) },
    { key: 'note', title: 'Note', getValue: (r) => r.value.note ?? '', render: (r) => <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{r.value.note || '\u2014'}</span> },
  ];

  return (
    <div data-testid="dimension-detail-panel" style={{ borderLeft: '3px solid var(--color-accent)' }}>
      <SectionCard title={titleNode}>
        {entries.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            No sub-criteria data available for this dimension.
          </div>
        ) : (
          <Table
            variant="compact"
            columns={columns}
            rows={rows}
            getRowKey={(r) => r.key}
          />
        )}
      </SectionCard>
    </div>
  );
}
