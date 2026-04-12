import { FormEvent } from 'react';

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
          <input
            className="field__control"
            onChange={(event) => onChange('occurredAfter', event.target.value)}
            type="date"
            value={values.occurredAfter}
          />
        </label>

        <label className="field">
          <span className="field__label">Occurred Before</span>
          <input
            className="field__control"
            onChange={(event) => onChange('occurredBefore', event.target.value)}
            type="date"
            value={values.occurredBefore}
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
        <button className="button button--secondary" onClick={onReset} type="button">
          Reset filters
        </button>
        <button className="button" disabled={isLoading} type="submit">
          {isLoading ? 'Loading audit records...' : 'Apply filters'}
        </button>
      </div>
    </form>
  );
}
