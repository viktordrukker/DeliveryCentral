import { FormEvent } from 'react';

import { initialDictionaryEntryFormValues } from '@/features/admin/useDictionaryAdmin';

export type DictionaryEntryFormValues = typeof initialDictionaryEntryFormValues;

interface DictionaryEntryFormProps {
  isSubmitting: boolean;
  onChange: (field: keyof DictionaryEntryFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  values: DictionaryEntryFormValues;
}

export function DictionaryEntryForm({
  isSubmitting,
  onChange,
  onSubmit,
  values,
}: DictionaryEntryFormProps): JSX.Element {
  return (
    <form className="dictionary-entry-form" onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <label className="field">
          <span className="field__label">Display Name</span>
          <input
            className="field__control"
            onChange={(event) => onChange('displayName', event.target.value)}
            placeholder="Example: Senior Consultant"
            type="text"
            value={values.displayName}
          />
        </label>

        <label className="field">
          <span className="field__label">Entry Key</span>
          <input
            className="field__control"
            onChange={(event) => onChange('entryKey', event.target.value)}
            placeholder="example-key"
            type="text"
            value={values.entryKey}
          />
        </label>

        <label className="field">
          <span className="field__label">Entry Value</span>
          <input
            className="field__control"
            onChange={(event) => onChange('entryValue', event.target.value)}
            placeholder="EXAMPLE_VALUE"
            type="text"
            value={values.entryValue}
          />
        </label>

        <label className="field">
          <span className="field__label">Sort Order</span>
          <input
            className="field__control"
            min="1"
            onChange={(event) => onChange('sortOrder', event.target.value)}
            placeholder="Optional"
            type="number"
            value={values.sortOrder}
          />
        </label>
      </div>

      <div className="entity-form__actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating...' : 'Add entry'}
        </button>
      </div>
    </form>
  );
}
