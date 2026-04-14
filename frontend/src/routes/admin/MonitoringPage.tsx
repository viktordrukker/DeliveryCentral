import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

import { AlertPanel } from '@/components/monitoring/AlertPanel';
import { ErrorList } from '@/components/monitoring/ErrorList';
import { HealthCard } from '@/components/monitoring/HealthCard';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { MonitoringAdminData, useMonitoringAdmin } from '@/features/admin/useMonitoringAdmin';
import { formatDateTime } from '@/lib/format-date';

function computeHealthChecks(d: MonitoringAdminData): { label: string; ok: boolean }[] {
  return [
    { label: 'System Health', ok: d.health.status === 'ok' },
    { label: 'Readiness', ok: d.readiness.status === 'ready' },
    { label: 'Database Connection', ok: d.diagnostics.database.connected },
    { label: 'Database Schema', ok: d.diagnostics.database.schemaHealthy },
    { label: 'Migrations', ok: d.diagnostics.migrations.status === 'ready' },
    { label: 'Notifications', ok: d.diagnostics.notifications.status === 'ready' },
    { label: 'Integrations', ok: d.diagnostics.integrations.overallStatus === 'ready' },
    { label: 'No Notification Failures', ok: d.diagnostics.notifications.failedDeliveryCount === 0 },
    { label: 'Audit Subsystem', ok: true },
  ];
}

