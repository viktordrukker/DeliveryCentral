import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  CreateAssignmentFormErrors,
  CreateAssignmentFormValues,
} from '@/features/assignments/useCreateAssignmentPage';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { STAFFING_ROLES } from '@/lib/staffing-roles';

interface CreateAssignmentFormProps {
  errors: CreateAssignmentFormErrors;
  isSubmitting: boolean;
  onChange: (field: keyof CreateAssignmentFormValues, value: string) => void;
  onSubmit: () => void;
  onSubmitDraft: () => void;
  people: PersonDirectoryItem[];
  principalPersonId?: string;
  projects: ProjectDirectoryItem[];
  values: CreateAssignmentFormValues;
}

export function CreateAssignmentForm({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  onSubmitDraft,
  people,
  principalPersonId,
  projects,
  values,
}: CreateAssignmentFormProps): JSX.Element {
  return (
    <div className="entity-form" data-testid="create-assignment-form">
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
                {person.displayName}{person.id === principalPersonId ? ' (You)' : ''}
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
                {person.displayName} — {person.grade ?? 'No grade'} · {person.lifecycleStatus}
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
                {project.name} ({project.projectCode}) — {project.clientName ?? 'Internal'}
              </option>
            ))}
          </select>
          {errors.projectId ? <FieldError message={errors.projectId} /> : null}
        </Field>

        <Field label="Staffing Role">
          <select
            aria-invalid={!!errors.staffingRole}
            className="field__control"
            name="staffingRole"
            onChange={(event) => onChange('staffingRole', event.target.value)}
            value={values.staffingRole}
          >
            <option value="">Select a role...</option>
            {STAFFING_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
            <option value="__custom__">Other (custom)</option>
          </select>
          {errors.staffingRole ? <FieldError message={errors.staffingRole} /> : null}
        </Field>

        {values.staffingRole === '__custom__' ? (
          <Field label="Custom Role">
            <input
              aria-invalid={!!errors.customRole}
              className="field__control"
              name="customRole"
              onChange={(event) => onChange('customRole', event.target.value)}
              placeholder="Enter custom role"
              type="text"
              value={values.customRole}
            />
            {errors.customRole ? <FieldError message={errors.customRole} /> : null}
          </Field>
        ) : null}

        <Field label="Allocation Percent">
          <input
            aria-invalid={!!errors.allocationPercent}
            className="field__control"
            max="100"
            min="1"
            name="allocationPercent"
            onChange={(event) => onChange('allocationPercent', event.target.value)}
            step="any"
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
          placeholder="Optional context for this assignment"
          rows={3}
          value={values.note}
        />
      </Field>

      <div className="entity-form__actions entity-form__actions--split">
        <Link className="button button--secondary" to="/assignments">Cancel</Link>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="button button--secondary"
            disabled={isSubmitting}
            onClick={(e) => { e.preventDefault(); onSubmitDraft(); }}
            type="button"
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            className="button"
            disabled={isSubmitting}
            onClick={(e) => { e.preventDefault(); onSubmit(); }}
            type="button"
          >
            {isSubmitting ? 'Creating...' : 'Create & Request'}
          </button>
        </div>
      </div>
    </div>
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
