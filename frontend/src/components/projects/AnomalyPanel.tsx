import { ComparisonSection } from '@/components/dashboard/ComparisonSection';
import { ComparisonAnomalyItem } from '@/lib/api/planned-vs-actual';
import { ANOMALY_TYPE_LABELS, humanizeEnum } from '@/lib/labels';

interface AnomalyPanelProps {
  items: ComparisonAnomalyItem[];
}

export function AnomalyPanel({ items }: AnomalyPanelProps): JSX.Element {
  return (
    <div className="project-anomaly-panel">
      <div className="project-anomaly-panel__header">
        <h3 className="section-card__title">Planned vs Actual Anomalies</h3>
        <p className="project-anomaly-panel__copy">
          Anomalies are isolated from staffing and evidence summaries so operational issues are
          visible without blending them into normal project workload data.
        </p>
      </div>

      <ComparisonSection
        emptyDescription="No planned vs actual anomalies were detected for this project."
        items={items}
        renderItem={(item) => (
          <>
            <div className="comparison-card__title">{humanizeEnum(item.type, ANOMALY_TYPE_LABELS)}</div>
            <div className="comparison-card__meta">
              {item.person.displayName} · {item.project.name}
            </div>
            <p className="placeholder-block__copy">{item.message}</p>
          </>
        )}
        title="Anomalies"
      />
    </div>
  );
}
