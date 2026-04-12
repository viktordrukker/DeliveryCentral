interface AdminListMetric {
  label: string;
  value: string;
}

export interface AdminListItem {
  id: string;
  title: string;
  description?: string;
  metrics?: AdminListMetric[];
}

interface AdminListProps {
  emptyMessage: string;
  items: AdminListItem[];
}

export function AdminList({ emptyMessage, items }: AdminListProps): JSX.Element {
  if (items.length === 0) {
    return <p className="admin-list__empty">{emptyMessage}</p>;
  }

  return (
    <div className="admin-list">
      {items.map((item) => (
        <article className="admin-list__item" key={item.id}>
          <div className="admin-list__content">
            <div className="admin-list__title">{item.title}</div>
            {item.description ? <p className="admin-list__description">{item.description}</p> : null}
          </div>
          {item.metrics?.length ? (
            <dl className="admin-list__metrics">
              {item.metrics.map((metric) => (
                <div className="admin-list__metric" key={`${item.id}-${metric.label}`}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </article>
      ))}
    </div>
  );
}
