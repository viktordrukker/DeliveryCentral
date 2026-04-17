import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { DIRECTOR_ADMIN_ROLES, PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { hasAnyStoredRole } from '@/features/auth/token-claims';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { GovernanceOverridePanel } from '@/components/common/GovernanceOverridePanel';
import { LoadingState } from '@/components/common/LoadingState';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RagRadiator } from '@/components/projects/RagRadiator';
import { RagTrendTimeline } from '@/components/projects/RagTrendTimeline';
import { StaffingAlertsList } from '@/components/projects/StaffingAlertsList';
import { ExternalLinksPanel } from '@/components/projects/ExternalLinksPanel';
import { WeeklyStatusForm } from '@/components/projects/WeeklyStatusForm';
import { formatDate } from '@/lib/format-date';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import type { ProjectDetails, ProjectClosureResponse } from '@/lib/api/project-registry';
import { activateProject, closeProject, closeProjectOverride, updateProject } from '@/lib/api/project-registry';
import { type ComputedRag, type RagSnapshotDto, type StaffingAlert, fetchComputedRag, fetchLatestRagSnapshot, fetchRagHistory, fetchStaffingAlerts } from '@/lib/api/project-rag';
import { fetchProjectHealth, type ProjectHealthDto } from '@/lib/api/project-health';
import { fetchProjectBudgetDashboard } from '@/lib/api/project-budget';
import { ApiError } from '@/lib/api/http-client';

interface OverviewTabProps {
  project: ProjectDetails;
  projectId: string;
  reload: () => Promise<void>;
}

