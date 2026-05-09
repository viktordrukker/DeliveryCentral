import { FormEvent } from 'react';
import { Button, DatePicker } from '@/components/ds';

export interface EmployeeLifecycleFormValues {
  email: string;
  grade: string;
  hireDate: string;
  jobTitle: string;
  lineManagerId: string;
  location: string;
  name: string;
  orgUnitId: string;
  role: string;
  /**
   * Skill UUIDs picked from the central Skill catalog (`/api/admin/skills`).
   * Persisted as `PersonSkill` rows after the employee is created (proficiency
   * defaults to 3, certified=false). Replaces the legacy `skillsets` free-text
   * categories that were silently dropped on read (D-30/D-46).
   */
  skillIds: string[];
}

interface SelectOption {
  label: string;
  meta?: string;
  value: string;
}

interface EmployeeLifecycleFormProps {
  errors: Partial<Record<keyof EmployeeLifecycleFormValues, string>>;
  gradeOptions: SelectOption[];
  isSubmitting: boolean;
  managerOptions: SelectOption[];
  onChange: (field: keyof EmployeeLifecycleFormValues, value: string | string[]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  orgUnitOptions: SelectOption[];
  roleOptions: SelectOption[];
  skillOptions: SelectOption[];
  values: EmployeeLifecycleFormValues;
}

export function EmployeeLifecycleForm({
  errors,
  gradeOptions,
  isSubmitting,
  managerOptions,
  onChange,
  onSubmit,
  orgUnitOptions,
  roleOptions,
  skillOptions,
  values,
}: EmployeeLifecycleFormProps): JSX.Element {
  function handleAddSkill(skillId: string): void {
    if (!skillId || values.skillIds.includes(skillId)) return;
    onChange('skillIds', [...values.skillIds, skillId]);
  }

  function handleRemoveSkill(skillId: string): void {
    onChange(
      'skillIds',
      values.skillIds.filter((id) => id !== skillId),
    );
  }

  const skillById = new Map(skillOptions.map((option) => [option.value, option]));
  const availableOptions = skillOptions.filter((option) => !values.skillIds.includes(option.value));

  return (
    <form className="entity-form" noValidate onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <label className="field">
          <span className="field__label">Name</span>
          <input
            className="field__control"
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="Employee name"
            type="text"
            value={values.name}
          />
          {errors.name ? <span className="field__error">{errors.name}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Email</span>
          <input
            className="field__control"
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="name@example.com"
            type="email"
            value={values.email}
          />
          {errors.email ? <span className="field__error">{errors.email}</span> : null}
        </label>

        <label className="field field--full">
          <span className="field__label">Org Unit</span>
          <select
            aria-label="Org Unit"
            className="field__control"
            onChange={(event) => onChange('orgUnitId', event.target.value)}
            value={values.orgUnitId}
          >
            <option value="">Select an org unit</option>
            {orgUnitOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}{option.meta ? ` (${option.meta})` : ''}
              </option>
            ))}
          </select>
          {errors.orgUnitId ? <span className="field__error">{errors.orgUnitId}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Grade</span>
          <select
            aria-label="Grade"
            className="field__control"
            onChange={(event) => onChange('grade', event.target.value)}
            value={values.grade}
          >
            <option value="">No grade</option>
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Role</span>
          <select
            aria-label="Role"
            className="field__control"
            onChange={(event) => onChange('role', event.target.value)}
            value={values.role}
          >
            <option value="">No role</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field__label">Job Title</span>
          <input
            className="field__control"
            onChange={(event) => onChange('jobTitle', event.target.value)}
            placeholder="e.g. Senior Consultant"
            type="text"
            value={values.jobTitle}
          />
        </label>

        <label className="field">
          <span className="field__label">Hire Date</span>
          <DatePicker onValueChange={(value) => onChange('hireDate', value)} value={values.hireDate}
 />
        </label>

        <label className="field">
          <span className="field__label">Location</span>
          <input
            className="field__control"
            onChange={(event) => onChange('location', event.target.value)}
            placeholder="e.g. London, UK"
            type="text"
            value={values.location}
          />
        </label>

        <label className="field">
          <span className="field__label">Line Manager</span>
          <select
            aria-label="Line Manager"
            className="field__control"
            onChange={(event) => onChange('lineManagerId', event.target.value)}
            value={values.lineManagerId}
          >
            <option value="">No line manager</option>
            {managerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="field field--full">
          <legend className="field__label">Skills</legend>
          <div style={{ marginBottom: '8px' }}>
            <select
              aria-label="Add skill"
              className="field__control"
              data-testid="skill-selector"
              onChange={(event) => {
                handleAddSkill(event.target.value);
                event.target.value = '';
              }}
              style={{ maxWidth: '320px' }}
              value=""
            >
              <option value="">— add a skill from the catalog —</option>
              {availableOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}{option.meta ? ` (${option.meta})` : ''}
                </option>
              ))}
            </select>
            <p className="field__help" style={{ marginTop: '4px' }}>
              Pick from the catalog. Custom names are not allowed (prevents data drift).
              Skills save at proficiency 3 (Advanced), not certified — refine in the Skills tab after creation.
            </p>
          </div>
          {values.skillIds.length === 0 ? (
            <p className="field__help" data-testid="skill-empty">No skills selected yet.</p>
          ) : (
            <ul className="chip-list" data-testid="skill-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', listStyle: 'none', margin: 0, padding: 0 }}>
              {values.skillIds.map((skillId) => {
                const option = skillById.get(skillId);
                return (
                  <li key={skillId} style={{ alignItems: 'center', background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', borderRadius: '12px', display: 'inline-flex', gap: '6px', padding: '4px 8px 4px 12px' }}>
                    <span>{option?.label ?? skillId}</span>
                    <Button
                      data-testid={`remove-skill-${skillId}`}
                      onClick={() => handleRemoveSkill(skillId)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Remove
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      </div>

      <div className="entity-form__actions">
        <Button variant="primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating employee...' : 'Create employee'}
        </Button>
      </div>
    </form>
  );
}
