import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ErrorState } from '@/components/common/ErrorState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StaffingRequestPriority, createStaffingRequest, submitStaffingRequest } from '@/lib/api/staffing-requests';

interface FormValues {
  allocationPercent: string;
  endDate: string;
  headcountRequired: string;
  priority: StaffingRequestPriority;
  projectId: string;
  role: string;
  skills: string;
  startDate: string;
  summary: string;
}

const initialValues: FormValues = {
  allocationPercent: '100',
  endDate: '',
  headcountRequired: '1',
  priority: 'MEDIUM',
  projectId: '',
  role: '',
  skills: '',
  startDate: '',
  summary: '',
};

export function CreateStaffingRequestPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(field: keyof FormValues, value: string): void {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!principal?.personId) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createStaffingRequest({
        allocationPercent: Number(values.allocationPercent),
        endDate: values.endDate,
        headcountRequired: Number(values.headcountRequired),
        priority: values.priority,
        projectId: values.projectId,
        requestedByPersonId: principal.personId,
        role: values.role,
        skills: values.skills ? values.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
        startDate: values.startDate,
        summary: values.summary || undefined,
      });
      // Auto-submit the request from DRAFT to OPEN
      await submitStaffingRequest(created.id);
      navigate(`/staffing-requests/${created.id}`);
    } catch {
      setError('Failed to create staffing request. Please check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Staffing Requests', to: '/staffing-requests' },
          { label: 'New Request' },
        ]}
      />
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/staffing-requests">
            Back to requests
          </Link>
        }
        eyebrow="Supply & Demand"
        subtitle="Post a staffing need for your project. Resource managers will see it in their queue."
        title="Create Staffing Request"
      />

      {error ? <ErrorState description={error} /> : null}

      <SectionCard title="Request Details">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="form-grid">
            <label className="field">
              <span className="field__label">Project ID *</span>
              <input
                className="field__control"
                onChange={(e) => handleChange('projectId', e.target.value)}
                placeholder="Project UUID or code"
                required
                type="text"
                value={values.projectId}
              />
            </label>

            <label className="field">
              <span className="field__label">Role *</span>
              <input
                className="field__control"
                onChange={(e) => handleChange('role', e.target.value)}
                placeholder="e.g. Senior Engineer"
                required
                type="text"
                value={values.role}
              />
            </label>

            <label className="field">
              <span className="field__label">Priority *</span>
              <select
                className="field__control"
                onChange={(e) => handleChange('priority', e.target.value as StaffingRequestPriority)}
                value={values.priority}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </label>

            <label className="field">
              <span className="field__label">Allocation % *</span>
              <input
                className="field__control"
                max="100"
                min="1"
                onChange={(e) => handleChange('allocationPercent', e.target.value)}
                required
                type="number"
                value={values.allocationPercent}
              />
            </label>

            <label className="field">
              <span className="field__label">Headcount Required</span>
              <input
                className="field__control"
                min="1"
                onChange={(e) => handleChange('headcountRequired', e.target.value)}
                type="number"
                value={values.headcountRequired}
              />
            </label>

            <label className="field">
              <span className="field__label">Start Date *</span>
              <input
                className="field__control"
                onChange={(e) => handleChange('startDate', e.target.value)}
                required
                type="date"
                value={values.startDate}
              />
            </label>

            <label className="field">
              <span className="field__label">End Date *</span>
              <input
                className="field__control"
                onChange={(e) => handleChange('endDate', e.target.value)}
                required
                type="date"
                value={values.endDate}
              />
            </label>

            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span className="field__label">Skills (comma-separated)</span>
              <input
                className="field__control"
                onChange={(e) => handleChange('skills', e.target.value)}
                placeholder="e.g. TypeScript, React, NestJS"
                type="text"
                value={values.skills}
              />
            </label>

            <label className="field" style={{ gridColumn: '1 / -1' }}>
              <span className="field__label">Summary</span>
              <textarea
                className="field__control"
                onChange={(e) => handleChange('summary', e.target.value)}
                placeholder="Describe the staffing need..."
                rows={3}
                value={values.summary}
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="button" disabled={submitting} type="submit">
              {submitting ? 'Creating...' : 'Create & Submit Request'}
            </button>
          </div>
        </form>
      </SectionCard>
    </PageContainer>
  );
}
