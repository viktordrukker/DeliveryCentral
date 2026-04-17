import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { PROJECT_DASHBOARD_ROLES, hasAnyRole } from '@/app/route-manifest';
import { useDrilldown } from '@/app/drilldown-context';
import { ProjectSummaryCard } from '@/components/projects/ProjectSummaryCard';
import { RagTrendTimeline } from '@/components/projects/RagTrendTimeline';
import { StaffingAlertsList } from '@/components/projects/StaffingAlertsList';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon } from '@/components/common/TipBalloon';
import { useProjectDashboard } from '@/features/projects/useProjectDashboard';
import { formatDate } from '@/lib/format-date';
import { type ComputedRag, type RagSnapshotDto, type StaffingAlert, fetchComputedRag, fetchRagHistory, fetchStaffingAlerts } from '@/lib/api/project-rag';
import { type StaffingSummary, fetchStaffingSummary } from '@/lib/api/project-role-plan';

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

export function ProjectDashboardPage(): JSX.Element {
  const { id } = useParams();
  const navigate = useNavigate();
  const { principal } = useAuth();
  const state = useProjectDashboard(id);
  const canManage = hasAnyRole(principal?.roles, PROJECT_DASHBOARD_ROLES);

  const d = state.data;
  const { setCurrentLabel } = useDrilldown();
  const [computedRag, setComputedRag] = useState<ComputedRag | null>(null);
  const [ragHistory, setRagHistory] = useState<RagSnapshotDto[]>([]);
  const [alerts, setAlerts] = useState<StaffingAlert[]>([]);
  const [staffingSummary, setStaffingSummary] = useState<StaffingSummary | null>(null);

  useEffect(() => {
    if (!id) return;
    void fetchComputedRag(id).then(setComputedRag).catch(() => undefined);
    void fetchRagHistory(id).then(setRagHistory).catch(() => undefined);
    void fetchStaffingAlerts(id).then(setAlerts).catch(() => undefined);
    void fetchStaffingSummary(id).then(setStaffingSummary).catch(() => undefined);
  }, [id]);
  const daysRemaining = d?.dashboard.project.endsOn
    ? Math.max(0, Math.ceil((new Date(d.dashboard.project.endsOn).getTime() - Date.now()) / 86400000))
    : null;

  useEffect(() => {
    if (d?.project.name) setCurrentLabel(`${d.project.name} Dashboard`);
  }, [d?.project.name, setCurrentLabel]);

  return (
    <PageContainer testId="project-dashboard-page">
      <PageHeader
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="button button--secondary button--sm" to={`/projects/${id ?? ''}`}>Back to project</Link>
            {canManage && (
              <>
                <Link className="button button--secondary button--sm" to={`/staffing-requests/new?projectId=${id ?? ''}`}>Staffing request</Link>
                <Link className="button button--secondary button--sm" to={`/assignments/new?projectId=${id ?? ''}`}>Quick assign</Link>
              </>
            )}
          </div>
        }
        eyebrow="Projects"
        subtitle="Project-level staffing, workload, and lifecycle signals."
        title={d?.project.name ?? 'Project Dashboard'}
      />

      {state.isLoading ? <LoadingState label="Loading project dashboard..." variant="skeleton" skeletonType="detail" /> : null}
      {state.notFound ? (
        <SectionCard><EmptyState description={`No project was found for ${id ?? 'the requested id'}.`} title="Project not found" /></SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to={`/projects/${id ?? ''}`} style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <span className="kpi-strip__value">{d.project.status}</span>
              <span className="kpi-strip__label">Status</span>
            </Link>

            <Link className="kpi-strip__item" to={`/assignments?project=${id ?? ''}`} style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <TipBalloon tip="People currently assigned to this project." arrow="left" />
              <span className="kpi-strip__value">{d.dashboard.staffingSummary.activeAssignmentCount}</span>
              <span className="kpi-strip__label">Active Staff</span>
            </Link>

            <Link className="kpi-strip__item" to={`/projects/${id ?? ''}`}
              style={{ borderLeft: `3px solid ${daysRemaining !== null && daysRemaining <= 7 ? 'var(--color-status-danger)' : daysRemaining !== null && daysRemaining <= 30 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="Calendar days until planned end date." arrow="left" />
              <span className="kpi-strip__value">{daysRemaining !== null ? `${daysRemaining}d` : '\u2014'}</span>
              <span className="kpi-strip__label">Days Remaining</span>
              {daysRemaining !== null && daysRemaining <= 7 && (
                <span className="kpi-strip__context" style={{ color: 'var(--color-status-danger)' }}>ending soon</span>
              )}
            </Link>

            {staffingSummary && staffingSummary.totalPlanned > 0 ? (
              <Link className="kpi-strip__item" to={`/projects/${id ?? ''}?tab=team`}
                style={{ borderLeft: `3px solid ${staffingSummary.fillRate >= 80 ? 'var(--color-status-active)' : staffingSummary.fillRate >= 50 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}` }}>
                <span className="kpi-strip__value">{staffingSummary.fillRate}%</span>
                <span className="kpi-strip__label">Fill Rate</span>
              </Link>
            ) : null}

            {computedRag ? (
              <Link className="kpi-strip__item" to={`/projects/${id ?? ''}?tab=summary`}
                style={{ borderLeft: `3px solid ${computedRag.overallRag === 'GREEN' ? 'var(--color-status-active)' : computedRag.overallRag === 'AMBER' ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}` }}>
                <StatusBadge status={computedRag.overallRag.toLowerCase()} label={computedRag.overallRag} variant="chip" />
                <span className="kpi-strip__label">Overall RAG</span>
              </Link>
            ) : null}

            {alerts.length > 0 ? (
              <span className="kpi-strip__item" style={{ borderLeft: `3px solid ${alerts.some((a) => a.severity === 'CRITICAL') ? 'var(--color-status-danger)' : 'var(--color-status-warning)'}` }}>
                <span className="kpi-strip__value">{alerts.length}</span>
                <span className="kpi-strip__label">Alerts</span>
              </span>
            ) : null}
          </div>

          {/* ── Staffing Alerts ── */}
          {alerts.length > 0 ? (
            <SectionCard title={`Staffing Alerts (${alerts.length})`} collapsible>
              <StaffingAlertsList alerts={alerts} />
            </SectionCard>
          ) : null}

          {/* ── RAG Trend ── */}
          {ragHistory.length > 0 ? (
            <SectionCard title="Status Trend" collapsible>
              <RagTrendTimeline snapshots={ragHistory} />
            </SectionCard>
          ) : null}

          {/* ── Project Summary ── */}
          <SectionCard title="Project Summary" collapsible>
            <table className="dash-compact-table">
              <tbody>
                <tr><td style={{ fontWeight: 500, width: 140 }}>Name</td><td>{d.project.name}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Code</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{d.project.projectCode}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Status</td><td>{d.project.status}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Starts</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{d.dashboard.project.startsOn ? formatDate(d.dashboard.project.startsOn) : '\u2014'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Ends</td><td style={{ fontVariantNumeric: 'tabular-nums' }}>{d.dashboard.project.endsOn ? formatDate(d.dashboard.project.endsOn) : '\u2014'}</td></tr>
                <tr><td style={{ fontWeight: 500 }}>Description</td><td style={{ color: 'var(--color-text-muted)' }}>{d.project.description ?? 'No description available'}</td></tr>
              </tbody>
            </table>
          </SectionCard>

          {/* ── Assigned People ── */}
          <SectionCard title="Assigned People" collapsible chartExport={{
            headers: ['Person', 'Role', 'Allocation', 'Status', 'From', 'To'],
            rows: d.dashboard.assignments.map((a) => ({ Person: a.personDisplayName, Role: a.staffingRole, Allocation: `${a.allocationPercent}%`, Status: a.status, From: a.validFrom.slice(0, 10), To: a.validTo?.slice(0, 10) ?? 'open' })),
          }}>
            {d.dashboard.assignments.length === 0 ? (
              <EmptyState description="No assignments found for this project." title="No assignments" action={{ label: 'Create assignment', href: `/assignments/new?projectId=${id ?? ''}` }} />
            ) : (
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th style={{ width: 120 }}>Role</th>
                      <th style={NUM}>Alloc %</th>
                      <th style={{ width: 70 }}>Status</th>
                      <th style={{ width: 90 }}>From</th>
                      <th style={{ width: 90 }}>To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.dashboard.assignments.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 500 }}>{a.personDisplayName}</td>
                        <td style={{ fontSize: 11 }}>{a.staffingRole}</td>
                        <td style={NUM}>{a.allocationPercent}%</td>
                        <td><span style={{ fontSize: 11, fontWeight: 600 }}>{a.status}</span></td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(a.validFrom)}</td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{a.validTo ? formatDate(a.validTo) : 'open'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* ── Supporting grid ── */}
          <div className="dashboard-main-grid">
            <SectionCard title="Activity by Week (12 wk)" collapsible chartExport={{
              headers: ['Week', 'Hours'],
              rows: d.dashboard.evidenceByWeek.filter((w) => w.totalHours > 0).map((w) => ({ Week: w.weekStarting, Hours: String(w.totalHours) })),
            }}>
              {d.dashboard.evidenceByWeek.every((w) => w.totalHours === 0) ? (
                <EmptyState description="No time activity was captured in the last 12 weeks." title="No activity data" />
              ) : (
                <table className="dash-compact-table">
                  <thead>
                    <tr><th>Week</th><th style={NUM}>Hours</th><th style={{ width: 120 }}>Bar</th></tr>
                  </thead>
                  <tbody>
                    {d.dashboard.evidenceByWeek.filter((w) => w.totalHours > 0).map((w) => {
                      const maxH = Math.max(...d.dashboard.evidenceByWeek.map((wk) => wk.totalHours), 1);
                      return (
                        <tr key={w.weekStarting}>
                          <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(w.weekStarting)}</td>
                          <td style={{ ...NUM, fontWeight: 600 }}>{w.totalHours}h</td>
                          <td>
                            <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${Math.round((w.totalHours / maxH) * 100)}%`, borderRadius: 2, background: 'var(--color-status-active)' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </SectionCard>

            <SectionCard title="Allocation by Person" collapsible chartExport={{
              headers: ['Person', 'Allocation %'],
              rows: d.dashboard.allocationByPerson.map((i) => ({ Person: i.displayName, 'Allocation %': String(i.allocationPercent) })),
            }}>
              {d.dashboard.allocationByPerson.length === 0 ? (
                <EmptyState description="No active allocations found." title="No allocations" />
              ) : (
                <table className="dash-compact-table">
                  <thead>
                    <tr><th>Person</th><th style={NUM}>Alloc %</th><th style={{ width: 120 }}>Bar</th></tr>
                  </thead>
                  <tbody>
                    {d.dashboard.allocationByPerson.map((item) => (
                      <tr key={item.personId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                        <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                        <td style={{ ...NUM, fontWeight: 600 }}>{item.allocationPercent}%</td>
                        <td>
                          <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(item.allocationPercent, 100)}%`, borderRadius: 2, background: item.allocationPercent > 100 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SectionCard>
          </div>

        </>
      ) : null}
    </PageContainer>
  );
}
