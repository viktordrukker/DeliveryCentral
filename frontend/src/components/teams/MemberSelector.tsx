import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { TeamMember } from '@/lib/api/teams';
import { Button } from '@/components/ds';

interface MemberSelectorProps {
  isSubmitting: boolean;
  members: TeamMember[];
  onAdd: (personId: string) => Promise<void>;
  people: PersonDirectoryItem[];
}

export function MemberSelector({
  isSubmitting,
  members,
  onAdd,
  people,
}: MemberSelectorProps): JSX.Element {
  const memberIds = new Set(members.map((item) => item.id));
  const availablePeople = people.filter((person) => !memberIds.has(person.id));

  if (availablePeople.length === 0) {
    return <p className="dictionary-editor__copy">No additional people are available to add.</p>;
  }

  return (
    <div className="member-selector">
      {availablePeople.map((person) => (
        <div className="member-selector__item" key={person.id}>
          <div>
            <div className="dictionary-list__title">{person.displayName}</div>
            <div className="dictionary-list__meta">
              {person.currentOrgUnit?.name ?? 'No org unit'} | {person.primaryEmail ?? 'No email'}
            </div>
          </div>
          <Button variant="secondary" disabled={isSubmitting} onClick={() => void onAdd(person.id)} type="button">
            Add member
          </Button>
        </div>
      ))}
    </div>
  );
}

