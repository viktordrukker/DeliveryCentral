import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { EmployeeLifecycleForm } from '@/components/people/EmployeeLifecycleForm';
import { useEmployeeLifecycleAdmin } from '@/features/people/useEmployeeLifecycleAdmin';

export function EmployeeLifecycleAdminPage(): JSX.Element {
  const navigate = useNavigate();
  const state = useEmployeeLifecycleAdmin();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEvent, setPendingEvent] = useState<FormEvent<HTMLFormElement> | null>(null);

  function handleSubmitRequest(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setPendingEvent(event);
    setConfirmOpen(true);
  }

  async function handleConfirm(): Promise<void> {
    setConfirmOpen(false);
    if (!pendingEvent) return;
    const created = await state.handleSubmit(pendingEvent);
    setPendingEvent(null);
    if (created) {
      navigate(`/people/${created.id}`);
    }
  }

  function handleCancel(): void {
    setConfirmOpen(false);
    setPendingEvent(null);
  }

  return (
    <PageContainer testId="employee-lifecycle-admin-page">
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/people">
            Back to people
          </Link>
        }
        eyebrow="Administration"
        subtitle="Create employees through the durable Organization runtime. This flow keeps employee lifecycle actions explicit and auditable."
        title="Employee Lifecycle Admin"
      />

      {state.isLoading ? <LoadingState label="Loading employee lifecycle admin..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.successMessage ? <div className="success-banner">{state.successMessage}</div> : null}

      {!state.isLoading && !state.error ? (
        <div className="details-grid">
          <SectionCard title="Create Employee">
            {state.orgUnitOptions.length === 0 ? (
              <EmptyState
                description="No org units are currently available from the organization APIs."
                title="Org units unavailable"
              />
            ) : (
              <EmployeeLifecycleForm
                errors={state.errors}
                gradeOptions={state.gradeOptions}
                isSubmitting={state.isSubmitting}
                managerOptions={state.managerOptions}
                onChange={state.handleChange}
                onSubmit={handleSubmitRequest}
                orgUnitOptions={state.orgUnitOptions}
                roleOptions={state.roleOptions}
                skillsetOptions={state.skillsetOptions}
                values={state.values}
              />
            )}
          </SectionCard>

          {state.createdEmployee ? (
            <SectionCard title="Last Created Employee">
              <dl className="details-list">
                <div>
                  <dt>Name</dt>
                  <dd>{state.createdEmployee.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{state.createdEmployee.email}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{state.createdEmployee.status}</dd>
                </div>
                <div>
                  <dt>Org Unit</dt>
                  <dd>{state.createdEmployee.orgUnitId}</dd>
                </div>
              </dl>
              <div className="section-card__actions-row section-card__actions-row--start">
                <Link className="button button--secondary" to={`/people/${state.createdEmployee.id}`}>
                  Open employee details
                </Link>
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        message="This will permanently create a new employee record. The action cannot be undone."
        onCancel={handleCancel}
        onConfirm={() => void handleConfirm()}
        open={confirmOpen}
        title="Create employee?"
      />
    </PageContainer>
  );
}
