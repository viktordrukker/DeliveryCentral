import { FormEvent } from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { Button, DatePicker } from '@/components/ds';
import { ProjectDirectoryItem } from '@/lib/api/project-registry';

export interface QuickAssignForm {
  allocationPercent: string;
  error: string | null;
  isSubmitting: boolean;
  personId: string;
  projectId: string;
  staffingRole: string;
  startDate: string;
  success: string | null;
}

interface RmQuickAssignModalProps {
  open: boolean;
  form: QuickAssignForm;
  managedPeople: Array<{ id: string; displayName: string }>;
  projects: ProjectDirectoryItem[];
  onClose: () => void;
  onChange: (patch: Partial<QuickAssignForm>) => void;
  onSubmit: (e: FormEvent) => void;
}

export function RmQuickAssignModal({
  open,
  form,
  managedPeople,
  projects,
  onClose,
  onChange,
  onSubmit,
}: RmQuickAssignModalProps): JSX.Element | null {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-overlay)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          borderRadius: '8px',
          padding: '24px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>Quick Assignment</h2>
          <Button variant="secondary" onClick={onClose} type="button">
            {'✕'} Close
          </Button>
        </div>
        {form.error ? <ErrorState description={form.error} /> : null}
        {form.success ? (
          <div className="success-banner" style={{ marginBottom: '12px' }}>
            {form.success}
          </div>
        ) : null}
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label className="field">
            <span className="field__label">Person</span>
            {managedPeople.length > 0 ? (
              <select
                className="field__control"
                onChange={(e) => onChange({ personId: e.target.value })}
                required
                value={form.personId}
              >
                <option value="">Select person...</option>
                {managedPeople.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="field__control"
                onChange={(e) => onChange({ personId: e.target.value })}
                placeholder="Person UUID"
                required
                type="text"
                value={form.personId}
              />
            )}
          </label>
          <label className="field">
            <span className="field__label">Project</span>
            {projects.length > 0 ? (
              <select
                className="field__control"
                onChange={(e) => onChange({ projectId: e.target.value })}
                required
                value={form.projectId}
              >
                <option value="">Select project...</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.projectCode})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="field__control"
                onChange={(e) => onChange({ projectId: e.target.value })}
                placeholder="Project UUID"
                required
                type="text"
                value={form.projectId}
              />
            )}
          </label>
          <label className="field">
            <span className="field__label">Staffing Role</span>
            <input
              className="field__control"
              onChange={(e) => onChange({ staffingRole: e.target.value })}
              placeholder="e.g. Lead Engineer"
              required
              type="text"
              value={form.staffingRole}
            />
          </label>
          <label className="field">
            <span className="field__label">Allocation %</span>
            <input
              className="field__control"
              max={100}
              min={1}
              onChange={(e) => onChange({ allocationPercent: e.target.value })}
              required
              type="number"
              value={form.allocationPercent}
            />
          </label>
          <label className="field">
            <span className="field__label">Start Date</span>
            <DatePicker
              onValueChange={(value) => onChange({ startDate: value })}
              required
              value={form.startDate}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <Button variant="primary" disabled={form.isSubmitting} type="submit">
              {form.isSubmitting ? 'Submitting...' : 'Create assignment'}
            </Button>
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
