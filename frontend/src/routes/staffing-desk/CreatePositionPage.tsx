import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { Button } from '@/components/ds';
import {
  createProjectPosition,
  transitionProjectPositionFill,
  type CreateProjectPositionRequest,
} from '@/lib/api/project-positions';

/**
 * CreatePositionPage — lean-flow full-page form for opening a new
 * ProjectPosition demand. Replaces the legacy CreateStaffingRequestPage
 * (deleted by Phase 2 exit-gate). Writes the canonical aggregate
 * directly, no interim ProjectAssignment.
 *
 * Flow:
 *   1. Fill project + role + dates + allocation
 *   2. Submit → POST /api/project-positions (status DRAFT)
 *   3. Auto-transition to OPEN so the new row appears in /staffing-desk
 *   4. Navigate to /staffing-desk to see the new row in context
 */

interface FormState {
  projectId: string;
  role: string;
  requiredAllocationPercent: string;
  startDate: string;
  endDate: string;
  summary: string;
  openImmediately: boolean;
}

const INITIAL: FormState = {
  projectId: '',
  role: '',
  requiredAllocationPercent: '100',
  startDate: '',
  endDate: '',
  summary: '',
  openImmediately: true,
};

function validate(values: FormState): { ok: boolean; errors: Partial<Record<keyof FormState, string>> } {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!values.projectId) errors.projectId = 'Project is required';
  if (!values.role.trim()) errors.role = 'Role is required';
  if (!values.startDate) errors.startDate = 'Start date is required';
  if (!values.endDate) errors.endDate = 'End date is required';
  if (values.startDate && values.endDate && values.startDate > values.endDate) {
    errors.endDate = 'End date must be on or after start date';
  }
  const alloc = Number(values.requiredAllocationPercent);
  if (Number.isNaN(alloc) || alloc <= 0 || alloc > 100) {
    errors.requiredAllocationPercent = 'Allocation must be 1–100';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function CreatePositionPage(): JSX.Element {
  const { principal } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [values, setValues] = useState<FormState>({ ...INITIAL, projectId: params.get('projectId') ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitError(null);
    if (!principal?.personId) {
      setSubmitError('You must be signed in.');
      return;
    }
    const v = validate(values);
    setErrors(v.errors);
    if (!v.ok) {
      setSubmitError(`Fix ${Object.keys(v.errors).length} field(s) before submitting.`);
      return;
    }
    setSubmitting(true);
    try {
      const request: CreateProjectPositionRequest = {
        projectId: values.projectId,
        role: values.role.trim(),
        requiredAllocationPercent: Number(values.requiredAllocationPercent),
        startDate: values.startDate,
        endDate: values.endDate,
        summary: values.summary.trim() || undefined,
        requestedByPersonId: principal.personId,
        openImmediately: values.openImmediately,
      };
      const created = await createProjectPosition(request);
      // The BE applies openImmediately as a transition; if for any reason the
      // returned row is still DRAFT, push it to OPEN so it surfaces in the desk.
      if (created.fillStatus === 'DRAFT' && values.openImmediately) {
        await transitionProjectPositionFill(created.id, { toStatus: 'OPEN' });
      }
      toast.success(`Position opened: ${created.role}`);
      navigate('/staffing-desk?view=table');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create position.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer testId="create-position-page">
      <PageHeader
        eyebrow="Staffing"
        title="Open a new position"
        subtitle="Lean flow — creates a ProjectPosition directly. No interim staffing request."
      />
      <SectionCard title="Position details">
        <form onSubmit={(e) => { void handleSubmit(e); }} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {submitError && <ErrorState description={submitError} />}

          <label className="field">
            <span className="field__label">Project ID</span>
            <input
              className="field__control"
              type="text"
              value={values.projectId}
              onChange={(e) => setField('projectId', e.target.value)}
              placeholder="UUID of an active project"
              disabled={submitting}
              aria-invalid={Boolean(errors.projectId)}
            />
            {errors.projectId && <span style={{ color: 'var(--color-status-danger)', fontSize: 12 }}>{errors.projectId}</span>}
          </label>

          <label className="field">
            <span className="field__label">Role</span>
            <input
              className="field__control"
              type="text"
              value={values.role}
              onChange={(e) => setField('role', e.target.value)}
              placeholder="e.g. Senior Frontend Engineer"
              disabled={submitting}
              aria-invalid={Boolean(errors.role)}
            />
            {errors.role && <span style={{ color: 'var(--color-status-danger)', fontSize: 12 }}>{errors.role}</span>}
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
            <label className="field">
              <span className="field__label">Start date</span>
              <input
                className="field__control"
                type="date"
                value={values.startDate}
                onChange={(e) => setField('startDate', e.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(errors.startDate)}
              />
              {errors.startDate && <span style={{ color: 'var(--color-status-danger)', fontSize: 12 }}>{errors.startDate}</span>}
            </label>
            <label className="field">
              <span className="field__label">End date</span>
              <input
                className="field__control"
                type="date"
                value={values.endDate}
                onChange={(e) => setField('endDate', e.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(errors.endDate)}
              />
              {errors.endDate && <span style={{ color: 'var(--color-status-danger)', fontSize: 12 }}>{errors.endDate}</span>}
            </label>
            <label className="field">
              <span className="field__label">Allocation %</span>
              <input
                className="field__control"
                type="number"
                min={1}
                max={100}
                value={values.requiredAllocationPercent}
                onChange={(e) => setField('requiredAllocationPercent', e.target.value)}
                disabled={submitting}
                aria-invalid={Boolean(errors.requiredAllocationPercent)}
              />
              {errors.requiredAllocationPercent && <span style={{ color: 'var(--color-status-danger)', fontSize: 12 }}>{errors.requiredAllocationPercent}</span>}
            </label>
          </div>

          <label className="field">
            <span className="field__label">Summary (optional)</span>
            <textarea
              className="field__control"
              value={values.summary}
              onChange={(e) => setField('summary', e.target.value)}
              rows={3}
              disabled={submitting}
              placeholder="Brief context for the staffing decision"
            />
          </label>

          <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={values.openImmediately}
              onChange={(e) => setField('openImmediately', e.target.checked)}
              disabled={submitting}
            />
            <span>Open immediately (skip DRAFT — surface on staffing desk right away)</span>
          </label>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create position'}
            </Button>
            <Link to="/staffing-desk?view=table">
              <Button type="button" variant="secondary" disabled={submitting}>Cancel</Button>
            </Link>
          </div>
        </form>
      </SectionCard>
    </PageContainer>
  );
}
