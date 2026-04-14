import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { AuthTokenField } from '@/components/common/AuthTokenField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { GovernanceOverridePanel } from '@/components/common/GovernanceOverridePanel';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { CreateAssignmentForm } from '@/components/assignments/CreateAssignmentForm';
import { SkillMatchPanel } from '@/components/assignments/SkillMatchPanel';
import { hasAnyStoredRole } from '@/features/auth/token-claims';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import {
  CreateAssignmentFormValues,
  useCreateAssignmentPage,
} from '@/features/assignments/useCreateAssignmentPage';

const initialValues: CreateAssignmentFormValues = {
  actorId: '',
  allocationPercent: '',
  endDate: '',
  note: '',
  personId: '',
  projectId: '',
  staffingRole: '',
  startDate: '',
};

export function CreateAssignmentPage(): JSX.Element {
  const navigate = useNavigate();
  const [values, setValues] = useState<CreateAssignmentFormValues>(initialValues);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonError, setOverrideReasonError] = useState<string | null>(null);
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);
  const state = useCreateAssignmentPage();
  const tokenState = useStoredApiToken();

  const canRenderForm = useMemo(
    () => state.people.length > 0 && state.projects.length > 0,
    [state.people.length, state.projects.length],
  );
  const canUseAssignmentOverride = hasAnyStoredRole(tokenState.token, ['director', 'admin']);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const created = await state.submit(values);

    if (created) {
      navigate(`/assignments/${created.id}`);
    } else if (state.overrideCandidate) {
      setOverrideReason('');
      setOverrideReasonError(null);
    }
  }

  function handleOverrideSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const trimmedReason = overrideReason.trim();
    if (!trimmedReason) {
      setOverrideReasonError('Override reason is required.');
      return;
    }

    setOverrideReasonError(null);
    setConfirmOverrideOpen(true);
  }

  async function doOverrideSubmit(): Promise<void> {
    const trimmedReason = overrideReason.trim();
    const created = await state.submitOverride(trimmedReason);

    if (created) {
      navigate(`/assignments/${created.id}`);
    }
  }

  function handleChange(field: keyof CreateAssignmentFormValues, value: string): void {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  return (
    <PageContainer testId="create-assignment-page">
      <ConfirmDialog
        confirmLabel="Apply override"
        message="Apply an assignment override? This creates the assignment despite an overlapping person-project conflict and records the reason in audit history."
        onCancel={() => setConfirmOverrideOpen(false)}
        onConfirm={() => {
          setConfirmOverrideOpen(false);
          void doOverrideSubmit();
        }}
        open={confirmOverrideOpen}
        title="Assignment Override"
      />
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/assignments">
            Back to assignments
          </Link>
        }
        eyebrow="Assignments"
        subtitle="Create a formal internal person-to-project assignment. This command does not derive staffing from Jira or work evidence."
        title="Create Assignment"
      />

      {state.isLoadingOptions ? <LoadingState label="Loading assignment form options..." variant="skeleton" skeletonType="detail" /> : null}
      {!state.isLoadingOptions && state.serverError && !canRenderForm ? (
        <ErrorState description={state.serverError} />
      ) : null}
      {!state.isLoadingOptions && !state.serverError && !canRenderForm ? (
        <SectionCard>
          <EmptyState
            description="People and project options are required before an assignment can be created."
            title="Assignment form unavailable"
          />
        </SectionCard>
      ) : null}

      {!state.isLoadingOptions && canRenderForm ? (
        <SectionCard title="Assignment Request">
          {!tokenState.hasToken ? (
            <AuthTokenField
              hasToken={tokenState.hasToken}
              onClear={tokenState.clearToken}
              onSave={tokenState.saveToken}
              token={tokenState.token}
            />
          ) : null}

          {state.serverError ? <ErrorState description={state.serverError} /> : null}

          {state.success ? (
            <div className="success-banner" role="status">
              Assignment created with status {state.success.status}.
            </div>
          ) : null}

          {state.overrideSuccess ? (
            <div className="success-banner" role="status">
              Override applied. Assignment created with status {state.overrideSuccess.status} and
              recorded in the governance trail.
            </div>
          ) : null}

          <CreateAssignmentForm
            errors={state.errors}
            isSubmitting={state.isSubmitting}
            onChange={handleChange}
            onSubmit={handleSubmit}
            people={state.people}
            projects={state.projects}
            values={values}
          />

          {values.projectId ? (
            <SkillMatchPanel projectId={values.projectId} />
          ) : null}

          {state.overrideCandidate ? (
            canUseAssignmentOverride ? (
              <GovernanceOverridePanel
                actionLabel="Create assignment with override"
                confirmLabel="Use only when urgent staffing needs justify creating an overlapping assignment."
                impactMessage="This bypasses the normal overlap guard for the same person and project. The reason is captured for audit and later review."
                isSubmitting={state.isSubmittingOverride}
                onReasonChange={(value) => {
                  setOverrideReason(value);
                  setOverrideReasonError(null);
                }}
                onSubmit={handleOverrideSubmit}
                reason={overrideReason}
                reasonError={overrideReasonError}
                subtitle="A normal assignment request was blocked by an overlapping person-project conflict. Override remains exceptional and should only be used when governance allows it."
                title="Assignment Overlap Override"
              />
            ) : (
              <div className="override-panel">
                <div className="override-panel__header">
                  <div className="override-panel__eyebrow">Governance Override</div>
                  <div className="override-panel__title">Assignment override unavailable</div>
                  <p className="override-panel__copy">
                    This assignment request hit an overlap conflict. Only director or admin tokens
                    can apply the explicit override flow.
                  </p>
                </div>
              </div>
            )
          ) : null}
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
