import { EmptyState } from '@/components/common/EmptyState';
import { WorkEvidenceItem } from '@/lib/api/work-evidence';

interface EvidenceSummaryProps {
  items: WorkEvidenceItem[];
}

export function EvidenceSummary({ items }: EvidenceSummaryProps): JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        description="No work evidence has been recorded for this project."
        title="No work evidence"
      />
    );
  }

  const totalHours = items.reduce((sum, item) => sum + item.effortHours, 0);
  const latestEvidence = [...items].sort((left, right) =>
    right.recordedAt.localeCompare(left.recordedAt),
  )[0];

  return (
    <div className="comparison-list">
      <article className="comparison-card">
        <div className="comparison-card__title">Recorded effort</div>
        <div className="comparison-card__meta">{totalHours.toFixed(1)} hours total</div>
        <div className="comparison-card__meta">{items.length} evidence records</div>
      </article>

      <article className="comparison-card">
        <div className="comparison-card__title">Latest evidence</div>
        <div className="comparison-card__meta">
          {latestEvidence.summary ?? latestEvidence.sourceRecordKey}
        </div>
        <div className="comparison-card__meta">
          {latestEvidence.sourceType} · {latestEvidence.effortHours}h
        </div>
      </article>
    </div>
  );
}
