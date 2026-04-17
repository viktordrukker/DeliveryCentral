import { FormEvent } from 'react';

import type { EngagementModel, ProjectPriority } from '@/lib/api/project-registry';

interface SelectOption {
  label: string;
  value: string;
}

export interface ProjectLifecycleFormValues {
  clientId: string;
  deliveryManagerId: string;
  description: string;
  domain: string;
  engagementModel: string;
  name: string;
  plannedEndDate: string;
  priority: string;
  projectManagerId: string;
  projectType: string;
  startDate: string;
  tags: string;
  techStack: string;
}

interface ProjectLifecycleFormProps {
  clientOptions: SelectOption[];
  errors: Partial<Record<keyof ProjectLifecycleFormValues, string>>;
  isSubmitting: boolean;
  managerOptions: SelectOption[];
  onChange: (field: keyof ProjectLifecycleFormValues, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  step: number;
  onStepChange: (step: number) => void;
  values: ProjectLifecycleFormValues;
}

const ENGAGEMENT_MODELS: Array<{ label: string; value: EngagementModel }> = [
  { label: 'Time & Material', value: 'TIME_AND_MATERIAL' },
  { label: 'Fixed Price', value: 'FIXED_PRICE' },
  { label: 'Managed Service', value: 'MANAGED_SERVICE' },
  { label: 'Internal', value: 'INTERNAL' },
];

const PRIORITIES: Array<{ label: string; value: ProjectPriority }> = [
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
];

const DOMAINS = ['Banking', 'Healthcare', 'Retail', 'Insurance', 'Telecom', 'Manufacturing', 'Government', 'Technology', 'Other'];

export function ProjectLifecycleForm({
  clientOptions,
  errors,
  isSubmitting,
  managerOptions,
  onChange,
  onSubmit,
  step,
  onStepChange,
  values,
}: ProjectLifecycleFormProps): JSX.Element {
  return (
    <form className="entity-form" noValidate onSubmit={onSubmit}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {['Basics', 'Engagement', 'Confirm'].map((label, i) => (
          <button
            key={label}
            type="button"
            className={`button button--sm ${step === i ? 'button--primary' : 'button--secondary'}`}
            onClick={() => onStepChange(i)}
            style={{ flex: 1 }}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {/* Step 1: Basics */}
      {step === 0 && (
        <div className="entity-form__grid">
          <label className="field">
            <span className="field__label">Project Name *</span>
            <input className="field__control" onChange={(e) => onChange('name', e.target.value)} type="text" value={values.name} />
            {errors.name ? <span className="field__error">{errors.name}</span> : null}
          </label>

          <label className="field">
            <span className="field__label">Project Manager *</span>
            <select className="field__control" onChange={(e) => onChange('projectManagerId', e.target.value)} value={values.projectManagerId}>
              <option value="">Select PM</option>
              {managerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {errors.projectManagerId ? <span className="field__error">{errors.projectManagerId}</span> : null}
          </label>

          <label className="field">
            <span className="field__label">Delivery Manager</span>
            <select className="field__control" onChange={(e) => onChange('deliveryManagerId', e.target.value)} value={values.deliveryManagerId}>
              <option value="">Select DM (optional)</option>
              {managerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Client</span>
            <select className="field__control" onChange={(e) => onChange('clientId', e.target.value)} value={values.clientId}>
              <option value="">Select client (optional)</option>
              {clientOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Start Date *</span>
            <input className="field__control" onChange={(e) => onChange('startDate', e.target.value)} type="date" value={values.startDate} />
            {errors.startDate ? <span className="field__error">{errors.startDate}</span> : null}
          </label>

          <label className="field">
            <span className="field__label">Planned End Date</span>
            <input className="field__control" min={values.startDate} onChange={(e) => onChange('plannedEndDate', e.target.value)} type="date" value={values.plannedEndDate} />
            {errors.plannedEndDate ? <span className="field__error">{errors.plannedEndDate}</span> : null}
          </label>

          <label className="field field--full">
            <span className="field__label">Description</span>
            <textarea className="field__control field__control--textarea" onChange={(e) => onChange('description', e.target.value)} rows={3} value={values.description} />
          </label>
        </div>
      )}

      {/* Step 2: Engagement */}
      {step === 1 && (
        <div className="entity-form__grid">
          <label className="field">
            <span className="field__label">Engagement Model</span>
            <select className="field__control" onChange={(e) => onChange('engagementModel', e.target.value)} value={values.engagementModel}>
              <option value="">Select model</option>
              {ENGAGEMENT_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Priority</span>
            <select className="field__control" onChange={(e) => onChange('priority', e.target.value)} value={values.priority}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Domain</span>
            <select className="field__control" onChange={(e) => onChange('domain', e.target.value)} value={values.domain}>
              <option value="">Select domain</option>
              {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <label className="field">
            <span className="field__label">Project Type</span>
            <input className="field__control" onChange={(e) => onChange('projectType', e.target.value)} placeholder="e.g., New Build, Migration, Support" type="text" value={values.projectType} />
          </label>

          <label className="field field--full">
            <span className="field__label">Tech Stack</span>
            <input className="field__control" onChange={(e) => onChange('techStack', e.target.value)} placeholder="Comma-separated: React, NestJS, PostgreSQL" type="text" value={values.techStack} />
          </label>

          <label className="field field--full">
            <span className="field__label">Tags</span>
            <input className="field__control" onChange={(e) => onChange('tags', e.target.value)} placeholder="Comma-separated: strategic, q3-priority" type="text" value={values.tags} />
          </label>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 2 && (
        <div className="entity-form__grid">
          <div className="field field--full">
            <h4 style={{ marginBottom: 'var(--space-3)' }}>Review & Create</h4>
            <table className="dash-compact-table">
              <tbody>
                <tr><td style={{ fontWeight: 500, width: 160 }}>Name</td><td>{values.name || '—'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>PM</td><td>{managerOptions.find((o) => o.value === values.projectManagerId)?.label || '—'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>DM</td><td>{managerOptions.find((o) => o.value === values.deliveryManagerId)?.label || '—'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Client</td><td>{clientOptions.find((o) => o.value === values.clientId)?.label || '—'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Dates</td><td>{values.startDate || '—'} → {values.plannedEndDate || 'Open-ended'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Engagement</td><td>{ENGAGEMENT_MODELS.find((m) => m.value === values.engagementModel)?.label || '—'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Priority</td><td>{PRIORITIES.find((p) => p.value === values.priority)?.label || 'Medium'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Domain</td><td>{values.domain || '—'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Type</td><td>{values.projectType || '—'}</td></tr>
                {values.techStack ? <tr><td style={{ fontWeight: 500 }}>Tech Stack</td><td>{values.techStack}</td></tr> : null}
                {values.tags ? <tr><td style={{ fontWeight: 500 }}>Tags</td><td>{values.tags}</td></tr> : null}
                {values.description ? <tr><td style={{ fontWeight: 500 }}>Description</td><td style={{ whiteSpace: 'pre-wrap' }}>{values.description}</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="entity-form__actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
        <div>
          {step > 0 && (
            <button className="button button--secondary" type="button" onClick={() => onStepChange(step - 1)}>
              ← Previous
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {step < 2 && (
            <button className="button" type="button" onClick={() => onStepChange(step + 1)}>
              Next →
            </button>
          )}
          {step === 2 && (
            <button className="button button--primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
