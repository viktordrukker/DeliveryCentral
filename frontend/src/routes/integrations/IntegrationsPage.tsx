import { Link } from 'react-router-dom';

import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusCard } from '@/components/integrations/StatusCard';
import { useJiraIntegrationStatus } from '@/features/integrations/useJiraIntegrationStatus';

export function IntegrationsPage(): JSX.Element {
  const state = useJiraIntegrationStatus();

  return (
    <PageContainer>
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/admin/integrations">
            Configure →
          </Link>
        }
        eyebrow="Integrations"
        subtitle="Operator-facing status for Jira synchronization. Business pages stay isolated from adapter mechanics and sync operations."
        title="Jira Integration Status"
      />

      {state.isLoading ? <LoadingState label="Loading Jira integration status..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          {state.successMessage ? (
            <div className="success-banner" role="status">
              {state.successMessage}
            </div>
          ) : null}

          <div className="stats-grid">
            <SectionCard>
              <StatusCard label="Provider" value={state.data.provider.toUpperCase()} />
            </SectionCard>
            <SectionCard>
              <StatusCard label="Status" value={state.data.status} />
            </SectionCard>
            <SectionCard>
              <StatusCard
                label="Last Sync Outcome"
                value={state.data.lastProjectSyncOutcome ?? 'No sync yet'}
              />
            </SectionCard>
          </div>

          <div className="details-grid">
            <SectionCard title="Project Sync">
              <dl className="details-list">
                <div>
                  <dt>Project sync supported</dt>
                  <dd>{state.data.supportsProjectSync ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Work evidence supported</dt>
                  <dd>{state.data.supportsWorkEvidence ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt>Last sync time</dt>
                  <dd>
                    {state.data.lastProjectSyncAt
                      ? new Date(state.data.lastProjectSyncAt).toLocaleString('en-US')
                      : 'Not available'}
                  </dd>
                </div>
                <div>
                  <dt>Last sync summary</dt>
                  <dd>{state.data.lastProjectSyncSummary ?? 'No sync has run yet.'}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Operations">
              <div className="placeholder-block">
                <div className="placeholder-block__value">Project Sync</div>
                <p className="placeholder-block__copy">
                  Trigger a Jira project sync without exposing connection secrets or low-level adapter configuration in the UI.
                </p>
                <div className="section-card__actions-row section-card__actions-row--start">
                  <button
                    className="button"
                    disabled={!state.data.supportsProjectSync || state.isSyncing}
                    onClick={() => void state.syncProjects()}
                    type="button"
                  >
                    {state.isSyncing ? 'Syncing...' : 'Trigger project sync'}
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
