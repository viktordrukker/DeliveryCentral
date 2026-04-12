import { FormEvent, ReactNode } from 'react';

import {
  BulkAssignmentFormErrors,
  BulkAssignmentFormValues,
} from '@/features/assignments/useBulkAssignmentPage';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';

interface BulkAssignmentFormProps {
  errors: BulkAssignmentFormErrors;
  isSubmitting: boolean;
  onPersonToggle: (personId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onValueChange: (field: keyof BulkAssignmentFormValues, value: string) => void;
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  values: BulkAssignmentFormValues;
}

export function BulkAssignmentForm({
  errors,
  isSubmitting,
  onPersonToggle,
  onSubmit,
  onValueChange,
  people,
  projects,
  values,
}: BulkAssignmentFormProps): JSX.Element {
  return (
    <form className="entity-form" data-testid="bulk-assignment-form" onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <Field label="Requested By">
          <select
            aria-invalid={!!errors.actorId}
            className="field__control"
            onChange={(event) => onValueChange('actorId', event.target.value)}
            value={values.actorId}
          >
            <option value="">Select requester</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
          {errors.actorId ? <FieldError message={errors.actorId} /> : null}
        </Field>

        <Field label="Project">
          <select
            aria-invalid={!!errors.projectId}
            className="field__control"
            onChange={(event) => onValueChange('projectId', event.target.value)}
            value={values.projectId}
          >
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {errors.projectId ? <FieldError message={errors.projectId} /> : null}
        </Field>

        <Field label="Staffing Role">
          <input
            aria-invalid={!!errors.staffingRole}
            className="field__control"
            onChange={(event) => onValueChange('staffingRole', event.target.value)}
            type="text"
            value={values.staffingRole}
          />
          {errors.staffingRole ? <FieldError message={errors.staffingRole} /> : null}
        </Field>

        <Field label="Allocation Percent">
          <input
            aria-invalid={!!errors.allocationPercent}
            className="field__control"
            max="100"
            min="1"
            onChange={(event) => onValueChange('allocationPercent', event.target.value)}
            type="number"
            value={values.allocationPercent}
          />
          {errors.allocationPercent ? <FieldError message={errors.allocationPercent} /> : null}
        </Field>

        <Field label="Start Date">
          <input
            aria-invalid={!!errors.startDate}
            className="field__control"
            onChange={(event) => onValueChange('startDate', event.target.value)}
            type="date"
            value={values.startDate}
          />
          {errors.startDate ? <FieldError message={errors.startDate} /> : null}
        </Field>

        <Field label="End Date">
          <input
            aria-invalid={!!errors.endDate}
            className="field__control"
            onChange={(event) => onValueChange('endDate', event.target.value)}
            type="date"
            value={values.endDate}
          />
          {errors.endDate ? <FieldError message={errors.endDate} /> : null}
        </Field>
      </div>

      <Field label="Batch Note">
        <textarea
          className="field__control field__control--textarea"
          onChange={(event) => onValueChange('note', event.target.value)}
          rows={4}
          value={values.note}
        />
      </Field>

      <div className="field">
        <div className="field__label">Employees</div>
        <div className="bulk-selector">
          {people.map((person) => {
            const checked = values.personIds.includes(person.id);

            return (
              <label className="bulk-selector__item" key={person.id}>
                <input
                  aria-label={person.displayName}
                  checked={checked}
                  onChange={() => onPersonToggle(person.id)}
                  type="checkbox"
                />
                <div className="bulk-selector__content">
                  <span className="dictionary-list__title">{person.displayName}</span>
                  <span className="dictionary-list__meta">
                    {person.currentOrgUnit?.name ?? 'No org unit'} |{' '}
                    {person.primaryEmail ?? 'No email'}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
        {errors.personIds ? <FieldError message={errors.personIds} /> : null}
      </div>

      <div className="entity-form__actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Submitting batch...' : 'Submit bulk assignment'}
        </button>
      </div>
    </form>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }): JSX.Element {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}

function FieldError({ message }: { message: string }): JSX.Element {
  return <span className="field__error">{message}</span>;
}
