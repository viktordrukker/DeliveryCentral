import { useEffect, useState } from 'react';

import { fetchPersonDirectory } from '@/lib/api/person-directory';

interface PersonSelectProps {
  id?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  roleFilter?: string[];
  value: string;
}

interface PersonOption {
  displayName: string;
  id: string;
}

export function PersonSelect({
  id,
  label,
  onChange,
  required,
  value,
}: PersonSelectProps): JSX.Element {
  const [people, setPeople] = useState<PersonOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    void fetchPersonDirectory({ page: 1, pageSize: 200 })
      .then((response) => {
        if (!active) return;
        setPeople(
          response.items.map((item) => ({
            displayName: item.displayName,
            id: item.id,
          })),
        );
      })
      .catch(() => {
        // silently ignore; user can still type a UUID
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select
        className="field__control"
        disabled={isLoading}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        <option value="">{isLoading ? 'Loading…' : 'Select a person…'}</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}