export function MonitoringPage(): JSX.Element {
  const state = useMonitoringAdmin();
  const diagnostics = state.data?.diagnostics;

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <Link className="button button--secondary" to="/admin">
            Back to admin panel
          </Link>
        }
        eyebrow="Administration"
        subtitle="Read-only monitoring view over application health, readiness, and diagnostics. This page does not expose credentials and does not offer any write operations."
        title="Monitoring"
      />

      {state.isLoading ? <LoadingState label="Loading monitoring data..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {!state.isLoading && !state.error ? (
        state.data ? (
          <>
            {(() => {
              const checks = computeHealthChecks(state.data);
              const passed = checks.filter((c) => c.ok).length;
              const pct = Math.round((passed / checks.length) * 100);
              const color = pct === 100 ? 'var(--color-status-active)' : pct >= 70 ? 'var(--color-status-warning)' : 'var(--color-status-danger)';
              const pieData = [
                { name: 'Healthy', value: passed },
                { name: 'Issues', value: checks.length - passed },
              ];
              return (
                <SectionCard title="System Readiness">
                  <div style={{ alignItems: 'center', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', width: 160, height: 160 }}>
                      <ResponsiveContainer height={160} width={160}>
                        <PieChart>
                          <Pie
                            cx="50%"
                            cy="50%"
                            data={pieData}
                            dataKey="value"
                            endAngle={-270}
                            innerRadius={52}
                            outerRadius={72}
                            startAngle={90}
                            strokeWidth={0}
                          >
                            <Cell fill={color} />
                            <Cell fill="var(--color-border)" />
                          </Pie>
                          <Tooltip formatter={(v, name) => [v, String(name)]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div aria-hidden="true" style={{
                        bottom: 0, display: 'flex', flexDirection: 'column',
                        fontSize: '1.5rem', fontWeight: 700, color,
                        alignItems: 'center', justifyContent: 'center',
                        left: 0, lineHeight: 1, pointerEvents: 'none',
                        position: 'absolute', right: 0, top: 0,
                      }}>
                        {pct}%
                      </div>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '8px' }}>
                        {passed}/{checks.length} checks passing
                      </p>
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '13px' }}>
                        {checks.map((c) => (
                          <li key={c.label} style={{ color: c.ok ? 'var(--color-status-active)' : 'var(--color-status-danger)', padding: '2px 0' }}>
                            {c.ok ? '✓' : '✗'} {c.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </SectionCard>
              );
            })()}

            <div className="kpi-strip">
              <HealthCard
                label="System Status"
                status={state.data.overallStatus}
                summary={`Service ${state.data.health.service} in ${state.data.health.environment}.`}
                value={state.data.overallStatus.toUpperCase()}
              />
              <HealthCard
                label="Readiness"
                status={state.data.readiness.status}
                summary={`${state.data.readiness.checks.length} readiness checks evaluated.`}
                value={state.data.readiness.status.toUpperCase()}
              />
              <HealthCard
                label="Database"
                status={
                  diagnostics?.database.connected && diagnostics.database.schemaHealthy
                    ? 'ready'
                    : 'degraded'
                }
                summary={
                  diagnostics?.database.connected && diagnostics.database.schemaHealthy
                    ? `Connected to ${diagnostics.database.host} with schema sanity.`
                    : diagnostics?.database.error ??
                      diagnostics?.database.schemaError ??
                      'Database connectivity unavailable.'
                }
                value={
                  diagnostics?.database.connected && diagnostics.database.schemaHealthy
                    ? `${diagnostics.database.latencyMs ?? 0} ms`
                    : 'Degraded'
                }
              />
              <HealthCard
                label="Notifications"
                status={diagnostics?.notifications.status ?? 'degraded'}
                summary={diagnostics?.notifications.summary ?? 'Notification diagnostics unavailable.'}
                value={`${diagnostics?.notifications.terminalFailureCount ?? 0} terminal`}
              />
            </div>

            <div className="kpi-strip">
              <HealthCard
                label="Integrations"
                status={diagnostics?.integrations.overallStatus ?? 'degraded'}
                summary={`${diagnostics?.integrations.configuredCount ?? 0} configured, ${diagnostics?.integrations.degradedCount ?? 0} degraded, ${diagnostics?.integrations.neverSyncedCount ?? 0} never synced.`}
                value={`${diagnostics?.integrations.degradedCount ?? 0} degraded`}
              />
              <HealthCard
                label="Migration Sanity"
                status={diagnostics?.migrations.status ?? 'degraded'}
                summary={
                  diagnostics?.migrations.status === 'ready'
                    ? `Applied ${diagnostics.migrations.appliedCount} of ${diagnostics.migrations.availableLocalCount} local migrations.`
                    : diagnostics?.migrations.error ??
                      `${diagnostics?.migrations.pendingLocalCount ?? 0} local migration(s) appear unapplied.`
                }
                value={`${diagnostics?.migrations.pendingLocalCount ?? 0} pending`}
              />
              <HealthCard
                label="Notification Activity"
                status={diagnostics?.notifications.status ?? 'degraded'}
                summary={`${diagnostics?.notifications.recentOutcomeCount ?? 0} recent outcomes, ${diagnostics?.notifications.retryingDeliveryCount ?? 0} retrying, ${diagnostics?.notifications.succeededDeliveryCount ?? 0} succeeded.`}
                value={`${diagnostics?.notifications.retryingDeliveryCount ?? 0} retrying`}
              />
              <HealthCard
                label="Business Audit Visibility"
                status={state.data.health.status}
                summary={
                  diagnostics?.auditVisibility.lastBusinessAuditAt
                    ? `Last audit record ${formatDateTime(diagnostics.auditVisibility.lastBusinessAuditAt)}.`
                    : 'No business audit records visible in current runtime.'
                }
                value={String(diagnostics?.auditVisibility.totalBusinessAuditRecords ?? 0)}
              />
            </div>

            <div className="dashboard-main-grid">
              <SectionCard title="System Status">
                <dl className="details-list">
                  <div>
                    <dt>Health Endpoint</dt>
                    <dd>{state.data.health.status}</dd>
                  </div>
                  <div>
                    <dt>Diagnostics Path</dt>
                    <dd>{state.data.health.diagnosticsPath}</dd>
                  </div>
                  <div>
                    <dt>Latest Diagnostics Timestamp</dt>
                    <dd>{formatDateTime(state.data.diagnostics.timestamp)}</dd>
                  </div>
                  <div>
                    <dt>Business Audit Records</dt>
                    <dd>{state.data.diagnostics.auditVisibility.totalBusinessAuditRecords}</dd>
                  </div>
                  <div>
                    <dt>Database Latency</dt>
                    <dd>
                      {state.data.diagnostics.database.latencyMs === null
                        ? 'Unavailable'
                        : `${state.data.diagnostics.database.latencyMs} ms`}
                    </dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard title="Recent Errors">
                <ErrorList items={state.data.errors} />
              </SectionCard>
            </div>

            <div className="dashboard-main-grid">
              <SectionCard title="Database Health">
                <dl className="details-list">
                  <div>
                    <dt>Connectivity</dt>
                    <dd>{state.data.diagnostics.database.connected ? 'Connected' : 'Unavailable'}</dd>
                  </div>
                  <div>
                    <dt>Schema Sanity</dt>
                    <dd>
                      {state.data.diagnostics.database.schemaHealthy ? 'Healthy' : 'Degraded'}
                    </dd>
                  </div>
                  <div>
                    <dt>Schema</dt>
                    <dd>{state.data.diagnostics.database.schema ?? 'Not reported'}</dd>
                  </div>
                  <div>
                    <dt>Server Version</dt>
                    <dd>{state.data.diagnostics.database.version ?? 'Unavailable'}</dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard title="Notification Readiness">
                <dl className="details-list">
                  <div>
                    <dt>Subsystem Status</dt>
                    <dd>{state.data.diagnostics.notifications.status}</dd>
                  </div>
                  <div>
                    <dt>Enabled Channels</dt>
                    <dd>{state.data.diagnostics.notifications.enabledChannelCount}</dd>
                  </div>
                  <div>
                    <dt>Templates</dt>
                    <dd>{state.data.diagnostics.notifications.templateCount}</dd>
                  </div>
                  <div>
                    <dt>Last Attempt</dt>
                    <dd>
                      {state.data.diagnostics.notifications.lastAttemptedAt
                        ? formatDateTime(state.data.diagnostics.notifications.lastAttemptedAt)
                        : 'No attempts observed'}
                    </dd>
                  </div>
                </dl>
                <p className="monitoring-list__summary">
                  {state.data.diagnostics.notifications.summary}
                </p>
              </SectionCard>
            </div>

            <SectionCard title="Integration Health Summary">
              {state.data.diagnostics.integrations.items.length === 0 ? (
                <EmptyState
                  description="No integration diagnostics are available."
                  title="No integration diagnostics"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.diagnostics.integrations.items.map((item) => (
                    <div className="monitoring-list__item" key={item.name}>
                      <div className="monitoring-card__header">
                        <div>
                          <div className="monitoring-list__title">{item.name.toUpperCase()}</div>
                          <p className="monitoring-list__summary">
                            {item.summary ?? 'No provider summary available.'}
                          </p>
                        </div>
                        <span className={`status-indicator status-indicator--${item.status}`}>
                          {item.status}
                        </span>
                      </div>
                      <dl className="admin-list__metrics">
                        <div className="admin-list__metric">
                          <dt>Last Sync</dt>
                          <dd>
                            {item.lastSyncAt
                              ? formatDateTime(item.lastSyncAt)
                              : 'Never synced'}
                          </dd>
                        </div>
                        <div className="admin-list__metric">
                          <dt>Last Outcome</dt>
                          <dd>{item.lastOutcome ?? 'Not available'}</dd>
                        </div>
                        <div className="admin-list__metric">
                          <dt>Capabilities</dt>
                          <dd>{item.capabilities.join(', ') || 'None'}</dd>
                        </div>
                      </dl>
                      <dl className="admin-list__metrics">
                        {item.summaryMetrics.map((metric) => (
                          <div className="admin-list__metric" key={`${item.name}-${metric.label}`}>
                            <dt>{metric.label}</dt>
                            <dd>{String(metric.value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard title="Alerts Summary">
              <AlertPanel items={state.data.alerts} />
            </SectionCard>

            <SectionCard title="Readiness Checks">
              {state.data.readiness.checks.length === 0 ? (
                <EmptyState
                  description="The readiness endpoint returned no checks."
                  title="No readiness checks"
                />
              ) : (
                <div className="monitoring-list">
                  {state.data.readiness.checks.map((check) => (
                    <div className="monitoring-list__item" key={check.name}>
                      <div className="monitoring-card__header">
                        <div className="monitoring-list__title">{check.name}</div>
                        <span className={`status-indicator status-indicator--${check.status}`}>
                          {check.status}
                        </span>
                      </div>
                      <p className="monitoring-list__summary">{check.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        ) : (
          <SectionCard>
            <EmptyState
              description="Monitoring endpoints returned no data."
              title="No monitoring data"
            />
          </SectionCard>
        )
      ) : null}
    </PageContainer>
  );
}
