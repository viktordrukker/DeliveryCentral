import { FormEvent } from 'react';
import { Button, DatePicker } from '@/components/ds';

interface SelectOption {
  label: string;
  meta?: string;
  value: string;
}

export interface ReportingLineFormValues {
  endDate: string;
  managerId: string;
  startDate: string;
  type: 'SOLID';
}

interface ReportingLineFormProps {
  currentManagerName?: string | null;
  errors: Partial<Record<keyof ReportingLineFormValues, string>>;
  isSubmitting: boolean;
  managerOptions: SelectOption[];
  onChange: (field: keyof ReportingLineFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  values: ReportingLineFormValues;
}

export function ReportingLineForm({
  currentManagerName,
  errors,
  isSubmitting,
  managerOptions,
  onChange,
  onSubmit,
  values,
}: ReportingLineFormProps): JSX.Element {
  return (
    <form className="entity-form" noValidate onSubmit={onSubmit}>
      <div className="reporting-line-panel">
        <div className="reporting-line-panel__summary">
          <span className="reporting-line-panel__label">Current solid-line manager</span>
          <strong>{currentManagerName ?? 'No line manager assigned'}</strong>
        </div>
      </div>

      <div className="entity-form__grid">
        <label className="field">
          <span className="field__label">Reporting Type</span>
          <select
            className="field__control"
            onChange={(event) => onChange('type', event.target.value)}
            value={values.type}
          >
            <option value="SOLID">Solid line</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Manager</span>
          <select
            aria-invalid={!!errors.managerId}
            className="field__control"
            onChange={(event) => onChange('managerId', event.target.value)}
            value={values.managerId}
          >
            <option value="">Select manager</option>
            {managerOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.meta ? `${option.label} (${option.meta})` : option.label}
              </option>
            ))}
          </select>
          {errors.managerId ? <span className="field__error">{errors.managerId}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">Start Date</span>
          <DatePicker
 aria-invalid={!!errors.startDate} onValueChange={(value) => onChange('startDate', value)} value={values.startDate}
 />
          {errors.startDate ? <span className="field__error">{errors.startDate}</span> : null}
        </label>

        <label className="field">
          <span className="field__label">End Date</span>
          <DatePicker
 aria-invalid={!!errors.endDate} onValueChange={(value) => onChange('endDate', value)} value={values.endDate}
 />
          {errors.endDate ? <span className="field__error">{errors.endDate}</span> : null}
        </label>
      </div>

      <div className="entity-form__actions">
        <Button variant="primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Saving reporting line...' : 'Save reporting line'}
        </Button>
      </div>
    </form>
  );
}
