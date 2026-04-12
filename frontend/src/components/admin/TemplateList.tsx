import { NotificationTemplate } from '@/lib/api/notifications';

interface TemplateListProps {
  items: NotificationTemplate[];
  onSelect: (templateKey: string) => void;
  selectedKey: string | null;
}

export function TemplateList({
  items,
  onSelect,
  selectedKey,
}: TemplateListProps): JSX.Element {
  return (
    <div className="dictionary-list">
      {items.map((item) => (
        <button
          className={`dictionary-list__item${
            item.templateKey === selectedKey ? ' dictionary-list__item--active' : ''
          }`}
          key={item.templateKey}
          onClick={() => onSelect(item.templateKey)}
          type="button"
        >
          <div className="dictionary-list__header">
            <span className="dictionary-list__title">{item.displayName}</span>
            <span className="dictionary-list__count">{item.channelKey}</span>
          </div>
          <p className="dictionary-list__meta">{item.eventName}</p>
        </button>
      ))}
    </div>
  );
}
