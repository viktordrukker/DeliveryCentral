import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { formatDateTime } from '@/lib/format-date';
import {
  IntegrationStatusRecord,
  useIntegrationAdmin,
} from '@/features/admin/useIntegrationAdmin';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { IntegrationSyncHistoryPanel } from '@/components/integrations/IntegrationSyncHistoryPanel';
import { M365ReconciliationPanel } from '@/components/integrations/M365ReconciliationPanel';
import { RadiusReconciliationPanel } from '@/components/integrations/RadiusReconciliationPanel';
import { StatusIndicator } from '@/components/integrations/StatusIndicator';
import { SyncButton } from '@/components/integrations/SyncButton';
import { Button } from '@/components/ds';

export function IntegrationsAdminPage(): JSX.Element {
  const state = useIntegrationAdmin();
  const selectedStatus = state.selectedProvider
    ? state.statusByProvider[state.selectedProvider]
    : null;

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <Button as={Link} variant="secondary" to="/admin">
            Back to admin panel
          </Button>
        }
        eyebrow="Administration"
        subtitle="Review provider health and trigger supported sync operations without exposing connection details or credentials."
        title="Integrations"
      />

      {state.isLoading ? <LoadingState label="Loading integration status..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.successMessage ? (
        <div className="success-banner" role="status">
          {state.successMessage}
        </div>
      ) : null}

      {!state.isLoading && !state.error ? (
        state.integrations.length === 0 ? (
          <SectionCard>
            <EmptyState
              description="The admin integrations endpoint returned no providers."
              title="No integrations available"
            />
          </SectionCard>
        ) : (
          <div className="dictionary-admin-grid">
            <SectionCard title="Integrations">
              <div className="dictionary-list">
                {state.integrations.map((integration) => (
                  <IntegrationCard
                    integration={integration}
                    isActive={integration.provider === state.selectedProvider}
                    key={integration.provider}
                    onSelect={state.selectProvider}
                  />
                ))}
              </div>
            </SectionCard>

            <div className="dictionary-editor">
              <SectionCard title="Status Overview">
                {state.selectedIntegration && selectedStatus ? (
                  <>
                    <div className="kpi-strip">
                      <div className="section-card metadata-detail__stat">
                        <span className="metric-card__label">Provider</span>
                        <strong>{state.selectedIntegration.provider.toUpperCase()}</strong>
                      </div>
                      <div className="section-card metadata-detail__stat">
                        <span className="metric-card__label">Status</span>
                        <strong>
                          <StatusIndicator status={selectedStatus.status} />
                        </strong>
                      </div>
                      <div className="section-card metadata-detail__stat">
                        <span className="metric-card__label">Last Outcome</span>
                        <strong>{getLastSyncOutcome(selectedStatus) ?? 'No sync yet'}</strong>
                      </div>
                      <div className="section-card metadata-detail__stat">
                        <span className="metric-card__label">Last Sync</span>
                        <strong>
                          {formatLastSyncAt(getLastSyncAt(selectedStatus)) ?? 'Not available'}
                        </strong>
                      </div>
                    </div>

                    <dl className="details-list">
                      {renderStatusDetails(selectedStatus)}
                    </dl>
                  </>
                ) : (
                  <EmptyState
                    description="Select an integration to review its current status."
                    title="No integration selected"
                  />
                )}
              </SectionCard>

              <SectionCard title="Operations">
                {state.selectedProvider ? (
                  <div className="placeholder-block">
                    <div className="placeholder-block__value">
                      {state.selectedProvider.toUpperCase()} Sync
                    </div>
                    <p className="placeholder-block__copy">
                      Triggers the supported sync operation for the selected provider. Credentials
                      and low-level adapter configuration remain hidden from the UI.
                    </p>
                    <div className="section-card__actions-row section-card__actions-row--start">
                      <SyncButton
                        isSyncing={state.isSyncing}
                        label="Trigger sync"
                        onClick={() => void state.triggerSync(state.selectedProvider!)}
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    description="Select an integration first to run a sync."
                    title="No sync action available"
                  />
                )}
              </SectionCard>

              <SectionCard title="Recent Sync Runs">
                {state.selectedProvider ? (
                  <IntegrationSyncHistoryPanel items={state.integrationSyncHistory} />
                ) : (
                  <EmptyState
                    description="Select an integration to review recent sync runs and bounded failure diagnostics."
                    title="No integration selected"
                  />
                )}
              </SectionCard>

              {state.selectedProvider === 'm365' ? (
                <SectionCard title="M365 Reconciliation Review">
                  <M365ReconciliationPanel
                    filter={state.m365ReconciliationFilter}
                    onFilterChange={state.setM365ReconciliationFilter}
                    review={state.m365Reconciliation}
                  />
                </SectionCard>
              ) : null}

              {state.selectedProvider === 'radius' ? (
                <SectionCard title="RADIUS Reconciliation Review">
                  <RadiusReconciliationPanel
                    filter={state.radiusReconciliationFilter}
                    onFilterChange={state.setRadiusReconciliationFilter}
                    review={state.radiusReconciliation}
                  />
                </SectionCard>
              ) : null}
            </div>
          </div>
        )
      ) : null}
    </PageContainer>
  );
}

function getLastSyncAt(status: IntegrationStatusRecord): string | undefined {
  if (status.provider === 'jira') {
    return status.lastProjectSyncAt;
  }

  if (status.provider === 'm365') {
    return status.lastDirectorySyncAt;
  }

  return status.lastAccountSyncAt;
}

function getLastSyncOutcome(status: IntegrationStatusRecord): string | undefined {
  if (status.provider === 'jira') {
    return status.lastProjectSyncOutcome;
  }

  if (status.provider === 'm365') {
    return status.lastDirectorySyncOutcome;
  }

  return status.lastAccountSyncOutcome;
}

function formatLastSyncAt(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return formatDateTime(value);
}

function renderStatusDetails(status: IntegrationStatusRecord) {
  if (status.provider === 'jira') {
    return (
      <>
        <div>
          <dt>Project sync supported</dt>
          <dd>{status.supportsProjectSync ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Work evidence supported</dt>
          <dd>{status.supportsWorkEvidence ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Last sync summary</dt>
          <dd>{status.lastProjectSyncSummary ?? 'No sync has run yet.'}</dd>
        </div>
      </>
    );
  }

  if (status.provider === 'm365') {
    return (
      <>
        <div>
          <dt>Directory sync supported</dt>
          <dd>{status.supportsDirectorySync ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Manager sync supported</dt>
          <dd>{status.supportsManagerSync ? 'Yes' : 'No'}</dd>
        </div>
        <div>
          <dt>Match strategy</dt>
          <dd>{status.matchStrategy}</dd>
        </div>
        <div>
          <dt>Linked identities</dt>
          <dd>{status.linkedIdentityCount}</dd>
        </div>
      </>
    );
  }

  return (
    <>
      <div>
        <dt>Account sync supported</dt>
        <dd>{status.supportsAccountSync ? 'Yes' : 'No'}</dd>
      </div>
      <div>
        <dt>Match strategy</dt>
        <dd>{status.matchStrategy}</dd>
      </div>
      <div>
        <dt>Linked accounts</dt>
        <dd>{status.linkedAccountCount}</dd>
      </div>
      <div>
        <dt>Unlinked accounts</dt>
        <dd>{status.unlinkedAccountCount}</dd>
      </div>
    </>
  );
}
