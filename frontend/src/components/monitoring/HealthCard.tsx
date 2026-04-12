interface HealthCardProps {
  label: string;
  status: string;
  summary: string;
  value: string;
}

export function HealthCard({
  label,
  status,
  summary,
  value,
}: HealthCardProps): JSX.Element {
  return (
    <div className="monitoring-card">
      <div className="monitoring-card__header">
        <span className="metric-card__label">{label}</span>
        <span className={`status-indicator status-indicator--${normalizeStatus(status)}`}>
          {status}
        </span>
      </div>
      <div className="monitoring-card__value">{value}</div>
      <p className="monitoring-card__summary">{summary}</p>
    </div>
  );
}

function normalizeStatus(status: string): string {
  return status.replace(/_/g, '-').toLowerCase();
}
