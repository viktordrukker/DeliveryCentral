import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { useDrilldown } from '@/app/drilldown-context';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { GovernanceOverridePanel } from '@/components/common/GovernanceOverridePanel';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { SectionCard } from '@/components/common/SectionCard';
import { AuditTimeline } from '@/components/common/AuditTimeline';
import { TabBar } from '@/components/common/TabBar';
import { formatDate as formatDateLib, formatDateShort } from '@/lib/format-date';
import { EvidenceTimelineBar } from '@/components/charts/EvidenceTimelineBar';
import { BudgetBurnDownChart } from '@/components/charts/BudgetBurnDownChart';
import { CostBreakdownDonut } from '@/components/charts/CostBreakdownDonut';
import { ForecastChart } from '@/components/charts/ForecastChart';
import {
  ProjectTeamAssignmentForm,
  ProjectTeamAssignmentFormValues,
} from '@/components/projects/ProjectTeamAssignmentForm';
import { useAuth } from '@/app/auth-context';
import { hasAnyStoredRole } from '@/features/auth/token-claims';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { useProjectDetails } from '@/features/projects/useProjectDetails';
import {
  AssignProjectTeamResponse,
  ProjectClosureResponse,
  activateProject,
  assignTeamToProject,
  closeProject,
  closeProjectOverride,
  updateProject,
} from '@/lib/api/project-registry';
import { fetchTeams, TeamSummary } from '@/lib/api/teams';
import { fetchAssignments, AssignmentDirectoryItem } from '@/lib/api/assignments';
import { fetchWorkEvidence, WorkEvidenceItem } from '@/lib/api/work-evidence';
import { fetchProjectHealth, ProjectHealthDto } from '@/lib/api/project-health';
import { fetchBusinessAudit, BusinessAuditRecord } from '@/lib/api/business-audit';
import {
  ProjectBudgetDashboard,
  fetchProjectBudgetDashboard,
  upsertProjectBudget,
} from '@/lib/api/project-budget';
import { ApiError } from '@/lib/api/http-client';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';

const PROJECT_MANAGE_ROLES = ['project_manager', 'delivery_manager', 'director', 'admin'];

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'team', label: 'Team' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'budget', label: 'Budget' },
  { id: 'history', label: 'History' },
];

const ROLE_COLORS: Record<string, string> = {
  default: 'var(--color-chart-1, #6366f1)',
  'delivery lead': 'var(--color-status-active, #22c55e)',
  engineer: 'var(--color-chart-2, #3b82f6)',
  'lead engineer': 'var(--color-status-warning, #f59e0b)',
  'product owner': 'var(--color-chart-4, #ec4899)',
  'project manager': 'var(--color-chart-5, #8b5cf6)',
};

function roleColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] ?? ROLE_COLORS['default'];
}

