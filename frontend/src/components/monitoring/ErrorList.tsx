import { MonitoringErrorItem } from '@/features/admin/useMonitoringAdmin';

interface ErrorListProps {
  items: MonitoringErrorItem[];
}

export function ErrorList({ items }: ErrorListProps): JSX.Element {
  if (items.length === 0) {
    return <p className="monitoring-empty">No recent errors were reported by diagnostics.</p>;
  }

  return (
    <div className="monitoring-list">
      {items.map((item) => (
        <div className="monitoring-list__item monitoring-list__item--error" key={item.id}>
          <div className="monitoring-list__title">{item.source.toUpperCase()}</div>
          <p className="monitoring-list__summary">{item.summary}</p>
        </div>
      ))}
    </div>
  );
}