export function OverviewTab({ project, projectId, reload }: OverviewTabProps): JSX.Element {
  const { principal } = useAuth();
  const canManageProject = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);
  const tokenState = useStoredApiToken();
  const canUseProjectOverride = hasAnyStoredRole(tokenState.token, DIRECTOR_ADMIN_ROLES);

  // RAG state
  const [computed, setComputed] = useState<ComputedRag | null>(null);
  const [latestSnapshot, setLatestSnapshot] = useState<RagSnapshotDto | null>(null);
  const [ragHistory, setRagHistory] = useState<RagSnapshotDto[]>([]);
  const [alerts, setAlerts] = useState<StaffingAlert[]>([]);
  const [ragLoading, setRagLoading] = useState(true);

  // Health state
  const [health, setHealth] = useState<ProjectHealthDto | null>(null);
  const [budgetHealthColor, setBudgetHealthColor] = useState<'green' | 'yellow' | 'red' | null>(null);

  // Action state
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [closeResult, setCloseResult] = useState<ProjectClosureResponse | null>(null);

  // Override state
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonError, setOverrideReasonError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [isOverrideClosing, setIsOverrideClosing] = useState(false);
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const canActivate = project.status === 'DRAFT';
  const canClose = project.status === 'ACTIVE';
  const canShowCloseOverride =
    canUseProjectOverride &&
    actionError?.includes('Use the explicit override flow with a reason to close anyway.') === true;

  // Load RAG data
  useEffect(() => {
    let active = true;
    setRagLoading(true);

    void (async () => {
      try {
        const [comp, latest, history, staffAlerts, h, budgetDash] = await Promise.all([
          fetchComputedRag(projectId).catch(() => null),
          fetchLatestRagSnapshot(projectId).catch(() => null),
          fetchRagHistory(projectId).catch(() => [] as RagSnapshotDto[]),
          fetchStaffingAlerts(projectId).catch(() => [] as StaffingAlert[]),
          fetchProjectHealth(projectId).catch(() => null),
          fetchProjectBudgetDashboard(projectId).catch(() => null),
        ]);
        if (!active) return;
        setComputed(comp);
        setLatestSnapshot(latest);
        setRagHistory(history as RagSnapshotDto[]);
        setAlerts(staffAlerts as StaffingAlert[]);
        setHealth(h);
        setBudgetHealthColor(budgetDash?.healthColor ?? null);
      } catch {
        // All calls are optional — ignore errors
      } finally {
        if (active) setRagLoading(false);
      }
    })();

    return () => { active = false; };
  }, [projectId]);

  function reloadRag(): void {
    void Promise.all([
      fetchComputedRag(projectId).catch(() => null),
      fetchLatestRagSnapshot(projectId).catch(() => null),
      fetchRagHistory(projectId).catch(() => []),
    ]).then(([comp, latest, history]) => {
      setComputed(comp);
      setLatestSnapshot(latest);
      setRagHistory(history as RagSnapshotDto[]);
    });
  }

  async function handleActivate(): Promise<void> {
    if (!canActivate || isActivating) return;
    setIsActivating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await activateProject(projectId);
      setActionSuccess(`Project ${response.name} is now ${humanizeEnum(response.status, PROJECT_STATUS_LABELS)}.`);
      await reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Failed to activate project.');
    } finally {
      setIsActivating(false);
    }
  }

  async function handleClose(): Promise<void> {
    if (!canClose || isClosing) return;
    setIsClosing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await closeProject(projectId);
      setCloseResult(response);
      setActionSuccess(`Project ${response.name} closed with ${response.workspend.totalMandays.toFixed(2)} mandays captured.`);
      await reload();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to close project.';
      setActionError(message);
      if (!(error instanceof ApiError) || error.status !== 409) {
        setOverrideReason('');
        setOverrideReasonError(null);
      }
    } finally {
      setIsClosing(false);
    }
  }

  function handleCloseOverrideRequest(): void {
    if (isOverrideClosing || !canUseProjectOverride) return;
    const trimmedReason = overrideReason.trim();
    if (!trimmedReason) { setOverrideReasonError('Override reason is required.'); return; }
    setConfirmOverrideOpen(true);
  }

  async function handleCloseOverride(): Promise<void> {
    if (isOverrideClosing || !canUseProjectOverride) return;
    setIsOverrideClosing(true);
    setOverrideReasonError(null);
    setOverrideError(null);
    setOverrideSuccess(null);
    setActionSuccess(null);
    try {
      const response = await closeProjectOverride(projectId, { expectedProjectVersion: project.version, reason: overrideReason.trim() });
      setCloseResult(response);
      setActionError(null);
      setOverrideSuccess(`Closure override applied for ${response.name}.`);
      setActionSuccess(`Project ${response.name} closed by override with ${response.workspend.totalMandays.toFixed(2)} mandays captured.`);
      setOverrideReason('');
      await reload();
    } catch (error: unknown) {
      setOverrideError(error instanceof Error ? error.message : 'Failed to apply override.');
    } finally {
      setIsOverrideClosing(false);
    }
  }

  async function handleUpdateProject(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isUpdating) return;
    setIsUpdating(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateProject(projectId, {
        ...(editName.trim() ? { name: editName.trim() } : {}),
        ...(editDescription.trim() ? { description: editDescription.trim() } : {}),
      });
      setActionSuccess('Project metadata updated.');
      setEditName('');
      setEditDescription('');
      setIsEditing(false);
      await reload();
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : 'Failed to update project.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div data-testid="overview-tab">
      <ConfirmDialog
        confirmLabel="Confirm close"
        message="Close this project? History is preserved and workspend summary will be generated."
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => { setConfirmCloseOpen(false); void handleClose(); }}
        open={confirmCloseOpen}
        title="Close Project"
      />
      <ConfirmDialog
        confirmLabel="Apply override"
        message="Apply the closure override? This closes the project despite blocking conditions."
        onCancel={() => setConfirmOverrideOpen(false)}
        onConfirm={() => { setConfirmOverrideOpen(false); void handleCloseOverride(); }}
        open={confirmOverrideOpen}
        title="Confirm Closure Override"
      />

      {actionError ? <ErrorState description={actionError} /> : null}
      {actionSuccess ? <div className="success-banner">{actionSuccess}</div> : null}

      {/* ── RAG Radiator (Hero) ── */}
      <SectionCard title="Project Status">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-3)' }}>
          {health ? <ProjectHealthBadge grade={health.grade} score={health.score} /> : null}
          {budgetHealthColor ? (
            <StatusBadge
              status={budgetHealthColor === 'green' ? 'active' : budgetHealthColor === 'yellow' ? 'warning' : 'danger'}
              label={`Budget: ${budgetHealthColor === 'green' ? 'On Track' : budgetHealthColor === 'yellow' ? 'At Risk' : 'Over Budget'}`}
              variant="chip"
            />
          ) : null}
        </div>
        <RagRadiator computed={computed} latestSnapshot={latestSnapshot} loading={ragLoading} />
      </SectionCard>

      {/* ── RAG Trend + Weekly Status (two-column) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}>
        <SectionCard title="Weekly Status Report" collapsible>
          {canManageProject ? (
            <WeeklyStatusForm projectId={projectId} onSaved={reloadRag} />
          ) : (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Only project managers can submit weekly status reports.
            </p>
          )}
        </SectionCard>

        <SectionCard title="Status Trend (12 wk)" collapsible>
          <RagTrendTimeline snapshots={ragHistory} />
        </SectionCard>
      </div>

      {/* ── Staffing Alerts ── */}
      {alerts.length > 0 ? (
        <SectionCard title={`Staffing Alerts (${alerts.length})`} collapsible>
          <StaffingAlertsList alerts={alerts} />
        </SectionCard>
      ) : null}

      {/* ── Project Summary ── */}
      <SectionCard title="Project Summary" collapsible>
        {!isEditing ? (
          <>
            <dl className="details-list">
              <div><dt>Name</dt><dd>{project.name}</dd></div>
              <div><dt>Project Code</dt><dd>{project.projectCode}</dd></div>
              <div><dt>Status</dt><dd>{humanizeEnum(project.status, PROJECT_STATUS_LABELS)}</dd></div>
              <div><dt>Start Date</dt><dd>{formatDate(project.startDate)}</dd></div>
              <div><dt>Planned End Date</dt><dd>{formatDate(project.plannedEndDate)}</dd></div>
              <div>
                <dt>Project Manager</dt>
                <dd>
                  {project.projectManagerId ? (
                    <Link to={`/people/${project.projectManagerId}`}>{project.projectManagerDisplayName ?? project.projectManagerId}</Link>
                  ) : 'Not assigned'}
                </dd>
              </div>
              {project.deliveryManagerId ? (
                <div>
                  <dt>Delivery Manager</dt>
                  <dd><Link to={`/people/${project.deliveryManagerId}`}>{project.deliveryManagerDisplayName ?? project.deliveryManagerId}</Link></dd>
                </div>
              ) : null}
              <div><dt>Description</dt><dd>{project.description ?? 'No description available'}</dd></div>
              {project.engagementModel ? <div><dt>Engagement</dt><dd>{project.engagementModel}</dd></div> : null}
              {project.priority ? <div><dt>Priority</dt><dd>{project.priority}</dd></div> : null}
              {project.clientName ? <div><dt>Client</dt><dd>{project.clientName}</dd></div> : null}
            </dl>
            {canManageProject ? (
              <div style={{ marginTop: 12 }}>
                <button className="button button--secondary" onClick={() => { setEditName(''); setEditDescription(''); setIsEditing(true); }} type="button">Edit</button>
              </div>
            ) : null}
          </>
        ) : (
          <form onSubmit={(e) => void handleUpdateProject(e)}>
            <div className="form-grid">
              <label className="field">
                <span className="field__label">Name (leave blank to keep current)</span>
                <input className="field__control" onChange={(e) => setEditName(e.target.value)} placeholder={project.name} type="text" value={editName} />
              </label>
              <label className="field">
                <span className="field__label">Description</span>
                <input className="field__control" onChange={(e) => setEditDescription(e.target.value)} placeholder={project.description ?? 'No description'} type="text" value={editDescription} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="button button--primary" disabled={isUpdating} type="submit">{isUpdating ? 'Saving...' : 'Save changes'}</button>
              <button className="button button--secondary" onClick={() => setIsEditing(false)} type="button">Cancel</button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* ── External Links ── */}
      <SectionCard title={`External Links (${project.externalLinks.length})`} collapsible>
        <ExternalLinksPanel links={project.externalLinks} />
      </SectionCard>

      {/* ── Lifecycle Controls ── */}
      <SectionCard title="Lifecycle Controls" collapsible>
        <div className="details-list">
          <div><dt>Lifecycle State</dt><dd>{humanizeEnum(project.status, PROJECT_STATUS_LABELS)}</dd></div>
          <div>
            <dt>Activate</dt>
            <dd>{canActivate ? 'Draft projects can be activated before staffing begins.' : 'Only available in DRAFT.'}</dd>
          </div>
          <div>
            <dt>Close</dt>
            <dd>{canClose ? 'Closing captures workspend and preserves history.' : 'Only available while ACTIVE.'}</dd>
          </div>
        </div>

        {canManageProject && canActivate ? (
          <div style={{ marginTop: 12 }}>
            <button className="button button--secondary" disabled={isActivating} onClick={() => void handleActivate()} type="button">
              {isActivating ? 'Activating...' : 'Activate project'}
            </button>
          </div>
        ) : null}

        {canManageProject && canClose ? (
          <div style={{ marginTop: 12 }}>
            <button className="button" disabled={isClosing} onClick={() => setConfirmCloseOpen(true)} type="button">
              {isClosing ? 'Closing...' : 'Close project'}
            </button>
          </div>
        ) : null}

        {!tokenState.hasToken ? (
          <AuthTokenField hasToken={tokenState.hasToken} onClear={tokenState.clearToken} onSave={tokenState.saveToken} token={tokenState.token} />
        ) : null}

        {canShowCloseOverride ? (
          <GovernanceOverridePanel
            actionLabel="Close project with override"
            confirmLabel="This override should only be used by authorized governance roles."
            error={overrideError}
            impactMessage="The project will close despite active assignments. History and override reason remain auditable."
            isSubmitting={isOverrideClosing}
            onReasonChange={(v) => { setOverrideReason(v); setOverrideReasonError(null); }}
            onSubmit={(e) => { e.preventDefault(); handleCloseOverrideRequest(); }}
            reason={overrideReason}
            reasonError={overrideReasonError}
            success={overrideSuccess}
            subtitle="Normal closure is blocked due to active staffing."
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
                {closeResult.workspend.byRole.length === 0 ? <p className="project-bucket-grid__empty">No role workspend.</p> : (
                  <ul className="project-bucket-list">
                    {closeResult.workspend.byRole.map((b) => <li key={`role-${b.key}`}><span>{b.key}</span><span>{b.mandays.toFixed(2)} md</span></li>)}
                  </ul>
                )}
              </div>
              <div>
                <div className="project-bucket-grid__title">By skillset</div>
                {closeResult.workspend.bySkillset.length === 0 ? <p className="project-bucket-grid__empty">No skillset workspend.</p> : (
                  <ul className="project-bucket-list">
                    {closeResult.workspend.bySkillset.map((b) => <li key={`skill-${b.key}`}><span>{b.key}</span><span>{b.mandays.toFixed(2)} md</span></li>)}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
