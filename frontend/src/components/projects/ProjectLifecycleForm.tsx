import { FormEvent } from 'react';

interface SelectOption {
  label: string;
  value: string;
}

export interface ProjectLifecycleFormValues {
  description: string;
  name: string;
  plannedEndDate: string;
  projectManagerId: string;
  startDate: string;
}

interface ProjectLifecycleFormProps {
  errors: Partial<Record<keyof ProjectLifecycleFormValues, string>>;
  isSubmitting: boolean;
  managerOptions: SelectOption[];
  onChange: (field: keyof ProjectLifecycleFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  values: ProjectLifecycleFormValues;
}

export function ProjectLifecycleForm({
  errors,
  isSubmitting,
  managerOptions,
  onChange,
  onSubmit,
  values,
}: ProjectLifecycleFormProps): JSX.Element {
  return (
    <form className="entity-form" noValidate onSubmit={onSubmit}>
      <div className="entity-form__grid">
        <label className="field">
          <span className="field__label">Project Name</span>
          <input
            className="field__control"
            onChange={(event) => onChange('name', event.target.value)}
            type="text"
            value={values.name}
          />
          {errors.name ? <span className="field__error">{errors.name}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Project Manager</span>
          <select
            className="field__control"
            onChange={(event) => onChange('projectManagerId', event.target.value)}
            value={values.projectManagerId}
          >
            <option value="">Select project manager</option>
            {managerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.projectManagerId ? (
            <span className="field__error">{errors.projectManagerId}</span>
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
          <span className="field__label">Planned End Date</span>
          <input
            className="field__control"
            onChange={(event) => onChange('plannedEndDate', event.target.value)}
            type="date"
            value={values.plannedEndDate}
          />
          {errors.plannedEndDate ? (
            <span className="field__error">{errors.plannedEndDate}</span>
          ) : null}
        </label>

        <label className="field field--full">
          <span className="field__label">Description</span>
          <textarea
            className="field__control field__control--textarea"
            onChange={(event) => onChange('description', event.target.value)}
            rows={5}
            value={values.description}
          />
        </label>
      </div>

      <div className="entity-form__actions">
        <button className="button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating project...' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
