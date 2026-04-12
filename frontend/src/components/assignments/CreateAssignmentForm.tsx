import { FormEvent, ReactNode } from 'react';

import {
  CreateAssignmentFormErrors,
  CreateAssignmentFormValues,
} from '@/features/assignments/useCreateAssignmentPage';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';

interface CreateAssignmentFormProps {
  errors: CreateAssignmentFormErrors;
  isSubmitting: boolean;
  onChange: (field: keyof CreateAssignmentFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  values: CreateAssignmentFormValues;
}

export function CreateAssignmentForm({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  people,
  projects,
  values,
}: CreateAssignmentFormProps): JSX.Element {
  return (
    <form className="entity-form" data-testid="create-assignment-form" onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <Field label="Requested By">
          <select
            aria-invalid={!!errors.actorId}
            className="field__control"
            name="actorId"
            onChange={(event) => onChange('actorId', event.target.value)}
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

        <Field label="Person">
          <select
            aria-invalid={!!errors.personId}
            className="field__control"
            name="personId"
            onChange={(event) => onChange('personId', event.target.value)}
            value={values.personId}
          >
            <option value="">Select person</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
          {errors.personId ? <FieldError message={errors.personId} /> : null}
        </Field>

        <Field label="Project">
          <select
            aria-invalid={!!errors.projectId}
            className="field__control"
            name="projectId"
            onChange={(event) => onChange('projectId', event.target.value)}
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
            name="staffingRole"
            onChange={(event) => onChange('staffingRole', event.target.value)}
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
            name="allocationPercent"
            onChange={(event) => onChange('allocationPercent', event.target.value)}
            type="number"
            value={values.allocationPercent}
          />
          {errors.allocationPercent ? <FieldError message={errors.allocationPercent} /> : null}
        </Field>

        <Field label="Start Date">
          <input
            aria-invalid={!!errors.startDate}
            className="field__control"
            name="startDate"
            onChange={(event) => onChange('startDate', event.target.value)}
            type="date"
            value={values.startDate}
          />
          {errors.startDate ? <FieldError message={errors.startDate} /> : null}
        </Field>

        <Field label="End Date">
          <input
            aria-invalid={!!errors.endDate}
            className="field__control"
            name="endDate"
            onChange={(event) => onChange('endDate', event.target.value)}
            type="date"
            value={values.endDate}
          />
          {errors.endDate ? <FieldError message={errors.endDate} /> : null}
        </Field>
      </div>

      <Field label="Note">
        <textarea
          className="field__control field__control--textarea"
          name="note"
          onChange={(event) => onChange('note', event.target.value)}
          rows={4}
          value={values.note}
        />
      </Field>

      <div className="entity-form__actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Submitting...' : 'Create Assignment'}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  children: ReactNode;
  label: string;
}

function Field({ children, label }: FieldProps): JSX.Element {
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
