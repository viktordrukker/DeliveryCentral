import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon } from '@/components/common/TipBalloon';
import { formatDateTime } from '@/lib/format-date';
import { isFeatureEnabled } from '@/lib/feature-flags';
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

/**
 * Inline-mountable Integrations admin content. Renders provider health,
 * sync controls, and remediation actions without PageContainer/PageHeader
 * chrome so AdminPanelPage can mount it inside the Integrations tab under
 * dsRefresh.
 */
export function IntegrationsAdminContent(): JSX.Element {
  const state = useIntegrationAdmin();
  const selectedStatus = state.selectedProvider
    ? state.statusByProvider[state.selectedProvider]
    : null;
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const showRemediationActions =
    dsRefreshEnabled && state.selectedProvider === 'jira';

  const totalAdapters = state.integrations.length;
  const configuredCount = state.integrations.filter((i) => i.status === 'configured').length;
  const degradedCount = state.integrations.filter((i) => i.status === 'degraded').length;
  const notConfiguredCount = totalAdapters - configuredCount - degradedCount;
  const degradedBorder =
    degradedCount > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)';
  const configuredBorder =
    configuredCount === totalAdapters && totalAdapters > 0
      ? 'var(--color-status-active)'
      : 'var(--color-status-warning)';

  return (
    <>
      {state.isLoading ? <LoadingState label="Loading integration status..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {state.successMessage ? (
        <div className="success-banner" role="status">
          {state.successMessage}
        </div>
      ) : null}

      {!state.isLoading && !state.error && totalAdapters > 0 ? (
        <div className="kpi-strip" aria-label="Integrations summary" data-testid="integrations-kpi-strip">
          <Link className="kpi-strip__item" to="/admin/integrations/registry" style={{ borderLeft: '3px solid var(--color-accent)' }}>
            <TipBalloon tip="Total integration adapters registered in the platform." arrow="left" />
            <span className="kpi-strip__value">{totalAdapters}</span>
            <span className="kpi-strip__label">Total adapters</span>
            <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>across providers</span>
          </Link>

          <Link className="kpi-strip__item" to="/admin/integrations/registry" style={{ borderLeft: `3px solid ${configuredBorder}` }}>
            <TipBalloon tip="Adapters reporting a healthy configuration." arrow="left" />
            <span className="kpi-strip__value">{configuredCount}</span>
            <span className="kpi-strip__label">Configured</span>
            <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>healthy</span>
          </Link>

          <Link className="kpi-strip__item" to="/admin/integrations/registry" style={{ borderLeft: `3px solid ${degradedBorder}` }}>
            <TipBalloon tip="Adapters in a degraded state — last sync failed or partial." arrow="left" />
            <span className="kpi-strip__value">{degradedCount}</span>
            <span className="kpi-strip__label">Degraded</span>
            <span className="kpi-strip__context" style={{ color: degradedCount === 0 ? 'var(--color-status-active)' : 'var(--color-status-danger)' }}>
              {degradedCount === 0 ? 'All healthy' : 'Action required'}
            </span>
          </Link>

          <Link className="kpi-strip__item" to="/admin/integrations/registry" style={{ borderLeft: '3px solid var(--color-status-neutral)' }}>
            <TipBalloon tip="Adapters that have not been configured yet." arrow="left" />
            <span className="kpi-strip__value">{notConfiguredCount}</span>
            <span className="kpi-strip__label">Not configured</span>
            <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>pending setup</span>
          </Link>
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
                        <StatusIndicator status={selectedStatus.status} />
                      </div>
                      <div className="section-card metadata-detail__stat">
                        <span className="metric-card__label">Last Outcome</span>
                        {getLastSyncOutcome(selectedStatus) ? (
                          <StatusBadge status={getLastSyncOutcome(selectedStatus)!} size="small" />
                        ) : (
                          <strong>No sync yet</strong>
                        )}
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

              {showRemediationActions ? (
                <SectionCard title="Remediation Actions">
                  <p className="placeholder-block__copy">
                    Retry the last sync, reset the local last-run snapshot, or probe adapter
                    reachability without mutating internal data. M365 + RADIUS remediation is
                    follow-up work.
                  </p>
                  <div
                    className="section-card__actions-row section-card__actions-row--start"
                    data-testid="jira-remediation-actions"
                  >
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => void state.triggerRetrySync('jira')}
                      disabled={state.isSyncing}
                    >
                      Retry sync
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => void state.triggerResetSync('jira')}
                    >
                      Reset sync state
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => void state.triggerTestConnection('jira')}
                    >
                      Test connection
                    </Button>
                  </div>
                  {state.testConnectionResult ? (
                    <dl className="details-list" data-testid="jira-test-connection-result">
                      <div>
                        <dt>Reachable</dt>
                        <dd>{state.testConnectionResult.reachable ? 'Yes' : 'No'}</dd>
                      </div>
                      <div>
                        <dt>Latency</dt>
                        <dd>{state.testConnectionResult.latencyMs} ms</dd>
                      </div>
                      {state.testConnectionResult.errorMessage ? (
                        <div>
                          <dt>Error</dt>
                          <dd>{state.testConnectionResult.errorMessage}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </SectionCard>
              ) : null}

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
    </>
  );
}

export function IntegrationsAdminPage(): JSX.Element {
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
      <IntegrationsAdminContent />
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
