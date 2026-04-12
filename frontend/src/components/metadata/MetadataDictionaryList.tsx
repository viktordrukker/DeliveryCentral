import { MetadataDictionarySummary } from '@/lib/api/metadata';

interface MetadataDictionaryListProps {
  items: MetadataDictionarySummary[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function MetadataDictionaryList({
  items,
  onSelect,
  selectedId,
}: MetadataDictionaryListProps): JSX.Element {
  return (
    <div className="metadata-list" role="list">
      {items.map((item) => (
        <button
          className={`metadata-list__item${item.id === selectedId ? ' metadata-list__item--active' : ''}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <div className="metadata-list__header">
            <div>
              <div className="metadata-list__title">{item.displayName}</div>
              <div className="metadata-list__meta">{item.entityType} · {item.dictionaryKey}</div>
            </div>
            <span className="scope-card__count">{item.enabledEntryCount}</span>
          </div>
          <p className="metadata-list__description">{item.description ?? 'No description provided.'}</p>
          <div className="metadata-list__footer">
            <span>{item.entryCount} entries</span>
            <span>{item.relatedCustomFieldCount} fields</span>
            <span>{item.workflowUsageCount} workflows</span>
          </div>
        </button>
      ))}
    </div>
  );
}
