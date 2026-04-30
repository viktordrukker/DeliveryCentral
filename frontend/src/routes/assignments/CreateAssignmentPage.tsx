import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { DIRECTOR_ADMIN_ROLES } from '@/app/route-manifest';
import { CreateAssignmentForm } from '@/components/assignments/CreateAssignmentForm';
import { InactivePersonBanner } from '@/components/assignments/InactivePersonBanner';
import { PersonContextPanel } from '@/components/assignments/PersonContextPanel';
import { ProjectContextPanel } from '@/components/assignments/ProjectContextPanel';
import { SkillMatchPanel } from '@/components/assignments/SkillMatchPanel';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { GovernanceOverridePanel } from '@/components/common/GovernanceOverridePanel';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { hasAnyStoredRole } from '@/features/auth/token-claims';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import {
  CreateAssignmentFormValues,
  useCreateAssignmentPage,
} from '@/features/assignments/useCreateAssignmentPage';
import type { PlannedAssignment } from '@/components/staffing-desk/WorkloadTimeline';
import { Button } from '@/components/ds';

const initialValues: CreateAssignmentFormValues = {
  actorId: '',
  allocationPercent: '100',
  customRole: '',
  endDate: '',
  note: '',
  personId: '',
  projectId: '',
  staffingRole: '',
  startDate: '',
};

export function CreateAssignmentPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { principal } = useAuth();
  const [values, setValues] = useState<CreateAssignmentFormValues>(() => ({
    ...initialValues,
    projectId: searchParams.get('projectId') ?? '',
    personId: searchParams.get('personId') ?? '',
  }));
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonError, setOverrideReasonError] = useState<string | null>(null);
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);
  const [inactiveResolution, setInactiveResolution] = useState<'hr-case' | 'retroactive'>('hr-case');

  const state = useCreateAssignmentPage(values.personId, values.projectId);
  const tokenState = useStoredApiToken();

  // Auto-fill requester from principal
  useEffect(() => {
    if (principal?.personId && !values.actorId) {
      setValues((current) => ({ ...current, actorId: principal.personId! }));
    }
  }, [principal?.personId]); // eslint-disable-line react-hooks/exhaustive-deps

  const canRenderForm = useMemo(
    () => state.people.length > 0 && state.projects.length > 0,
    [state.people.length, state.projects.length],
  );
  const canUseAssignmentOverride = hasAnyStoredRole(tokenState.token, DIRECTOR_ADMIN_ROLES);

  const isPersonInactive = state.selectedPerson
    ? state.selectedPerson.lifecycleStatus !== 'ACTIVE'
    : false;

  // Build planned assignment preview for WorkloadTimeline
  const plannedPreview: PlannedAssignment | undefined = useMemo(() => {
    if (!values.startDate || !state.selectedProject) return undefined;
    return {
      allocationPercent: parseInt(values.allocationPercent, 10) || 100,
      endDate: values.endDate || '',
      projectName: state.selectedProject.name,
      startDate: values.startDate,
    };
  }, [values.startDate, values.endDate, values.allocationPercent, state.selectedProject]);

  async function handleSubmit(): Promise<void> {
    if (isPersonInactive && inactiveResolution === 'hr-case') {
      const personId = values.personId;
      const personName = state.selectedPerson?.displayName ?? '';
      const projectName = state.selectedProject?.name ?? '';
      const status = state.selectedPerson?.lifecycleStatus ?? 'inactive';
      navigate(`/cases/new?subjectPersonId=${personId}&type=PERFORMANCE&note=${encodeURIComponent(`Reconciliation anomaly: evidence exists for ${personName} on ${projectName} but employee is ${status}. Review evidence eligibility and resolve.`)}`);
      return;
    }

    const created = await state.submit(values, {
      personValidated: isPersonInactive && inactiveResolution === 'retroactive',
    });

    if (created) {
      navigate(`/assignments/${created.id}`);
    } else if (state.overrideCandidate) {
      setOverrideReason('');
      setOverrideReasonError(null);
    }
  }

  async function handleSubmitDraft(): Promise<void> {
    const created = await state.submit(values, {
      draft: true,
      personValidated: isPersonInactive && inactiveResolution === 'retroactive',
    });

    if (created) {
      navigate(`/assignments/${created.id}`);
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
          <Button as={Link} variant="secondary" to="/assignments">
            Back to assignments
          </Button>
        }
        eyebrow="Assignments"
        subtitle="Create a formal internal person-to-project assignment with full context and timeline visibility."
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
        <>
          {/* Inactive person warning — full width above grid */}
          {isPersonInactive && state.selectedPerson ? (
            <InactivePersonBanner
              onResolutionChange={setInactiveResolution}
              personName={state.selectedPerson.displayName}
              personStatus={state.selectedPerson.lifecycleStatus}
              resolution={inactiveResolution}
            />
          ) : null}

          {/* Two-column layout: form + context */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 'var(--space-4)',
            alignItems: 'start',
          }}>
            {/* LEFT: Form */}
            <div>
              <SectionCard title="Assignment Details">
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
                  onSubmit={() => { void handleSubmit(); }}
                  onSubmitDraft={() => { void handleSubmitDraft(); }}
                  people={state.people}
                  principalPersonId={principal?.personId ?? undefined}
                  projects={state.projects}
                  values={values}
                />
              </SectionCard>

              {state.overrideCandidate ? (
                canUseAssignmentOverride ? (
                  <div style={{ marginTop: 'var(--space-3)' }}>
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
                  </div>
                ) : (
                  <div className="override-panel" style={{ marginTop: 'var(--space-3)' }}>
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
            </div>

            {/* RIGHT: Context panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <PersonContextPanel
                person={state.selectedPerson}
                planned={plannedPreview}
              />

              <ProjectContextPanel project={state.selectedProject} />

              {values.projectId ? (
                <SkillMatchPanel projectId={values.projectId} />
              ) : null}

              {!values.personId && !values.projectId ? (
                <SectionCard title="Context">
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12, padding: 'var(--space-2) 0' }}>
                    Select a person and project to see context information, workload timeline, and skill-matched suggestions.
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
