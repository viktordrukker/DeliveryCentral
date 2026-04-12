import { DottedLineRelationship } from '@/lib/api/org-chart';

interface DottedLinePanelProps {
  items: DottedLineRelationship[];
}

export function DottedLinePanel({ items }: DottedLinePanelProps): JSX.Element {
  return (
    <div className="dotted-panel">
      {items.map((item) => (
        <article className="dotted-panel__item" key={item.person.id}>
          <div className="dotted-panel__title">{item.person.displayName}</div>
          <div className="dotted-panel__meta">
            {item.managers.map((manager) => manager.displayName).join(', ')}
          </div>
        </article>
      ))}
    </div>
  );
}
