import { useEffect, useState } from 'react';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { FormField, Select } from '@/components/ds';

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

/**
 * Phase DS-3-3 — public API unchanged. Internally now composes
 * <FormField> + the DS <Select> atom (token-driven, mobile-friendly,
 * theme-aware). Native <select required> semantics preserved so HTML5
 * form validation still fires; switching to <Combobox> (typeahead) is
 * a follow-up gated on consumers being OK with the UX change.
 */
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
    <FormField label={label} required={required} id={id}>
      {(props) => (
        <Select
          disabled={isLoading}
          onChange={(event) => onChange(event.target.value)}
          required={required}
          value={value}
          {...props}
        >
          <option value="">{isLoading ? 'Loading…' : 'Select a person…'}</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </Select>
      )}
    </FormField>
  );
}
