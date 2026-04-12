import { FormEvent } from 'react';

import { AssignmentDirectoryItem } from '@/lib/api/assignments';
import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';

export interface CaseFormValues {
  caseTypeKey: string;
  ownerPersonId: string;
  relatedAssignmentId: string;
  relatedProjectId: string;
  subjectPersonId: string;
  summary: string;
}

const CASE_TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Onboarding', value: 'ONBOARDING' },
  { label: 'Offboarding', value: 'OFFBOARDING' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Performance Review', value: 'PERFORMANCE' },
];

interface CaseFormProps {
  assignments: AssignmentDirectoryItem[];
  errors: Partial<Record<keyof CaseFormValues, string>>;
  isSubmitting: boolean;
  onChange: (field: keyof CaseFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  values: CaseFormValues;
}

export function CaseForm({
  assignments,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  people,
  projects,
  values,
}: CaseFormProps): JSX.Element {
  return (
    <form className="entity-form" noValidate onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <label className="field">
          <span className="field__label">Case Type</span>
          <select
            aria-label="Case Type"
            className="field__control"
            onChange={(event) => onChange('caseTypeKey', event.target.value)}
            value={values.caseTypeKey}
          >
            {CASE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Subject Person</span>
          <select
            aria-invalid={!!errors.subjectPersonId}
            className="field__control"
            onChange={(event) => onChange('subjectPersonId', event.target.value)}
            value={values.subjectPersonId}
          >
            <option value="">Select subject person</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
          {errors.subjectPersonId ? (
            <span className="field__error">{errors.subjectPersonId}</span>
          ) : null}
        </label>

        <label className="field">
          <span className="field__label">Owner</span>
          <select
            aria-invalid={!!errors.ownerPersonId}
            className="field__control"
            onChange={(event) => onChange('ownerPersonId', event.target.value)}
            value={values.ownerPersonId}
          >
            <option value="">Select owner</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
          {errors.ownerPersonId ? (
            <span className="field__error">{errors.ownerPersonId}</span>
          ) : null}
        </label>

        <label className="field">
          <span className="field__label">Related Project</span>
          <select
            className="field__control"
            onChange={(event) => onChange('relatedProjectId', event.target.value)}
            value={values.relatedProjectId}
          >
            <option value="">Optional project context</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Related Assignment</span>
          <select
            className="field__control"
            onChange={(event) => onChange('relatedAssignmentId', event.target.value)}
            value={values.relatedAssignmentId}
          >
            <option value="">Optional assignment context</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {`${assignment.person.displayName} -> ${assignment.project.displayName}`}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--full">
          <span className="field__label">Summary</span>
          <textarea
            className="field__control field__control--textarea"
            onChange={(event) => onChange('summary', event.target.value)}
            placeholder="Describe the onboarding or governance follow-up."
            value={values.summary}
          />
        </label>
      </div>

      <div className="entity-form__actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating case...' : 'Create case'}
        </button>
      </div>
    </form>
  );
}
