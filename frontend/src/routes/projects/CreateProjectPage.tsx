import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { ProjectLifecycleForm } from '@/components/projects/ProjectLifecycleForm';
import { useProjectLifecycleAdmin } from '@/features/projects/useProjectLifecycleAdmin';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { Button } from '@/components/ds';

// Fields the user actively fills in. `priority` defaults to MEDIUM and is excluded
// so the warning does not fire on a freshly opened, untouched form.
const DIRTY_FIELDS = [
  'clientId',
  'deliveryManagerId',
  'description',
  'domain',
  'engagementModel',
  'name',
  'plannedEndDate',
  'projectManagerId',
  'projectType',
  'startDate',
  'tags',
  'techStack',
] as const;

export function CreateProjectPage(): JSX.Element {
  const state = useProjectLifecycleAdmin();
  const navigate = useNavigate();
  const isDirty =
    !state.createdProject &&
    DIRTY_FIELDS.some((field) => (state.values[field] ?? '').toString().trim() !== '');
  useUnsavedChangesWarning(isDirty);

  // Sprint F-0.12 (D-50) — post-create redirect. Previously the page parked
  // on a "Project Created" success card; users had to manually click into
  // the new project. UX Law 3 (no context loss after action) wants the user
  // to land on the entity they just created. 1.5s delay gives the success
  // banner time to register before navigating away.
  useEffect(() => {
    if (!state.createdProject?.id) return;
    const timer = setTimeout(() => {
      navigate(`/projects/${state.createdProject!.id}`, { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [state.createdProject, navigate]);

  const banners = (
    <>
      {state.isLoading ? <LoadingState label="Loading..." variant="skeleton" skeletonType="detail" /> : null}
      {state.error ? <ErrorState description={state.error} onRetry={() => window.location.reload()} /> : null}
      {state.successMessage ? <div className="success-banner">{state.successMessage}</div> : null}
    </>
  );

  return (
    <FormPageLayout
      testId="project-lifecycle-admin-page"
      eyebrow="Projects"
      title="Create Project"
      subtitle="Create a new project through the 3-step wizard: basics, engagement model, and review."
      actions={
        <Button as={Link} variant="secondary" to="/projects">
          Back to projects
        </Button>
      }
      banners={banners}
    >
      {!state.isLoading && !state.error ? (
        <SectionCard title={`Step ${state.step + 1} of 3`}>
          <ProjectLifecycleForm
            clientOptions={state.clientOptions}
            errors={state.errors}
            isSubmitting={state.isSubmitting}
            managerOptions={state.managerOptions}
            onChange={state.handleChange}
            onSubmit={state.handleSubmit}
            step={state.step}
            onStepChange={state.setStep}
            values={state.values}
          />
        </SectionCard>
      ) : null}

      {state.createdProject ? (
        <SectionCard title="Project Created">
          <dl className="details-list">
            <div>
              <dt>Name</dt>
              <dd>{state.createdProject.name}</dd>
            </div>
            <div>
              <dt>Project Code</dt>
              <dd>{state.createdProject.projectCode}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{state.createdProject.status}</dd>
            </div>
          </dl>
          <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="primary" onClick={() => navigate(`/projects/${state.createdProject!.id}`)} type="button">
              Open Project
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()} type="button">
              Create Another
            </Button>
          </div>
        </SectionCard>
      ) : null}
    </FormPageLayout>
  );
}
