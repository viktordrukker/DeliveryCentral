import { FormEvent } from 'react';

import { PersonSelect } from '@/components/common/PersonSelect';

interface SelectOption {
  label: string;
  meta?: string;
  value: string;
}

export interface ProjectTeamAssignmentFormValues {
  actorId: string;
  allocationPercent: string;
  endDate: string;
  note: string;
  staffingRole: string;
  startDate: string;
  teamId: string;
}

interface ProjectTeamAssignmentFormProps {
  errors: Partial<Record<keyof ProjectTeamAssignmentFormValues, string>>;
  isSubmitting: boolean;
  onChange: (field: keyof ProjectTeamAssignmentFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  teamOptions: SelectOption[];
  values: ProjectTeamAssignmentFormValues;
}

export function ProjectTeamAssignmentForm({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  teamOptions,
  values,
}: ProjectTeamAssignmentFormProps): JSX.Element {
  return (
    <form className="entity-form" noValidate onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <div className="field">
          <PersonSelect
            label="Workflow Actor"
            onChange={(value) => onChange('actorId', value)}
            value={values.actorId}
          />
          {errors.actorId ? <span className="field__error">{errors.actorId}</span> : null}
        </div>

        <label className="field">
          <span className="field__label">Team</span>
          <select
            className="field__control"
            onChange={(event) => onChange('teamId', event.target.value)}
            value={values.teamId}
          >
            <option value="">Select team</option>
            {teamOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.meta ? `${option.label} (${option.meta})` : option.label}
              </option>
            ))}
          </select>
          {errors.teamId ? <span className="field__error">{errors.teamId}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Staffing Role</span>
          <input
            className="field__control"
            onChange={(event) => onChange('staffingRole', event.target.value)}
            type="text"
            value={values.staffingRole}
          />
          {errors.staffingRole ? <span className="field__error">{errors.staffingRole}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Allocation Percent</span>
          <input
            className="field__control"
            onChange={(event) => onChange('allocationPercent', event.target.value)}
            type="number"
            value={values.allocationPercent}
          />
          {errors.allocationPercent ? (
            <span className="field__error">{errors.allocationPercent}</span>
          ) : null}
        </label>

        <label className="field">
          <span className="field__label">Start Date</span>
          <input
            className="field__control"
            onChange={(event) => onChange('startDate', event.target.value)}
            type="date"
            value={values.startDate}
          />
          {errors.startDate ? <span className="field__error">{errors.startDate}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">End Date</span>
          <input
            className="field__control"
            onChange={(event) => onChange('endDate', event.target.value)}
            type="date"
            value={values.endDate}
          />
          {errors.endDate ? <span className="field__error">{errors.endDate}</span> : null}
        </label>

        <label className="field field--full">
          <span className="field__label">Note</span>
          <textarea
            className="field__control field__control--textarea"
            onChange={(event) => onChange('note', event.target.value)}
            rows={4}
            value={values.note}
          />
        </label>
      </div>

      <div className="entity-form__actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Assigning team...' : 'Assign team'}
        </button>
      </div>
    </form>
  );
}
