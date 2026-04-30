import { TeamSummary } from '@/lib/api/teams';
import { Button } from '@/components/ds';

interface TeamListProps {
  items: TeamSummary[];
  onSelect: (id: string) => void;
  selectedId: string | null;
}

export function TeamList({ items, onSelect, selectedId }: TeamListProps): JSX.Element {
  return (
    <div className="dictionary-list">
      {items.map((item) => (
        <Button
          variant="secondary"
          className={`dictionary-list__item${
            item.id === selectedId ? ' dictionary-list__item--active' : ''
          }`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <div className="dictionary-list__header">
            <span className="dictionary-list__title">{item.name}</span>
            <span
              className="dictionary-list__count"
              style={item.memberCount === 0 ? { color: 'var(--color-text-muted)' } : undefined}
            >
              {item.memberCount === 0 ? 'No members' : item.memberCount}
            </span>
          </div>
          <p className="dictionary-list__meta">{item.code}</p>
        </Button>
      ))}
    </div>
  );
}
