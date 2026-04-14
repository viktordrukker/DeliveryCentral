import { Link } from 'react-router-dom';

import { AuthTokenField } from '@/components/common/AuthTokenField';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { ProjectLifecycleForm } from '@/components/projects/ProjectLifecycleForm';
import { useProjectLifecycleAdmin } from '@/features/projects/useProjectLifecycleAdmin';

export function CreateProjectPage(): JSX.Element {
  const state = useProjectLifecycleAdmin();
  const tokenState = useStoredApiToken();

  return (
    <PageContainer testId="project-lifecycle-admin-page">
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/projects">
            Back to projects
          </Link>
        }
        eyebrow="Projects"
        subtitle="Create internal projects through the durable project registry before activating staffing or closure workflows."
        title="Create Project"
      />

      {state.isLoading ? <LoadingState label="Loading project lifecycle admin..." variant="skeleton" skeletonType="detail" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.successMessage ? <div className="success-banner">{state.successMessage}</div> : null}

      <div className="dashboard-main-grid">
        <SectionCard title="Project Charter">
          {!tokenState.hasToken ? (
            <AuthTokenField
              hasToken={tokenState.hasToken}
              onClear={tokenState.clearToken}
              onSave={tokenState.saveToken}
              token={tokenState.token}
            />
          ) : null}

          <ProjectLifecycleForm
            errors={state.errors}
            isSubmitting={state.isSubmitting}
            managerOptions={state.managerOptions}
            onChange={state.handleChange}
            onSubmit={state.handleSubmit}
            values={state.values}
          />
        </SectionCard>

        <SectionCard title="Create Flow Notes">
          <div className="placeholder-block">
            <div className="placeholder-block__value">DRAFT</div>
            <p className="placeholder-block__copy">
              Projects are created as internal draft records first. Activation, closure, and
              team assignment remain explicit follow-up actions.
            </p>
          </div>
        </SectionCard>

        {state.createdProject ? (
          <SectionCard title="Latest Created Project">
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
              <div>
                <dt>Next Step</dt>
                <dd>
                  <Link className="button button--secondary" to={`/projects/${state.createdProject.id}`}>
                    Open project details
                  </Link>
                </dd>
              </div>
            </dl>
          </SectionCard>
        ) : (
          <SectionCard title="Latest Created Project">
            <EmptyState
              description="Create a project to open the lifecycle and staffing controls in project details."
              title="No project created yet"
            />
          </SectionCard>
        )}
      </div>
    </PageContainer>
  );
}
