import { MetadataDictionarySummary } from '@/lib/api/metadata';

interface DictionaryListProps {
  items: MetadataDictionarySummary[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function DictionaryList({
  items,
  onSelect,
  selectedId,
}: DictionaryListProps): JSX.Element {
  return (
    <div className="dictionary-list">
      {items.map((item) => (
        <button
          className={`dictionary-list__item${
            item.id === selectedId ? ' dictionary-list__item--active' : ''
          }`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <div className="dictionary-list__header">
            <span className="dictionary-list__title">{item.displayName}</span>
            <span className="dictionary-list__count">{item.entryCount}</span>
          </div>
          <p className="dictionary-list__meta">{item.dictionaryKey}</p>
        </button>
      ))}
    </div>
  );
}
