import { FormEvent } from 'react';
import { Button, DatePicker } from '@/components/ds';

export interface BusinessAuditFilterValues {
  actionType: string;
  actorId: string;
  occurredAfter: string;
  occurredBefore: string;
  targetEntityId: string;
  targetEntityType: string;
}

interface BusinessAuditFiltersProps {
  isLoading: boolean;
  limit: string;
  onChange: (field: keyof BusinessAuditFilterValues, value: string) => void;
  onLimitChange: (value: string) => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  values: BusinessAuditFilterValues;
}

export function BusinessAuditFilters({
  isLoading,
  limit,
  onChange,
  onLimitChange,
  onReset,
  onSubmit,
  values,
}: BusinessAuditFiltersProps): JSX.Element {
  return (
    <form className="entity-form" onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <label className="field">
          <span className="field__label">Entity Type</span>
          <input
            className="field__control"
            onChange={(event) => onChange('targetEntityType', event.target.value)}
            placeholder="Example: project"
            type="text"
            value={values.targetEntityType}
          />
        </label>

        <label className="field">
          <span className="field__label">Entity Id</span>
          <input
            className="field__control"
            onChange={(event) => onChange('targetEntityId', event.target.value)}
            placeholder="Exact business object id"
            type="text"
            value={values.targetEntityId}
          />
        </label>

        <label className="field">
          <span className="field__label">Actor</span>
          <input
            className="field__control"
            onChange={(event) => onChange('actorId', event.target.value)}
            placeholder="Actor id"
            type="text"
            value={values.actorId}
          />
        </label>

        <label className="field">
          <span className="field__label">Action Type</span>
          <input
            className="field__control"
            onChange={(event) => onChange('actionType', event.target.value)}
            placeholder="Example: project.closed"
            type="text"
            value={values.actionType}
          />
        </label>

        <label className="field">
          <span className="field__label">Occurred After</span>
          <DatePicker onValueChange={(value) => onChange('occurredAfter', value)} value={values.occurredAfter}
 />
        </label>

        <label className="field">
          <span className="field__label">Occurred Before</span>
          <DatePicker onValueChange={(value) => onChange('occurredBefore', value)} value={values.occurredBefore}
 />
        </label>

        <label className="field">
          <span className="field__label">Limit</span>
          <input
            className="field__control"
            min="1"
            onChange={(event) => onLimitChange(event.target.value)}
            step="1"
            type="number"
            value={limit}
          />
        </label>
      </div>

      <div className="entity-form__actions entity-form__actions--split">
        <Button variant="secondary" onClick={onReset} type="button">
          Reset filters
        </Button>
        <Button variant="primary" disabled={isLoading} type="submit">
          {isLoading ? 'Loading audit records...' : 'Apply filters'}
        </Button>
      </div>
    </form>
  );
}