export function ProjectDetailsPlaceholderPage(): JSX.Element {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'summary';

  const { principal } = useAuth();
  const canManageProject =
    principal?.roles.some((r) => PROJECT_MANAGE_ROLES.includes(r)) ?? false;
  const canManageBudget = principal?.roles.some((r) => ['admin', 'project_manager', 'delivery_manager', 'director'].includes(r)) ?? false;
  const state = useProjectDetails(id);
  const { setCurrentLabel } = useDrilldown();
  const tokenState = useStoredApiToken();
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [projectActionError, setProjectActionError] = useState<string | null>(null);
  const [projectActionSuccess, setProjectActionSuccess] = useState<string | null>(null);
  const [assignTeamResult, setAssignTeamResult] = useState<AssignProjectTeamResponse | null>(null);
  const [closeResult, setCloseResult] = useState<ProjectClosureResponse | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonError, setOverrideReasonError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isOverrideClosing, setIsOverrideClosing] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAssigningTeam, setIsAssigningTeam] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [assignTeamValues, setAssignTeamValues] = useState<ProjectTeamAssignmentFormValues>({
    actorId: '',
    allocationPercent: '100',
    endDate: '',
    note: '',
    staffingRole: '',
    startDate: '',
    teamId: '',
  });
  const [assignTeamErrors, setAssignTeamErrors] = useState<
    Partial<Record<keyof ProjectTeamAssignmentFormValues, string>>
  >({});

  // Team tab state
  const [teamAssignments, setTeamAssignments] = useState<AssignmentDirectoryItem[]>([]);
  const [teamAssignmentsLoading, setTeamAssignmentsLoading] = useState(false);
  const [teamAssignmentsError, setTeamAssignmentsError] = useState<string | null>(null);

  // Evidence tab state
  const [evidenceItems, setEvidenceItems] = useState<WorkEvidenceItem[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);

  // Health state
  const [health, setHealth] = useState<ProjectHealthDto | null>(null);
  const [budgetHealthColor, setBudgetHealthColor] = useState<'green' | 'yellow' | 'red' | null>(null);

  // History tab state
  const [historyEvents, setHistoryEvents] = useState<BusinessAuditRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Budget tab state
  const [budgetDashboard, setBudgetDashboard] = useState<ProjectBudgetDashboard | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [budgetFiscalYear, setBudgetFiscalYear] = useState<number>(new Date().getFullYear());
  const [budgetCapex, setBudgetCapex] = useState('');
  const [budgetOpex, setBudgetOpex] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetSaveError, setBudgetSaveError] = useState<string | null>(null);
  const [budgetSaveSuccess, setBudgetSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (state.data?.name) setCurrentLabel(state.data.name);
  }, [state.data?.name, setCurrentLabel]);

  useEffect(() => {
    let active = true;

    setTeamsLoading(true);
    setTeamsError(null);

    void fetchTeams()
      .then((response) => {
        if (!active) return;
        setTeams(response.items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTeamsError(error instanceof Error ? error.message : 'Failed to load teams.');
      })
      .finally(() => {
        if (active) setTeamsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Load health score when project is loaded
  useEffect(() => {
    if (!id) return;
    let active = true;

    void fetchProjectHealth(id)
      .then((data) => {
        if (active) setHealth(data);
      })
      .catch(() => {
        // Health is optional — ignore errors
      });

    // Load budget health color for summary badge
    void fetchProjectBudgetDashboard(id)
      .then((data) => {
        if (active) setBudgetHealthColor(data.healthColor);
      })
      .catch(() => {
        // Budget health is optional — ignore errors
      });

    return () => {
      active = false;
    };
  }, [id]);

  // Load assignments when Team or Timeline tab is active
  useEffect(() => {
    if (!id || (activeTab !== 'team' && activeTab !== 'timeline')) return;
    let active = true;

    setTeamAssignmentsLoading(true);
    setTeamAssignmentsError(null);

    void fetchAssignments({ projectId: id })
      .then((response) => {
        if (!active) return;
        setTeamAssignments(response.items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setTeamAssignmentsError(error instanceof Error ? error.message : 'Failed to load assignments.');
      })
      .finally(() => {
        if (active) setTeamAssignmentsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, activeTab]);

  // Load evidence when Evidence tab is active
  useEffect(() => {
    if (!id || activeTab !== 'evidence') return;
    let active = true;

    setEvidenceLoading(true);
    setEvidenceError(null);

    void fetchWorkEvidence({ projectId: id })
      .then((response) => {
        if (!active) return;
        setEvidenceItems(response.items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setEvidenceError(error instanceof Error ? error.message : 'Failed to load evidence.');
      })
      .finally(() => {
        if (active) setEvidenceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, activeTab]);

  // Load budget dashboard when Budget tab is active
  useEffect(() => {
    if (!id || activeTab !== 'budget') return;
    let active = true;

    setBudgetLoading(true);
    setBudgetError(null);

    void fetchProjectBudgetDashboard(id)
      .then((data) => {
        if (!active) return;
        setBudgetDashboard(data);
        if (data.budget) {
          setBudgetFiscalYear(data.budget.fiscalYear);
          setBudgetCapex(String(data.budget.capex));
          setBudgetOpex(String(data.budget.opex));
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        setBudgetError(error instanceof Error ? error.message : 'Failed to load budget dashboard.');
      })
      .finally(() => {
        if (active) setBudgetLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, activeTab]);

  // Load history when History tab is active
  useEffect(() => {
    if (!id || activeTab !== 'history') return;
    let active = true;

    setHistoryLoading(true);
    setHistoryError(null);

    void fetchBusinessAudit({ targetEntityType: 'Project', targetEntityId: id, pageSize: 100 })
      .then((data) => {
        if (!active) return;
        setHistoryEvents(data.items);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setHistoryError(error instanceof Error ? error.message : 'Failed to load history.');
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, activeTab]);

  const teamOptions = useMemo(
    () =>
      teams
        .filter((team) => team.orgUnit)
        .map((team) => ({
          label: team.name,
          meta: team.orgUnit ? team.orgUnit.name : 'No org unit',
          value: team.id,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [teams],
  );

  const canActivate = state.data?.status === 'DRAFT';
  const canClose = state.data?.status === 'ACTIVE';
  const canUseProjectOverride = hasAnyStoredRole(tokenState.token, ['director', 'admin']);
  const canShowCloseOverride =
    canUseProjectOverride &&
    projectActionError?.includes('Use the explicit override flow with a reason to close anyway.') ===
      true;

  function setTab(tab: string): void {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }

  async function handleActivate(): Promise<void> {
    if (!id || !canActivate || isActivating) return;

    setIsActivating(true);
    setProjectActionError(null);
    setProjectActionSuccess(null);
    setCloseResult(null);
    setOverrideError(null);
    setOverrideSuccess(null);

    try {
      const response = await activateProject(id);
      setProjectActionSuccess(`Project ${response.name} is now ${humanizeEnum(response.status, PROJECT_STATUS_LABELS)}.`);
      await state.reload();
    } catch (error: unknown) {
      setProjectActionError(
        error instanceof Error ? error.message : 'Failed to activate project.',
      );
    } finally {
      setIsActivating(false);
    }
  }

  async function handleSaveBudget(): Promise<void> {
    if (!id) return;
    setBudgetSaving(true);
    setBudgetSaveError(null);
    setBudgetSaveSuccess(null);

    try {
      await upsertProjectBudget(id, {
        fiscalYear: budgetFiscalYear,
        capexBudget: parseFloat(budgetCapex) || 0,
        opexBudget: parseFloat(budgetOpex) || 0,
      });
      setBudgetSaveSuccess('Budget saved successfully.');
      // Reload dashboard
      const data = await fetchProjectBudgetDashboard(id);
      setBudgetDashboard(data);
    } catch (error: unknown) {
      setBudgetSaveError(error instanceof Error ? error.message : 'Failed to save budget.');
    } finally {
      setBudgetSaving(false);
    }
  }

  function handleCloseRequest(): void {
    if (!id || !canClose || isClosing) return;
    setConfirmCloseOpen(true);
  }

  async function handleClose(): Promise<void> {
    if (!id || !canClose || isClosing) return;

    setIsClosing(true);
    setProjectActionError(null);
    setProjectActionSuccess(null);
    setAssignTeamResult(null);
    setOverrideError(null);
    setOverrideSuccess(null);

    try {
      const response = await closeProject(id);
      setCloseResult(response);
      setProjectActionSuccess(
        `Project ${response.name} closed with ${response.workspend.totalMandays.toFixed(2)} mandays captured from work evidence.`,
      );
      setOverrideReason('');
      setOverrideReasonError(null);
      await state.reload();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to close project.';
      setProjectActionError(message);

      if (!(error instanceof ApiError) || error.status !== 409) {
        setOverrideReason('');
        setOverrideReasonError(null);
      }
    } finally {
      setIsClosing(false);
    }
  }

  function handleCloseOverrideRequest(): void {
    if (!id || !state.data || isOverrideClosing || !canUseProjectOverride) return;
    const trimmedReason = overrideReason.trim();
    if (!trimmedReason) {
      setOverrideReasonError('Override reason is required.');
      return;
    }
    setConfirmOverrideOpen(true);
  }

  async function handleCloseOverride(): Promise<void> {
    if (!id || !state.data || isOverrideClosing || !canUseProjectOverride) return;

    setIsOverrideClosing(true);
    setOverrideReasonError(null);
    setOverrideError(null);
    setOverrideSuccess(null);
    setProjectActionSuccess(null);

    try {
      const response = await closeProjectOverride(id, {
        expectedProjectVersion: state.data.version,
        reason: overrideReason.trim(),
      });

      setCloseResult(response);
      setProjectActionError(null);
      setOverrideSuccess(
        `Closure override applied for ${response.name}. The project is closed and the reason is now part of the audit trail.`,
      );
      setProjectActionSuccess(
        `Project ${response.name} closed by authorized override with ${response.workspend.totalMandays.toFixed(2)} mandays captured from work evidence.`,
      );
      setOverrideReason('');
      await state.reload();
    } catch (error: unknown) {
      setOverrideError(
        error instanceof Error ? error.message : 'Failed to apply project closure override.',
      );
    } finally {
      setIsOverrideClosing(false);
    }
  }

  async function handleUpdateProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!id || isUpdating) return;

    setIsUpdating(true);
    setProjectActionError(null);
    setProjectActionSuccess(null);

    try {
      await updateProject(id, {
        ...(editName.trim() ? { name: editName.trim() } : {}),
        ...(editDescription.trim() ? { description: editDescription.trim() } : {}),
      });
      setProjectActionSuccess('Project metadata updated.');
      setEditName('');
      setEditDescription('');
      setIsEditing(false);
      await state.reload();
    } catch (error: unknown) {
      setProjectActionError(
        error instanceof Error ? error.message : 'Failed to update project.',
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAssignTeam(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!id || isAssigningTeam) return;

    const nextErrors = validateAssignTeam(assignTeamValues);
    setAssignTeamErrors(nextErrors);
    setProjectActionError(null);
    setProjectActionSuccess(null);

    if (Object.keys(nextErrors).length > 0) return;

    const selectedTeam = teams.find((team) => team.id === assignTeamValues.teamId);

    if (!selectedTeam?.orgUnit) {
      setProjectActionError(
        'Selected team does not have an operational org unit mapping for team assignment.',
      );
      return;
    }

    setIsAssigningTeam(true);
    setAssignTeamResult(null);
    setCloseResult(null);

    try {
      const response = await assignTeamToProject(id, {
        actorId: assignTeamValues.actorId.trim(),
        allocationPercent: Number(assignTeamValues.allocationPercent),
        ...(assignTeamValues.endDate ? { endDate: toIsoDate(assignTeamValues.endDate) } : {}),
        ...(assignTeamValues.note.trim() ? { note: assignTeamValues.note.trim() } : {}),
        staffingRole: assignTeamValues.staffingRole.trim(),
        startDate: toIsoDate(assignTeamValues.startDate),
        teamOrgUnitId: selectedTeam.orgUnit.id,
      });

      setAssignTeamResult(response);
      setProjectActionSuccess(
        `Assigned team ${response.teamName}. Created ${response.createdCount} assignment(s) and skipped ${response.skippedDuplicateCount}.`,
      );
      setAssignTeamValues({
        actorId: '',
        allocationPercent: '100',
        endDate: '',
        note: '',
        staffingRole: '',
        startDate: '',
        teamId: '',
      });
      setAssignTeamErrors({});
      await state.reload();
    } catch (error: unknown) {
      setProjectActionError(
        error instanceof Error ? error.message : 'Failed to assign team to project.',
      );
    } finally {
      setIsAssigningTeam(false);
    }
  }

  // Evidence chart data: group by activity date
  const evidenceChartData = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const item of evidenceItems) {
      const date = item.activityDate?.slice(0, 10) ?? item.recordedAt?.slice(0, 10) ?? 'unknown';
      byDate.set(date, (byDate.get(date) ?? 0) + item.effortHours);
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, hours]) => ({ date, hours }));
  }, [evidenceItems]);

  // Timeline/Gantt data from assignments
  const ganttData = useMemo(() => {
    const now = Date.now();
    return teamAssignments
      .filter((a) => a.startDate)
      .map((a) => {
        const start = new Date(a.startDate).getTime();
        const end = a.endDate ? new Date(a.endDate).getTime() : now + 90 * 86400 * 1000;
        return {
          color: roleColor(a.staffingRole),
          duration: Math.max(1, Math.round((end - start) / 86400000)),
          label: `${a.person.displayName} (${a.staffingRole})`,
          startDaysFromNow: Math.round((start - now) / 86400000),
        };
      });
  }, [teamAssignments]);

  return (
    <PageContainer testId="project-details-page">
      <ConfirmDialog
        confirmLabel="Confirm close"
        message="Close this project? The project history is preserved and the workspend summary will be generated."
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => {
          setConfirmCloseOpen(false);
          void handleClose();
        }}
        open={confirmCloseOpen}
        title="Close Project"
      />
      <ConfirmDialog
        confirmLabel="Apply override"
        message="Apply the project closure override? This closes the project despite blocking staffing conditions and records the reason in audit history."
        onCancel={() => setConfirmOverrideOpen(false)}
        onConfirm={() => {
          setConfirmOverrideOpen(false);
          void handleCloseOverride();
        }}
        open={confirmOverrideOpen}
        title="Confirm Closure Override"
      />
      <PageHeader
        actions={
          id ? (
            <>
              <Link className="button button--secondary" to={`/projects/${id}/dashboard`}>
                Open project dashboard
              </Link>
              {canManageProject && canActivate ? (
                <button
                  className="button button--secondary"
                  disabled={isActivating}
                  onClick={() => void handleActivate()}
                  type="button"
                >
                  {isActivating ? 'Activating...' : 'Activate project'}
                </button>
              ) : null}
              {canManageProject && canClose ? (
                <button
                  className="button"
                  disabled={isClosing}
                  onClick={handleCloseRequest}
                  type="button"
                >
                  {isClosing ? 'Closing...' : 'Close project'}
                </button>
              ) : null}
            </>
          ) : null
        }
        eyebrow="Projects"
        subtitle="Operate the project lifecycle, review external links, and drive team staffing from the internal registry."
        title={state.data?.name ?? 'Project Details'}
      />

      {state.isLoading ? <LoadingState label="Loading project details..." variant="skeleton" skeletonType="detail" /> : null}
      {state.notFound ? (
        <SectionCard>
          <EmptyState
            description={`No project was found for ${id ?? 'the requested id'}.`}
            title="Project not found"
          />
        </SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}
      {projectActionError ? <ErrorState description={projectActionError} /> : null}
      {projectActionSuccess ? <div className="success-banner">{projectActionSuccess}</div> : null}

      {state.data ? (
        <>
          <div className="kpi-strip">
            <SummaryCard label="Project" value={state.data.name} />
            <SummaryCard label="Project Code" value={state.data.projectCode} />
            <SummaryCard label="Status" value={humanizeEnum(state.data.status, PROJECT_STATUS_LABELS)} />
            <SummaryCard
              label="Current Assignments"
              value={String(state.data.assignmentCount)}
            />
          </div>

          <TabBar activeTab={activeTab} onTabChange={setTab} tabs={TABS} />

          {/* ── Summary Tab ─────────────────────────────────────────── */}
          {activeTab === 'summary' ? (
            <div className="dashboard-main-grid">
              <SectionCard title="Project Summary">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {health ? (
                    <ProjectHealthBadge grade={health.grade} score={health.score} />
                  ) : null}
                  {budgetHealthColor ? (
                    <span
                      aria-label={`Budget: ${budgetHealthColor === 'green' ? 'On Track' : budgetHealthColor === 'yellow' ? 'At Risk' : 'Over Budget'}`}
                      style={{
                        background: budgetHealthColor === 'green' ? '#dcfce7' : budgetHealthColor === 'yellow' ? '#fef9c3' : '#fee2e2',
                        border: `1px solid ${budgetHealthColor === 'green' ? '#86efac' : budgetHealthColor === 'yellow' ? '#fde047' : '#fca5a5'}`,
                        borderRadius: 4,
                        color: budgetHealthColor === 'green' ? '#15803d' : budgetHealthColor === 'yellow' ? '#854d0e' : '#dc2626',
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '2px 8px',
                      }}
                    >
                      Budget: {budgetHealthColor === 'green' ? 'On Track' : budgetHealthColor === 'yellow' ? 'At Risk' : 'Over Budget'}
                    </span>
                  ) : null}
                </div>

                {!isEditing ? (
                  <>
                    <dl className="details-list">
                      <div>
                        <dt>Name</dt>
                        <dd>{state.data.name}</dd>
                      </div>
                      <div>
                        <dt>Project Code</dt>
                        <dd>{state.data.projectCode}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{humanizeEnum(state.data.status, PROJECT_STATUS_LABELS)}</dd>
                      </div>
                      <div>
                        <dt>Start Date</dt>
                        <dd>{formatDate(state.data.startDate)}</dd>
                      </div>
                      <div>
                        <dt>Planned End Date</dt>
                        <dd>{formatDate(state.data.plannedEndDate)}</dd>
                      </div>
                      <div>
                        <dt>Project Manager</dt>
                        <dd>
                          {state.data.projectManagerId ? (
                            <Link to={`/people/${state.data.projectManagerId}`}>
                              {state.data.projectManagerDisplayName ?? state.data.projectManagerId}
                            </Link>
                          ) : (
                            'Not assigned'
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Description</dt>
                        <dd>{state.data.description ?? 'No description available'}</dd>
                      </div>
                    </dl>
                    {canManageProject ? (
                      <div style={{ marginTop: 12 }}>
                        <button
                          className="button button--secondary"
                          onClick={() => {
                            setEditName('');
                            setEditDescription('');
                            setIsEditing(true);
                          }}
                          type="button"
                        >
                          Edit
                        </button>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <form onSubmit={(e) => void handleUpdateProject(e)}>
                    <div className="form-grid">
                      <label className="field">
                        <span className="field__label">Name (leave blank to keep current)</span>
                        <input
                          className="field__control"
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder={state.data.name}
                          type="text"
                          value={editName}
                        />
                      </label>
                      <label className="field">
                        <span className="field__label">Description</span>
                        <input
                          className="field__control"
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder={state.data.description ?? 'No description'}
                          type="text"
                          value={editDescription}
                        />
                      </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: 12 }}>
                      <button
                        className="button button--primary"
                        disabled={isUpdating}
                        type="submit"
                      >
                        {isUpdating ? 'Saving...' : 'Save changes'}
                      </button>
                      <button
                        className="button button--secondary"
                        onClick={() => setIsEditing(false)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </SectionCard>

              <SectionCard title="External Links">
                {state.data.externalLinks.length === 0 ? (
                  <EmptyState
                    description="This internal project does not currently have any external system links."
                    title="No external links"
                  />
                ) : (
                  <div className="details-list">
                    {state.data.externalLinks.map((link) => (
                      <div className="project-link-card" key={`${link.provider}-${link.externalProjectKey}`}>
                        <div className="project-link-card__title">
                          {link.provider} / {link.externalProjectName}
                        </div>
                        <div className="project-link-card__meta">
                          Key: {link.externalProjectKey}
                        </div>
                        <div className="project-link-card__meta">
                          Environment: {link.providerEnvironment ?? 'Not specified'}
                        </div>
                        <div className="project-link-card__meta">
                          State: {link.archived ? 'Archived' : 'Active'}
                        </div>
                        {link.externalUrl ? (
                          <a
                            className="project-link-card__anchor"
                            href={link.externalUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            Open external link
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Lifecycle Controls">
                <div className="details-list">
                  <div>
                    <dt>Lifecycle State</dt>
                    <dd>{humanizeEnum(state.data.status, PROJECT_STATUS_LABELS)}</dd>
                  </div>
                  <div>
                    <dt>Activate</dt>
                    <dd>
                      {canActivate
                        ? 'Draft projects can be activated here before staffing begins.'
                        : 'Activation is only available while the project is in DRAFT.'}
                    </dd>
                  </div>
                  <div>
                    <dt>Close</dt>
                    <dd>
                      {canClose
                        ? 'Closing captures workspend from evidence and preserves project history.'
                        : 'Closure is only available while the project is ACTIVE.'}
                    </dd>
                  </div>
                </div>

                {!tokenState.hasToken ? (
                  <AuthTokenField
                    hasToken={tokenState.hasToken}
                    onClear={tokenState.clearToken}
                    onSave={tokenState.saveToken}
                    token={tokenState.token}
                  />
                ) : null}

                {canShowCloseOverride ? (
                  <GovernanceOverridePanel
                    actionLabel="Close project with override"
                    confirmLabel="This override should only be used by authorized governance roles after reviewing the remaining staffing impact."
                    error={overrideError}
                    impactMessage="The project will close even though active assignments still exist. Closure history, workspend, and override reason remain auditable."
                    isSubmitting={isOverrideClosing}
                    onReasonChange={(value) => {
                      setOverrideReason(value);
                      setOverrideReasonError(null);
                    }}
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleCloseOverrideRequest();
                    }}
                    reason={overrideReason}
                    reasonError={overrideReasonError}
                    success={overrideSuccess}
                    subtitle="Normal closure is blocked because staffing is still active. The override path remains exceptional and is intended for director or admin use only."
                    title="Project Closure Override"
                  />
                ) : null}

                {closeResult ? (
                  <div className="project-closure-summary" data-testid="project-closure-summary">
                    <h4>Closure Workspend Summary</h4>
                    <p>Total mandays: {closeResult.workspend.totalMandays.toFixed(2)}</p>
                    <div className="project-bucket-grid">
                      <div>
                        <div className="project-bucket-grid__title">By role</div>
                        {closeResult.workspend.byRole.length === 0 ? (
                          <p className="project-bucket-grid__empty">No role workspend captured.</p>
                        ) : (
                          <ul className="project-bucket-list">
                            {closeResult.workspend.byRole.map((bucket) => (
                              <li key={`role-${bucket.key}`}>
                                <span>{bucket.key}</span>
                                <span>{bucket.mandays.toFixed(2)} md</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <div className="project-bucket-grid__title">By skillset</div>
                        {closeResult.workspend.bySkillset.length === 0 ? (
                          <p className="project-bucket-grid__empty">No skillset workspend captured.</p>
                        ) : (
                          <ul className="project-bucket-list">
                            {closeResult.workspend.bySkillset.map((bucket) => (
                              <li key={`skill-${bucket.key}`}>
                                <span>{bucket.key}</span>
                                <span>{bucket.mandays.toFixed(2)} md</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </SectionCard>

              <SectionCard title="Operational Views">
                <div className="details-list">
                  <div>
                    <dt>Project dashboard</dt>
                    <dd>
                      <Link className="button button--secondary" to={`/projects/${state.data.id}/dashboard`}>
                        Open staffing and anomaly dashboard
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt>Current assignments</dt>
                    <dd>{state.data.assignmentCount} active or scheduled assignment records</dd>
                  </div>
                  <div>
                    <dt>External links</dt>
                    <dd>{state.data.externalLinksCount} linked external project reference(s)</dd>
                  </div>
                </div>
              </SectionCard>
            </div>
          ) : null}

          {/* ── Team Tab ─────────────────────────────────────────────── */}
          {activeTab === 'team' ? (
            <div className="dashboard-main-grid">
              <SectionCard title="Team Assignments">
                {teamAssignmentsLoading ? <LoadingState label="Loading assignments..." variant="skeleton" skeletonType="detail" /> : null}
                {teamAssignmentsError ? <ErrorState description={teamAssignmentsError} /> : null}
                {!teamAssignmentsLoading && !teamAssignmentsError ? (
                  teamAssignments.length === 0 ? (
                    <EmptyState
                      description="No approved assignments found for this project."
                      title="No team members"
                    />
                  ) : (
                    <table className="dash-compact-table">
                      <thead>
                        <tr>
                          <th>Person</th>
                          <th>Role</th>
                          <th>Allocation %</th>
                          <th>From</th>
                          <th>To</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamAssignments.map((a) => (
                          <tr key={a.id}>
                            <td>
                              <Link to={`/people/${a.person.id}`}>{a.person.displayName}</Link>
                            </td>
                            <td>{a.staffingRole}</td>
                            <td>{a.allocationPercent}%</td>
                            <td>{formatDateShort(a.startDate)}</td>
                            <td>{a.endDate ? formatDateShort(a.endDate) : '—'}</td>
                            <td>{a.approvalState}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : null}
              </SectionCard>

              {canManageProject ? (
                <SectionCard title="Assign Team To Project">
                  <p className="dictionary-editor__copy">
                    Team expansion creates normal person-level assignments so individual staffing
                    traceability remains intact.
                  </p>

                  {!tokenState.hasToken ? (
                    <AuthTokenField
                      hasToken={tokenState.hasToken}
                      onClear={tokenState.clearToken}
                      onSave={tokenState.saveToken}
                      token={tokenState.token}
                    />
                  ) : null}

                  {teamsLoading ? <LoadingState label="Loading teams..." variant="skeleton" skeletonType="detail" /> : null}
                  {teamsError ? <ErrorState description={teamsError} /> : null}

                  {!teamsLoading && !teamsError ? (
                    teamOptions.length > 0 ? (
                      <ProjectTeamAssignmentForm
                        errors={assignTeamErrors}
                        isSubmitting={isAssigningTeam}
                        onChange={(field, value) => {
                          setAssignTeamValues((current) => ({
                            ...current,
                            [field]: value,
                          }));
                          setAssignTeamErrors((current) => ({
                            ...current,
                            [field]: undefined,
                          }));
                        }}
                        onSubmit={handleAssignTeam}
                        teamOptions={teamOptions}
                        values={assignTeamValues}
                      />
                    ) : (
                      <EmptyState
                        description="Only teams with an operational org-unit mapping can be expanded into assignments."
                        title="No assignable teams"
                      />
                    )
                  ) : null}

                  {assignTeamResult ? (
                    <div className="assignment-bulk-results" data-testid="assign-team-result">
                      <div className="assignment-bulk-results__summary">
                        <div>
                          <strong>Created:</strong> {assignTeamResult.createdCount}
                        </div>
                        <div>
                          <strong>Skipped duplicates:</strong> {assignTeamResult.skippedDuplicateCount}
                        </div>
                        <div>
                          <strong>Team:</strong> {assignTeamResult.teamName}
                        </div>
                      </div>

                      <div className="assignment-bulk-results__grid">
                        <div>
                          <h4>Created assignments</h4>
                          {assignTeamResult.createdAssignments.length === 0 ? (
                            <p>No assignments were created.</p>
                          ) : (
                            <ul className="assignment-result-list">
                              {assignTeamResult.createdAssignments.map((item) => (
                                <li key={item.assignmentId}>
                                  {item.personName} ({item.assignmentId})
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div>
                          <h4>Skipped duplicates</h4>
                          {assignTeamResult.skippedDuplicates.length === 0 ? (
                            <p>No duplicate conflicts were detected.</p>
                          ) : (
                            <ul className="assignment-result-list">
                              {assignTeamResult.skippedDuplicates.map((item) => (
                                <li key={`${item.personId}-${item.reason}`}>
                                  {item.personName}: {item.reason}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </SectionCard>
              ) : null}
            </div>
          ) : null}

          {/* ── Timeline Tab ─────────────────────────────────────────── */}
          {activeTab === 'timeline' ? (
            <SectionCard title="Assignment Timeline">
              {teamAssignmentsLoading ? <LoadingState label="Loading timeline..." variant="skeleton" skeletonType="detail" /> : null}
              {teamAssignmentsError ? <ErrorState description={teamAssignmentsError} /> : null}
              {!teamAssignmentsLoading && !teamAssignmentsError ? (
                ganttData.length === 0 ? (
                  <EmptyState
                    description="No approved assignments with date ranges to visualize."
                    title="No timeline data"
                  />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <svg
                      height={ganttData.length * 36 + 40}
                      width="100%"
                      style={{ minWidth: 500 }}
                      viewBox={`0 0 700 ${ganttData.length * 36 + 40}`}
                    >
                      {ganttData.map((row, index) => {
                        const y = index * 36 + 20;
                        const barWidth = Math.max(20, Math.min(400, (row.duration / 365) * 400));
                        const barX = 200 + Math.max(0, Math.min(200, (row.startDaysFromNow / 365) * 200));
                        return (
                          <g key={row.label}>
                            <text
                              dominantBaseline="middle"
                              fontSize={11}
                              textAnchor="end"
                              x={195}
                              y={y + 10}
                            >
                              {row.label.length > 28 ? `${row.label.slice(0, 26)}…` : row.label}
                            </text>
                            <rect
                              fill={row.color}
                              height={20}
                              opacity={0.85}
                              rx={3}
                              width={barWidth}
                              x={barX}
                              y={y}
                            >
                              <title>{`${row.label}: ${row.duration} days`}</title>
                            </rect>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )
              ) : null}
            </SectionCard>
          ) : null}

          {/* ── Evidence Tab ─────────────────────────────────────────── */}
          {activeTab === 'evidence' ? (
            <div className="dashboard-main-grid">
              <SectionCard title="Work Evidence">
                {evidenceLoading ? <LoadingState label="Loading evidence..." variant="skeleton" skeletonType="detail" /> : null}
                {evidenceError ? <ErrorState description={evidenceError} /> : null}
                {!evidenceLoading && !evidenceError ? (
                  evidenceItems.length === 0 ? (
                    <EmptyState
                      description="No work evidence has been logged for this project."
                      title="No evidence"
                    />
                  ) : (
                    <table className="dash-compact-table">
                      <thead>
                        <tr>
                          <th>Activity Date</th>
                          <th>Source</th>
                          <th>Hours</th>
                          <th>Summary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evidenceItems.map((e) => (
                          <tr key={e.id}>
                            <td>{e.activityDate ? formatDateShort(e.activityDate) : '—'}</td>
                            <td>{e.sourceType}</td>
                            <td>{e.effortHours}</td>
                            <td>{e.summary ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : null}
              </SectionCard>

              {evidenceChartData.length > 0 ? (
                <SectionCard title="Hours per Day">
                  <EvidenceTimelineBar data={evidenceChartData} />
                </SectionCard>
              ) : null}
            </div>
          ) : null}

          {/* ── Budget Tab ─────────────────────────────────────────── */}
          {activeTab === 'budget' ? (
            <div className="dashboard-main-grid">
              {/* Budget edit form — admin/pm only */}
              {canManageBudget ? (
                <SectionCard title="Set Budget">
                  <div className="flex flex-wrap gap-4 items-end">
                    <div>
                      <label className="form-label" htmlFor="budget-year">Fiscal Year</label>
                      <input
                        className="form-control"
                        id="budget-year"
                        max={new Date().getFullYear() + 5}
                        min={2020}
                        onChange={(e) => setBudgetFiscalYear(Number(e.target.value))}
                        type="number"
                        value={budgetFiscalYear}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="budget-capex">CAPEX Budget ($)</label>
                      <input
                        className="form-control"
                        id="budget-capex"
                        min={0}
                        onChange={(e) => setBudgetCapex(e.target.value)}
                        step={1000}
                        type="number"
                        value={budgetCapex}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="budget-opex">OPEX Budget ($)</label>
                      <input
                        className="form-control"
                        id="budget-opex"
                        min={0}
                        onChange={(e) => setBudgetOpex(e.target.value)}
                        step={1000}
                        type="number"
                        value={budgetOpex}
                      />
                    </div>
                    <button
                      className="button button--primary"
                      disabled={budgetSaving}
                      onClick={() => void handleSaveBudget()}
                      type="button"
                    >
                      Save Budget
                    </button>
                  </div>
                  {budgetSaveError ? <p className="text-red-600 text-sm mt-2">{budgetSaveError}</p> : null}
                  {budgetSaveSuccess ? <p className="text-green-600 text-sm mt-2">{budgetSaveSuccess}</p> : null}
                </SectionCard>
              ) : null}

              {budgetLoading ? (
                <SectionCard title="Budget Dashboard"><LoadingState variant="skeleton" skeletonType="detail" /></SectionCard>
              ) : budgetError ? (
                <SectionCard title="Budget Dashboard"><ErrorState description={budgetError} /></SectionCard>
              ) : budgetDashboard ? (
                <>
                  {budgetDashboard.budget ? (
                    <SectionCard title="Budget Summary">
                      <dl className="details-list">
                        <div><dt>Fiscal Year</dt><dd>{budgetDashboard.budget.fiscalYear}</dd></div>
                        <div><dt>CAPEX Budget</dt><dd>${budgetDashboard.budget.capex.toLocaleString('en-US')}</dd></div>
                        <div><dt>OPEX Budget</dt><dd>${budgetDashboard.budget.opex.toLocaleString('en-US')}</dd></div>
                        <div><dt>Total Budget</dt><dd>${budgetDashboard.budget.total.toLocaleString('en-US')}</dd></div>
                      </dl>
                    </SectionCard>
                  ) : (
                    <SectionCard title="Budget Summary">
                      <EmptyState description="No budget set for this fiscal year." title="No budget" />
                    </SectionCard>
                  )}

                  {/* Burn-down chart (8-3-06) */}
                  {budgetDashboard.budget ? (
                    <SectionCard title="Budget Burn-Down">
                      <BudgetBurnDownChart data={budgetDashboard.burnDown} />
                    </SectionCard>
                  ) : null}

                  {/* Forecast chart (8-3-07) */}
                  {budgetDashboard.budget ? (
                    <SectionCard title="Forecast to Completion">
                      <ForecastChart
                        forecast={budgetDashboard.forecast}
                        totalBudget={budgetDashboard.budget.total}
                      />
                    </SectionCard>
                  ) : null}

                  {/* Cost breakdown donut (8-3-08) */}
                  <SectionCard title="Cost by Staffing Role">
                    <CostBreakdownDonut data={budgetDashboard.byRole} />
                  </SectionCard>
                </>
              ) : null}
            </div>
          ) : null}

          {/* ── History Tab ─────────────────────────────────────────── */}
          {activeTab === 'history' ? (
            <SectionCard title="Change History">
              {historyLoading ? <LoadingState label="Loading history..." variant="skeleton" skeletonType="detail" /> : null}
              {historyError ? <ErrorState description={historyError} /> : null}
              {!historyLoading && !historyError ? (
                <AuditTimeline events={historyEvents} />
              ) : null}
            </SectionCard>
          ) : null}
        </>
      ) : null}
    </PageContainer>
  );
}

interface SummaryCardProps {
  label: string;
  value: string;
}

function SummaryCard({ label, value }: SummaryCardProps): JSX.Element {
  return (
    <SectionCard>
      <div className="metric-card">
        <div className="metric-card__value metric-card__value--compact">{value}</div>
        <div className="metric-card__label">{label}</div>
      </div>
    </SectionCard>
  );
}

function validateAssignTeam(
  values: ProjectTeamAssignmentFormValues,
): Partial<Record<keyof ProjectTeamAssignmentFormValues, string>> {
  const errors: Partial<Record<keyof ProjectTeamAssignmentFormValues, string>> = {};

  if (!values.actorId.trim()) {
    errors.actorId = 'Workflow actor is required.';
  }

  if (!values.teamId) {
    errors.teamId = 'Team selection is required.';
  }

  if (!values.staffingRole.trim()) {
    errors.staffingRole = 'Staffing role is required.';
  }

  if (!values.startDate) {
    errors.startDate = 'Start date is required.';
  }

  if (!values.allocationPercent.trim()) {
    errors.allocationPercent = 'Allocation percent is required.';
  } else {
    const allocation = Number(values.allocationPercent);

    if (!Number.isFinite(allocation) || allocation <= 0 || allocation > 100) {
      errors.allocationPercent = 'Allocation percent must be between 1 and 100.';
    }
  }

  if (values.startDate && values.endDate && values.endDate < values.startDate) {
    errors.endDate = 'End date cannot be earlier than start date.';
  }

  return errors;
}

function toIsoDate(value: string): string {
  return `${value}T00:00:00.000Z`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Not set';
  return formatDateLib(value);
}
