import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { DateRangePreset } from '@/components/common/DateRangePreset';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { SectionCard } from '@/components/common/SectionCard';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { Sparkline } from '@/components/charts/Sparkline';
import { TeamCapacityHeatmap } from '@/components/charts/TeamCapacityHeatmap';
import { ResourcePoolUtilizationDonut } from '@/components/charts/ResourcePoolUtilizationDonut';
import { DemandPipelineChart } from '@/components/charts/DemandPipelineChart';
import { RecentActivityRail } from '@/components/dashboard/RecentActivityRail';
import { useResourceManagerDashboard } from '@/features/dashboard/useResourceManagerDashboard';
import { createAssignment } from '@/lib/api/assignments';
import { ORG_DATA_CHANGED_EVENT } from '@/features/org-chart/useOrgChart';
import { fetchProjectDirectory, ProjectDirectoryItem } from '@/lib/api/project-registry';
import { ResourcePersonAllocationIndicator } from '@/lib/api/dashboard-resource-manager';
import { PriorityBadge } from '@/components/staffing/PriorityBadge';
import { formatDate } from '@/lib/format-date';

/* ── Helpers ─────────────────────────────────────────────────────── */

interface QuickAssignForm {
  allocationPercent: string;
  error: string | null;
  isSubmitting: boolean;
  personId: string;
  projectId: string;
  staffingRole: string;
  startDate: string;
  success: string | null;
}

