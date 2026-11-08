import { useEffect, useState } from 'react';

import { fetchPersonDirectory } from '@/lib/api/person-directory';
import { FormField, Select } from '@/components/ds';

interface PersonOption {
  displayName: string;
  id: string;
}

interface PersonSelectProps {
  id?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  roleFilter?: string[];
  value: string;
  /**
   * Optional caller-supplied people list. When provided, the internal
   * `fetchPersonDirectory` call is skipped — consumers like dashboard
   * title bars that already maintain a role-scoped people list pass it
   * straight through to avoid a duplicate network round-trip and to
   * preserve their server-side role filter.
   */
  people?: PersonOption[];
}

/**
 * Phase DS-3-3 — public API unchanged for default usage. Internally
 * composes <FormField> + the DS <Select> atom (token-driven,
 * mobile-friendly, theme-aware). Native <select required> semantics
 * preserved so HTML5 form validation still fires; switching to
 * <Combobox> (typeahead) is a follow-up gated on consumers being OK
 * with the UX change.
 *
 * W4-01 — added optional `people` prop so dashboard title bars (HR /
 * PM / RM) can replace the legacy `<input>+<datalist>` typeahead with
 * the DS primitive while keeping their pre-fetched, role-filtered
 * people list.
 */
export function PersonSelect({
  id,
  label,
  onChange,
  required,
  value,
  people: peopleProp,
}: PersonSelectProps): JSX.Element {
  const [fetchedPeople, setFetchedPeople] = useState<PersonOption[]>([]);
  const [isLoading, setIsLoading] = useState(peopleProp === undefined);

  useEffect(() => {
    if (peopleProp !== undefined) return;
    let active = true;
    setIsLoading(true);

    void fetchPersonDirectory({ page: 1, pageSize: 200 })
      .then((response) => {
        if (!active) return;
        setFetchedPeople(
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
  }, [peopleProp]);

  const people = peopleProp ?? fetchedPeople;

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
