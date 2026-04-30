import { FormEvent } from 'react';

import { PersonDirectoryItem } from '@/lib/api/person-directory';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';
import { Button } from '@/components/ds';

export interface CreateWorkEvidenceFormValues {
  effortHours: string;
  personId: string;
  projectId: string;
  recordedAt: string;
  sourceRecordKey: string;
  sourceType: string;
  summary: string;
}

export interface CreateWorkEvidenceFormErrors {
  effortHours?: string;
  recordedAt?: string;
  sourceRecordKey?: string;
  sourceType?: string;
}

interface CreateWorkEvidenceFormProps {
  errors: CreateWorkEvidenceFormErrors;
  isSubmitting: boolean;
  onChange: (field: keyof CreateWorkEvidenceFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  people: PersonDirectoryItem[];
  projects: ProjectDirectoryItem[];
  values: CreateWorkEvidenceFormValues;
}

export function CreateWorkEvidenceForm({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  people,
  projects,
  values,
}: CreateWorkEvidenceFormProps): JSX.Element {
  return (
    <form className="entity-form" data-testid="create-work-evidence-form" onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <label className="field">
          <span className="field__label">Person</span>
          <select
            className="field__control"
            name="personId"
            onChange={(event) => onChange('personId', event.target.value)}
            value={values.personId}
          >
            <option value="">Optional person</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.displayName}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Project</span>
          <select
            className="field__control"
            name="projectId"
            onChange={(event) => onChange('projectId', event.target.value)}
            value={values.projectId}
          >
            <option value="">Optional project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Source Type</span>
          <input
            className="field__control"
            name="sourceType"
            onChange={(event) => onChange('sourceType', event.target.value)}
            placeholder="Example: MANUAL or JIRA_WORKLOG"
            type="text"
            value={values.sourceType}
          />
          {errors.sourceType ? <span className="field__error">{errors.sourceType}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Source Record Key</span>
          <input
            className="field__control"
            name="sourceRecordKey"
            onChange={(event) => onChange('sourceRecordKey', event.target.value)}
            type="text"
            value={values.sourceRecordKey}
          />
          {errors.sourceRecordKey ? <span className="field__error">{errors.sourceRecordKey}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Recorded At</span>
          <input
            className="field__control"
            name="recordedAt"
            onChange={(event) => onChange('recordedAt', event.target.value)}
            type="datetime-local"
            value={values.recordedAt}
          />
          {errors.recordedAt ? <span className="field__error">{errors.recordedAt}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Effort Hours</span>
          <input
            className="field__control"
            min="0.25"
            name="effortHours"
            onChange={(event) => onChange('effortHours', event.target.value)}
            step="0.25"
            type="number"
            value={values.effortHours}
          />
          {errors.effortHours ? <span className="field__error">{errors.effortHours}</span> : null}
        </label>
      </div>

      <label className="field">
        <span className="field__label">Summary</span>
        <textarea
          className="field__control field__control--textarea"
          name="summary"
          onChange={(event) => onChange('summary', event.target.value)}
          rows={3}
          value={values.summary}
        />
      </label>

      <div className="entity-form__actions">
        <Button variant="primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Submitting...' : 'Record work evidence'}
        </Button>
      </div>
    </form>
  );
}