/** Build 8 week labels starting from asOf */
function buildWeekLabels(asOf: string): string[] {
  const base = new Date(asOf);
  return Array.from({ length: 8 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

/** Compute allocation per week for a person from pipeline */
function allocationByWeek(
  personId: string,
  indicators: ResourcePersonAllocationIndicator[],
  weeks: string[],
): number[] {
  const indicator = indicators.find((p) => p.personId === personId);
  if (!indicator) return weeks.map(() => 0);
  return weeks.map(() => indicator.totalAllocationPercent);
}

const NUM = { fontVariantNumeric: 'tabular-nums' as const, textAlign: 'right' as const };

function indicatorColor(ind: string): string {
  if (ind === 'OVERALLOCATED') return 'var(--color-status-danger)';
  if (ind === 'UNDERALLOCATED') return 'var(--color-status-warning)';
  return 'var(--color-status-active)';
}

/* ── Component ───────────────────────────────────────────────────── */

export function ResourceManagerDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { principal, isLoading: authLoading } = useAuth();
  const { setActions } = useTitleBarActions();
  const effectivePersonId = authLoading ? null : (searchParams.get('personId') ?? principal?.personId ?? undefined);
  const state = useResourceManagerDashboard(effectivePersonId);
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState<ProjectDirectoryItem[]>([]);
  const [lastFetch, setLastFetch] = useState(new Date());
  const [quickForm, setQuickForm] = useState<QuickAssignForm>({
    allocationPercent: '100',
    error: null,
    isSubmitting: false,
    personId: '',
    projectId: '',
    staffingRole: '',
    startDate: '',
    success: null,
  });

  useEffect(() => {
    void fetchProjectDirectory({ status: 'ACTIVE' }).then((res) => setProjects(res.items));
  }, []);

  function handlePersonChange(value: string): void {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('personId', value);
      return next;
    });
    state.setPersonId(value);
  }

  // Title bar actions
  useEffect(() => {
    setActions(
      <>
        <DateRangePreset
          compact
          value={{ from: state.asOf.slice(0, 10), to: '' }}
          onChange={(r) => { if (r.from) state.setAsOf(`${r.from}T00:00:00.000Z`); }}
        />
        <label className="field field--inline" style={{ fontSize: 12 }}>
          <input
            className="field__control"
            list="rm-people-list-tb"
            onChange={(event) => {
              const match = state.people.find((p) => p.displayName === event.target.value);
              if (match) handlePersonChange(match.id);
            }}
            placeholder="Resource manager..."
            type="text"
            defaultValue={state.people.find((p) => p.id === state.personId)?.displayName ?? ''}
            key={state.personId}
          />
          <datalist id="rm-people-list-tb">
            {state.people.map((person) => (
              <option key={person.id} value={person.displayName} />
            ))}
          </datalist>
        </label>
        <Link className="button button--secondary button--sm" to="/resource-pools">Resource pools</Link>
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.asOf, state.personId, state.people]);

  // Track fetch time
  useEffect(() => {
    if (state.data && !state.isLoading) setLastFetch(new Date());
  }, [state.data, state.isLoading]);

  const managedPeople = useMemo(() => {
    if (!state.data) return [];
    return [
      ...(state.data.allocationIndicators ?? []).map((p) => ({ id: p.personId, displayName: p.displayName })),
      ...(state.data.peopleWithoutAssignments ?? []).map((p) => ({ id: p.personId, displayName: p.displayName })),
    ].filter((person, idx, arr) => arr.findIndex((p) => p.id === person.id) === idx);
  }, [state.data]);

  async function handleQuickAssign(e: FormEvent): Promise<void> {
    e.preventDefault();
    setQuickForm((prev) => ({ ...prev, error: null, isSubmitting: true, success: null }));
    try {
      await createAssignment({
        actorId: principal?.personId ?? '',
        allocationPercent: Number(quickForm.allocationPercent),
        personId: quickForm.personId,
        projectId: quickForm.projectId,
        staffingRole: quickForm.staffingRole,
        startDate: `${quickForm.startDate}T00:00:00.000Z`,
      });
      setQuickForm((prev) => ({
        ...prev,
        allocationPercent: '100',
        isSubmitting: false,
        personId: '',
        projectId: '',
        staffingRole: '',
        startDate: '',
        success: 'Assignment request created.',
      }));
      window.dispatchEvent(new CustomEvent(ORG_DATA_CHANGED_EVENT));
    } catch (err) {
      setQuickForm((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to create assignment.',
        isSubmitting: false,
      }));
    }
  }

  /* ── Derived data ────────────────────────────────────────────── */
  const d = state.data;
  const totalPeople = d?.summary.totalManagedPeopleCount ?? 0;
  const idlePeople = d?.summary.peopleWithoutAssignmentsCount ?? 0;
  const allocatedPeople = Math.max(0, totalPeople - idlePeople);
  const utilPct = totalPeople > 0 ? Math.round((allocatedPeople / totalPeople) * 100) : 0;
  const overallocated = d?.allocationIndicators.filter((i) => i.indicator === 'OVERALLOCATED') ?? [];
  const pendingApprovals = d?.pendingAssignmentApprovals ?? [];
  const incomingRequests = d?.incomingRequests ?? [];
  const actionItemCount = overallocated.length + pendingApprovals.length + incomingRequests.length;

  // Heatmap
  const weeks = buildWeekLabels(state.asOf);
  const heatmapPeople = (d?.allocationIndicators ?? []).map((p) => ({
    allocationByWeek: allocationByWeek(p.personId, d?.allocationIndicators ?? [], weeks),
    name: p.displayName,
    personId: p.personId,
  }));

  // Demand pipeline
  const pipelineData: Array<Record<string, number | string> & { week: string }> = weeks.slice(0, 4).map((week) => {
    const weekDate = new Date(week);
    const nextWeek = new Date(weekDate);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const row: Record<string, number | string> & { week: string } = { week };
    for (const item of (d?.futureAssignmentPipeline ?? [])) {
      const startDate = new Date(item.startDate);
      if (startDate >= weekDate && startDate < nextWeek) {
        const role = item.projectName;
        row[role] = ((row[role] as number | undefined) ?? 0) + 1;
      }
    }
    return row;
  });

  // Sparklines
  const utilSpark = useMemo(() => {
    if (!d) return [];
    const indicators = d.allocationIndicators;
    return indicators.slice(-12).map((ind) => ind.totalAllocationPercent);
  }, [d]);

  const refetch = (): void => state.setAsOf(new Date().toISOString());

  return (
    <PageContainer testId="resource-manager-dashboard-page">
      {state.isLoading ? <LoadingState label="Loading resource manager dashboard..." variant="skeleton" skeletonType="page" /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {d ? (
        <>
          {d.person.displayName && <h2 style={{ margin: '0 0 var(--space-2)', fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>{d.person.displayName}</h2>}

          {/* ── KPI STRIP ── */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/workload"
              style={{ borderLeft: `3px solid ${utilPct >= 85 ? 'var(--color-status-active)' : utilPct >= 65 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}` }}>
              <TipBalloon tip="Ratio of assigned people to total headcount. Target is 80%. Green = healthy, amber = watch, red = low." arrow="left" />
              <span className="kpi-strip__value">{utilPct}%</span>
              <span className="kpi-strip__label">Utilization</span>
              <div className="kpi-strip__progress">
                <div className="kpi-strip__progress-fill" style={{ width: `${Math.min(utilPct, 100)}%`, background: utilPct >= 85 ? 'var(--color-status-active)' : utilPct >= 65 ? 'var(--color-status-warning)' : 'var(--color-status-danger)' }} />
              </div>
              {utilSpark.length > 3 && <div className="kpi-strip__sparkline"><Sparkline data={utilSpark} height={24} width={72} /></div>}
            </Link>

            <Link className="kpi-strip__item" to="/teams" style={{ borderLeft: '3px solid var(--color-accent)' }}>
              <TipBalloon tip="Teams you manage directly. Click to view the full teams list." arrow="left" />
              <span className="kpi-strip__value">{d.summary.managedTeamCount}</span>
              <span className="kpi-strip__label">Managed Teams</span>
            </Link>

            <Link className="kpi-strip__item" to="/people" style={{ borderLeft: '3px solid var(--color-chart-5, #8b5cf6)' }}>
              <TipBalloon tip="Total headcount across all teams you manage." arrow="left" />
              <span className="kpi-strip__value">{totalPeople}</span>
              <span className="kpi-strip__label">Managed People</span>
              <span className="kpi-strip__context" style={{ color: 'var(--color-text-muted)' }}>
                {allocatedPeople} assigned · {idlePeople} idle
              </span>
            </Link>

            <Link className="kpi-strip__item" to="/people?filter=idle"
              style={{ borderLeft: `3px solid ${idlePeople > 5 ? 'var(--color-status-warning)' : idlePeople === 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="People with no active assignment. High counts indicate underutilized capacity. Zero means no spare capacity." arrow="left" />
              <span className="kpi-strip__value">{idlePeople}</span>
              <span className="kpi-strip__label">Idle Resources</span>
              <span className="kpi-strip__context" style={{ color: idlePeople === 0 ? 'var(--color-status-danger)' : 'var(--color-text-muted)' }}>
                {idlePeople === 0 ? 'No spare capacity' : 'available to assign'}
              </span>
            </Link>

            <Link className="kpi-strip__item" to="/assignments"
              style={{ borderLeft: `3px solid ${overallocated.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)'}` }}>
              <TipBalloon tip="People allocated above 100%. Red means immediate rebalancing is needed." arrow="left" />
              <span className="kpi-strip__value">{overallocated.length}</span>
              <span className="kpi-strip__label">Overallocated</span>
              <span className="kpi-strip__context" style={{ color: overallocated.length > 0 ? 'var(--color-status-danger)' : 'var(--color-status-active)' }}>
                {overallocated.length === 0 ? 'All clear' : 'needs rebalancing'}
              </span>
            </Link>
          </div>

          {/* ── HERO: Team Capacity Heatmap ── */}
          <div className="dashboard-hero" style={{ position: 'relative' }}>
            <TipBalloon
              tip="Heatmap shows allocation % per person per week. Dark = over-allocated, light = idle. Hover for details. Click to view person."
              arrow="left"
            />
            <div className="dashboard-hero__header">
              <div>
                <div className="dashboard-hero__title">Team Capacity Heatmap (8 Weeks)</div>
                <div className="dashboard-hero__subtitle">
                  Allocation per person — hover for detail, identify gaps and overloads
                </div>
              </div>
              <button
                className="button button--sm"
                onClick={() => { setShowModal(true); setQuickForm((p) => ({ ...p, error: null, success: null })); }}
                type="button"
              >
                Quick assignment
              </button>
            </div>
            <div className="dashboard-hero__chart">
              {heatmapPeople.length > 0 ? (
                <TeamCapacityHeatmap people={heatmapPeople} weeks={weeks} />
              ) : (
                <EmptyState
                  description="No active assignments found for managed resources. Try adjusting the date range."
                  title="No workload data"
                  action={{ label: 'Create assignment', href: '/assignments/new' }}
                />
              )}
            </div>
          </div>

          {/* ── ACTION ITEMS ── */}
          {actionItemCount > 0 ? (
            <div className="dash-action-section" style={{ position: 'relative' }}>
              <TipBalloon tip="Items needing attention — overallocations, pending approvals, and incoming staffing requests. Click any row to act." arrow="left" />
              <div className="dash-action-section__header">
                <span className="dash-action-section__title">Action Items ({actionItemCount})</span>
              </div>
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table" style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>#</th>
                      <th style={{ width: 70 }}>Severity</th>
                      <th style={{ width: 120 }}>Category</th>
                      <th>Entity</th>
                      <th style={{ width: 140 }}>Detail</th>
                      <th style={NUM}>Alloc %</th>
                      <th style={{ width: 100 }}>Suggested Action</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Overallocated — High severity */}
                    {overallocated.map((item, i) => (
                      <tr key={`over-${item.personId}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                        <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{i + 1}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-danger)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--color-status-danger)', fontWeight: 600, fontSize: 11 }}>High</span>
                          </span>
                        </td>
                        <td>Overallocated</td>
                        <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                        <td style={{ fontSize: 11 }}>{item.teamName}</td>
                        <td style={{ ...NUM, color: 'var(--color-status-danger)', fontWeight: 600 }}>{item.totalAllocationPercent}%</td>
                        <td style={{ fontSize: 11 }}>Rebalance assignments</td>
                        <td><Link to={`/people/${item.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                      </tr>
                    ))}

                    {/* Pending approvals — Medium severity */}
                    {pendingApprovals.map((item, i) => (
                      <tr key={`pend-${item.assignmentId}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/assignments/${item.assignmentId}`)}>
                        <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{overallocated.length + i + 1}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-warning)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--color-status-warning)', fontWeight: 600, fontSize: 11 }}>Med</span>
                          </span>
                        </td>
                        <td>Pending Approval</td>
                        <td style={{ fontWeight: 500 }}>{item.personDisplayName}</td>
                        <td style={{ fontSize: 11 }}>{item.projectName}</td>
                        <td style={NUM}>{'\u2014'}</td>
                        <td style={{ fontSize: 11 }}>Review & approve</td>
                        <td><Link to={`/assignments/${item.assignmentId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                      </tr>
                    ))}

                    {/* Incoming requests — Info severity */}
                    {incomingRequests.map((req, i) => (
                      <tr key={`req-${req.id}`} style={{ cursor: 'pointer' }} onClick={() => navigate(`/staffing-requests/${req.id}`)}>
                        <td style={{ color: 'var(--color-text-subtle)', fontSize: 11 }}>{overallocated.length + pendingApprovals.length + i + 1}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-status-info)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--color-status-info)', fontWeight: 600, fontSize: 11 }}>Info</span>
                          </span>
                        </td>
                        <td>Staffing Request</td>
                        <td style={{ fontWeight: 500 }}>{req.role}</td>
                        <td style={{ fontSize: 11 }}>
                          <PriorityBadge priority={req.priority} /> · starts {req.startDate}
                        </td>
                        <td style={NUM}>{req.headcountFulfilled}/{req.headcountRequired}</td>
                        <td style={{ fontSize: 11 }}>Review & fill</td>
                        <td><Link to={`/staffing-requests/${req.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 600 }}>
                      <td></td>
                      <td colSpan={2} style={{ fontSize: 11 }}>{actionItemCount} total items</td>
                      <td colSpan={5}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-status-active)' }}>
              <span style={{ fontSize: 22 }}>{'\u2713'}</span>{' '}
              <span style={{ fontWeight: 600 }}>All clear</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginLeft: 8 }}>No overallocations, pending approvals, or open requests</span>
            </div>
          )}

          {/* ── SUPPORTING CHARTS GRID ── */}
          <div className="dashboard-main-grid">
            <SectionCard title="Resource Pool Utilization" collapsible chartExport={{ headers: ['Status', 'Count'], rows: [{ Status: 'Allocated', Count: String(allocatedPeople) }, { Status: 'Idle', Count: String(idlePeople) }] }}>
              <ResourcePoolUtilizationDonut allocated={allocatedPeople} idle={idlePeople} />
            </SectionCard>

            {pipelineData.some((row) => Object.keys(row).length > 1) ? (
              <SectionCard title="Demand Pipeline (Next 4 Weeks)" collapsible>
                <DemandPipelineChart data={pipelineData} />
              </SectionCard>
            ) : (
              <SectionCard title="Demand Pipeline (Next 4 Weeks)" collapsible>
                <EmptyState description="No future assignments are queued for the next 4 weeks." title="No upcoming demand" />
              </SectionCard>
            )}
          </div>

          {/* ── TEAM CAPACITY BY ORG UNIT ── */}
          {d.teamCapacitySummary.length > 0 && (
            <SectionCard title="Team Capacity by Org Unit" collapsible chartExport={{
              headers: ['Team', 'Members', 'Active Assignments', 'Active Projects', 'Overallocated', 'Unassigned'],
              rows: d.teamCapacitySummary.map((t) => ({ Team: t.teamName, Members: String(t.memberCount), 'Active Assignments': String(t.activeAssignmentCount), 'Active Projects': String(t.activeProjectCount), Overallocated: String(t.overallocatedPeopleCount), Unassigned: String(t.unassignedPeopleCount) })),
            }}>
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th style={NUM}>Members</th>
                      <th style={NUM}>Assignments</th>
                      <th style={NUM}>Projects</th>
                      <th style={NUM}>Overalloc</th>
                      <th style={NUM}>Unassigned</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.teamCapacitySummary.map((team) => (
                      <tr key={team.teamId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/teams/${team.teamId}`)}>
                        <td style={{ fontWeight: 500 }}>{team.teamName}</td>
                        <td style={NUM}>{team.memberCount}</td>
                        <td style={NUM}>{team.activeAssignmentCount}</td>
                        <td style={NUM}>{team.activeProjectCount}</td>
                        <td style={{ ...NUM, color: team.overallocatedPeopleCount > 0 ? 'var(--color-status-danger)' : 'inherit', fontWeight: team.overallocatedPeopleCount > 0 ? 600 : 400 }}>
                          {team.overallocatedPeopleCount}
                        </td>
                        <td style={{ ...NUM, color: team.unassignedPeopleCount > 0 ? 'var(--color-status-warning)' : 'inherit' }}>
                          {team.unassignedPeopleCount}
                        </td>
                        <td><Link to={`/teams/${team.teamId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── ALL ALLOCATION INDICATORS ── */}
          {d.allocationIndicators.length > 0 && (
            <SectionCard title="All Allocation Indicators" collapsible chartExport={{
              headers: ['Person', 'Team', 'Indicator', 'Allocation %'],
              rows: d.allocationIndicators.map((i) => ({ Person: i.displayName, Team: i.teamName, Indicator: i.indicator, 'Allocation %': String(i.totalAllocationPercent) })),
            }}>
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Team</th>
                      <th style={{ width: 100 }}>Indicator</th>
                      <th style={NUM}>Alloc %</th>
                      <th style={{ width: 80 }}>Bar</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.allocationIndicators.map((item) => (
                      <tr key={item.personId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/people/${item.personId}`)}>
                        <td style={{ fontWeight: 500 }}>{item.displayName}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{item.teamName}</td>
                        <td>
                          <span style={{ color: indicatorColor(item.indicator), fontWeight: 600, fontSize: 11 }}>{item.indicator}</span>
                        </td>
                        <td style={{ ...NUM, fontWeight: 600, color: indicatorColor(item.indicator) }}>{item.totalAllocationPercent}%</td>
                        <td>
                          <div style={{ background: 'var(--color-border)', borderRadius: 2, height: 6, width: '100%', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${Math.min(item.totalAllocationPercent, 100)}%`, borderRadius: 2,
                              background: indicatorColor(item.indicator),
                            }} />
                          </div>
                        </td>
                        <td>
                          <Link to={`/people/${item.personId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── FUTURE PIPELINE ── */}
          {d.futureAssignmentPipeline.length > 0 && (
            <SectionCard title={`Future Pipeline (${d.futureAssignmentPipeline.length})`} collapsible chartExport={{
              headers: ['Person', 'Project', 'Status', 'Start Date'],
              rows: d.futureAssignmentPipeline.map((i) => ({ Person: i.personDisplayName, Project: i.projectName, Status: i.approvalState, 'Start Date': i.startDate.slice(0, 10) })),
            }}>
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Project</th>
                      <th style={{ width: 90 }}>Status</th>
                      <th style={{ width: 90 }}>Start Date</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.futureAssignmentPipeline.map((item) => (
                      <tr key={item.assignmentId} style={{ cursor: 'pointer' }} onClick={() => navigate(`/assignments/${item.assignmentId}`)}>
                        <td style={{ fontWeight: 500 }}>{item.personDisplayName}</td>
                        <td>{item.projectName}</td>
                        <td><span style={{ fontSize: 11, fontWeight: 600 }}>{item.approvalState}</span></td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{formatDate(item.startDate)}</td>
                        <td><Link to={`/assignments/${item.assignmentId}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: 10, color: 'var(--color-accent)' }}>View</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          {/* ── IDLE RESOURCES (quick-assign enabled) ── */}
          {d.peopleWithoutAssignments.length > 0 && (
            <SectionCard title={`Idle Resources (${d.peopleWithoutAssignments.length})`} collapsible>
              <div style={{ overflow: 'auto' }}>
                <table className="dash-compact-table">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Team</th>
                      <th style={NUM}>Alloc %</th>
                      <th style={{ width: 100 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.peopleWithoutAssignments.map((person) => (
                      <tr key={person.personId}>
                        <td style={{ fontWeight: 500 }}>{person.displayName}</td>
                        <td style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{person.teamName}</td>
                        <td style={NUM}>{person.totalAllocationPercent}%</td>
                        <td>
                          <button
                            className="button button--secondary button--sm"
                            onClick={() => {
                              setQuickForm((p) => ({ ...p, personId: person.personId }));
                              setShowModal(true);
                            }}
                            type="button"
                            style={{ fontSize: 10 }}
                          >
                            Quick assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}

          <RecentActivityRail role="rm" />

          {/* ── DATA FRESHNESS ── */}
          <div className="data-freshness">
            Updated {formatDistanceToNow(lastFetch, { addSuffix: true })} {'\u00B7'}{' '}
            <button onClick={refetch} type="button">Refresh</button>
            {' '}
            <TipBalloon tip="Shows when data was last loaded. Click Refresh to pull the latest numbers from the server." arrow="top" />
          </div>
        </>
      ) : null}

      {/* ── QUICK ASSIGN MODAL ── */}
      {showModal ? (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: '8px', padding: '24px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0 }}>Quick Assignment</h2>
              <button className="button button--secondary" onClick={() => setShowModal(false)} type="button">{'\u2715'} Close</button>
            </div>
            {quickForm.error ? <ErrorState description={quickForm.error} /> : null}
            {quickForm.success ? <div className="success-banner" style={{ marginBottom: '12px' }}>{quickForm.success}</div> : null}
            <form onSubmit={(e) => { void handleQuickAssign(e); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label className="field">
                <span className="field__label">Person</span>
                {managedPeople.length > 0 ? (
                  <select className="field__control" onChange={(e) => setQuickForm((p) => ({ ...p, personId: e.target.value }))} required value={quickForm.personId}>
                    <option value="">Select person...</option>
                    {managedPeople.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                  </select>
                ) : (
                  <input className="field__control" onChange={(e) => setQuickForm((p) => ({ ...p, personId: e.target.value }))} placeholder="Person UUID" required type="text" value={quickForm.personId} />
                )}
              </label>
              <label className="field">
                <span className="field__label">Project</span>
                {projects.length > 0 ? (
                  <select className="field__control" onChange={(e) => setQuickForm((p) => ({ ...p, projectId: e.target.value }))} required value={quickForm.projectId}>
                    <option value="">Select project...</option>
                    {projects.map((proj) => <option key={proj.id} value={proj.id}>{proj.name} ({proj.projectCode})</option>)}
                  </select>
                ) : (
                  <input className="field__control" onChange={(e) => setQuickForm((p) => ({ ...p, projectId: e.target.value }))} placeholder="Project UUID" required type="text" value={quickForm.projectId} />
                )}
              </label>
              <label className="field">
                <span className="field__label">Staffing Role</span>
                <input className="field__control" onChange={(e) => setQuickForm((p) => ({ ...p, staffingRole: e.target.value }))} placeholder="e.g. Lead Engineer" required type="text" value={quickForm.staffingRole} />
              </label>
              <label className="field">
                <span className="field__label">Allocation %</span>
                <input className="field__control" max={100} min={1} onChange={(e) => setQuickForm((p) => ({ ...p, allocationPercent: e.target.value }))} required type="number" value={quickForm.allocationPercent} />
              </label>
              <label className="field">
                <span className="field__label">Start Date</span>
                <input className="field__control" onChange={(e) => setQuickForm((p) => ({ ...p, startDate: e.target.value }))} required type="date" value={quickForm.startDate} />
              </label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button className="button" disabled={quickForm.isSubmitting} type="submit">
                  {quickForm.isSubmitting ? 'Submitting...' : 'Create assignment'}
                </button>
                <button className="button button--secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
