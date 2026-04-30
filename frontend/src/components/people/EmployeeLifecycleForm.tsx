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
  skillsets: string[];
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
  skillsetOptions: SelectOption[];
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
  skillsetOptions,
  values,
}: EmployeeLifecycleFormProps): JSX.Element {
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

        {skillsetOptions.length > 0 ? (
          <fieldset className="field field--full">
            <legend className="field__label">Skillsets</legend>
            <div className="bulk-selector">
              {skillsetOptions.map((option) => {
                const isSelected = values.skillsets.includes(option.value);

                return (
                  <label className="bulk-selector__item" key={option.value}>
                    <input
                      checked={isSelected}
                      onChange={(event) =>
                        onChange(
                          'skillsets',
                          event.target.checked
                            ? [...values.skillsets, option.value]
                            : values.skillsets.filter((item) => item !== option.value),
                        )
                      }
                      type="checkbox"
                    />
                    <span className="bulk-selector__content">
                      <strong>{option.label}</strong>
                      <span className="dictionary-editor__copy">{option.value}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ) : null}
      </div>

      <div className="entity-form__actions">
        <Button variant="primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating employee...' : 'Create employee'}
        </Button>
      </div>
    </form>
  );
}
