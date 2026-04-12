import { MonitoringAlert } from '@/features/admin/useMonitoringAdmin';

interface AlertPanelProps {
  items: MonitoringAlert[];
}

export function AlertPanel({ items }: AlertPanelProps): JSX.Element {
  if (items.length === 0) {
    return <p className="monitoring-empty">No alerts are available.</p>;
  }

  return (
    <div className="monitoring-list">
      {items.map((item) => (
        <div className="monitoring-list__item" key={item.id}>
          <div className="monitoring-card__header">
            <div className="monitoring-list__title">{item.title}</div>
            <span className={`status-indicator status-indicator--${item.severity}`}>
              {item.severity}
            </span>
          </div>
          <p className="monitoring-list__summary">{item.summary}</p>
        </div>
      ))}
    </div>
  );
}
