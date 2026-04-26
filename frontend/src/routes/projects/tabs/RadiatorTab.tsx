import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import { useAuth } from '@/app/auth-context';
import { DIRECTOR_ADMIN_ROLES, PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { hasAnyStoredRole } from '@/features/auth/token-claims';
import { useStoredApiToken } from '@/features/auth/useStoredApiToken';
import { AuthTokenField } from '@/components/common/AuthTokenField';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ErrorState } from '@/components/common/ErrorState';
import { GovernanceOverridePanel } from '@/components/common/GovernanceOverridePanel';
import { ProjectHealthBadge } from '@/components/common/ProjectHealthBadge';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ExternalLinksPanel } from '@/components/projects/ExternalLinksPanel';
import { OverrideModal } from '@/components/projects/OverrideModal';
import { OverallScoreSparkline } from '@/components/projects/OverallScoreSparkline';
import { ProjectRadiator } from '@/components/projects/ProjectRadiator';
import { AxisHoverInfo } from '@/components/projects/AxisHoverInfo';
import { DimensionDetailModal } from '@/components/projects/DimensionDetailModal';
import { PulseExceptionConsole } from '@/components/projects/PulseExceptionConsole';
import { PulseReportForm } from '@/components/projects/PulseReportForm';
import { RadiatorChartTabs } from '@/components/projects/RadiatorChartTabs';
import { RadiatorDrillDown } from '@/components/projects/RadiatorDrillDown';
import { ShapeBadge } from '@/components/projects/ShapeBadge';
import { WeeklyStatusForm } from '@/components/projects/WeeklyStatusForm';
import { PulseHoverProvider, usePulseHover } from '@/features/project-pulse/hover-context';
import type { PulseNarrativeField } from '@/features/project-pulse/narrative-axis-map';
import { formatDate } from '@/lib/format-date';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import { generatePdfFromElement } from '@/lib/export-pdf';
import { generatePptxFromElement } from '@/lib/export-pptx';
import { ApiError } from '@/lib/api/http-client';
import { fetchProjectBudgetDashboard } from '@/lib/api/project-budget';
import { fetchOrgConfig } from '@/lib/api/org-config';
import { fetchProjectHealth, type ProjectHealthDto } from '@/lib/api/project-health';
import type { ProjectClosureResponse, ProjectDetails } from '@/lib/api/project-registry';
import { activateProject, closeProject, closeProjectOverride, updateProject } from '@/lib/api/project-registry';
import {
  type QuadrantScore,
  type RadiatorHistoryEntry,
  type RadiatorSnapshotDto,
  type SubDimensionScore,
  applyRadiatorOverride,
  fetchRadiator,
  fetchRadiatorHistory,
  fetchRadiatorSnapshotByWeek,
  refreshRadiator,
} from '@/lib/api/project-radiator';

interface RadiatorTabProps {
  project: ProjectDetails;
  projectId: string;
  reload: () => Promise<void>;
}

function bandLabel(band: string): string {
  return band.charAt(0) + band.slice(1).toLowerCase();
}

function bandTone(band: string): 'active' | 'warning' | 'danger' | 'neutral' {
  if (band === 'GREEN') return 'active';
  if (band === 'AMBER') return 'warning';
  if (band === 'RED' || band === 'CRITICAL') return 'danger';
  return 'neutral';
}

interface NarrativeItemProps {
  field: PulseNarrativeField;
  label: string;
  text: string;
}

function NarrativeItem({ field, label, text }: NarrativeItemProps): JSX.Element {
  const { setHoverTarget, isFieldActive } = usePulseHover();
  const active = isFieldActive(field);
  return (
    <div
      data-pulse-narrative-field={field}
      onMouseEnter={() => setHoverTarget({ kind: 'narrative', field })}
      onMouseLeave={() => setHoverTarget(null)}
      style={{
        borderLeft: active ? '3px solid var(--color-accent)' : '3px solid transparent',
        paddingLeft: active ? 'var(--space-2)' : 'var(--space-2)',
        opacity: active ? 1 : 0.55,
        transition: 'opacity 120ms ease, border-color 120ms ease',
      }}
    >
      <dt>{label}</dt>
      <dd>{text}</dd>
    </div>
  );
}

function RadiatorTabInner({ project, projectId, reload }: RadiatorTabProps): JSX.Element {
  const { principal } = useAuth();
  const canOverride = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);
  const canManageProject = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);
  const tokenState = useStoredApiToken();
  const canUseProjectOverride = hasAnyStoredRole(tokenState.token, DIRECTOR_ADMIN_ROLES);

  const [snap, setSnap] = useState<RadiatorSnapshotDto | null>(null);
  const [history, setHistory] = useState<RadiatorHistoryEntry[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<'current' | string>('current');
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantScore | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<SubDimensionScore | null>(null);
  const [loading, setLoading] = useState(true);

  // Auxiliary health badges
  const [health, setHealth] = useState<ProjectHealthDto | null>(null);
  const [budgetHealthColor, setBudgetHealthColor] = useState<'green' | 'yellow' | 'red' | null>(null);

  // V2.1-G: apply colour-blind RAG palette globally when the tenant opts in via OrgConfig
  useEffect(() => {
    let active = true;
    void fetchOrgConfig()
      .then((cfg) => {
        if (!active) return;
        if (cfg.colourBlindMode) {
          document.documentElement.setAttribute('data-colour-blind', 'true');
        } else {
          document.documentElement.removeAttribute('data-colour-blind');
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Lifecycle state
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [closeResult, setCloseResult] = useState<ProjectClosureResponse | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideReasonError, setOverrideReasonError] = useState<string | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);
  const [isOverrideClosing, setIsOverrideClosing] = useState(false);
  const [confirmOverrideOpen, setConfirmOverrideOpen] = useState(false);

  // Summary edit
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const canActivate = project.status === 'DRAFT';
  const canClose = project.status === 'ACTIVE';
  const canShowCloseOverride =
    canUseProjectOverride &&
    actionError?.includes('Use the explicit override flow with a reason to close anyway.') === true;

  const radarRef = useRef<HTMLDivElement>(null);

  // Initial load: snapshot + history + health badges
  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const [r, h, healthResult, budgetDash] = await Promise.all([
          fetchRadiator(projectId).catch(() => null),
          fetchRadiatorHistory(projectId, 12).catch(() => [] as RadiatorHistoryEntry[]),
          fetchProjectHealth(projectId).catch(() => null),
          fetchProjectBudgetDashboard(projectId).catch(() => null),
        ]);
        if (!active) return;
        if (r) setSnap(r);
        setHistory(h);
        setHealth(healthResult);
        setBudgetHealthColor(budgetDash?.healthColor ?? null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [projectId]);

  // Week change: fetch historical snapshot if not current
  useEffect(() => {
    if (selectedWeek === 'current') {
      let active = true;
      void fetchRadiator(projectId)
        .then((fresh) => {
          if (active) setSnap(fresh);
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }
    let active = true;
    void fetchRadiatorSnapshotByWeek(projectId, selectedWeek)
      .then((s) => {
        if (active && s) setSnap(s);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [projectId, selectedWeek]);

  const historyWeeks = useMemo(() => history.map((h) => h.weekStarting), [history]);

  const trendData = useMemo(
    () =>
      history.map((h) => ({
        week: h.weekStarting.slice(5), // MM-DD
        score: h.overallScore,
      })),
    [history],
  );

  /**
   * Click an axis label or dot → open the override modal directly for that sub-dimension.
   * Drill-down remains available via the `Browse quadrant` button in the tooltip.
   */
  function onAxisClick(subKey: string): void {
    if (!snap) return;
    const sub = snap.quadrants.flatMap((q) => q.subs).find((s) => s.key === subKey);
    if (sub) setOverrideTarget(sub);
  }

  /** Alternate path: still expose quadrant drill-down via explicit entry point. */
  function onOpenQuadrant(subKey: string): void {
    if (!snap) return;
    const q = snap.quadrants.find((qu) => qu.subs.some((s) => s.key === subKey));
    if (q) setSelectedQuadrant(q);
  }

  async function reloadRadiator(): Promise<void> {
    const fresh = await fetchRadiator(projectId).catch(() => null);
    if (fresh) {
      setSnap(fresh);
      // Refresh drill-down with latest data
      if (selectedQuadrant) {
        const updated = fresh.quadrants.find((q) => q.key === selectedQuadrant.key) ?? null;
        setSelectedQuadrant(updated);
      }
    }
  }

  async function handleExportPdf(): Promise<void> {
    if (!radarRef.current) return;
    try {
      await generatePdfFromElement(radarRef.current, `${project.projectCode}-radiator.pdf`);
      toast.success('PDF exported');
    } catch {
      toast.error('Failed to export PDF');
    }
  }

  async function handleExportPptx(): Promise<void> {
    if (!radarRef.current || !snap) return;
    try {
      await generatePptxFromElement(
        radarRef.current,
        `${project.projectCode}-radiator.pptx`,
        `${project.name} — Radiator (Week of ${snap.weekStarting})`,
        snap.narrative ?? undefined,
      );
      toast.success('PPTX exported');
    } catch {
      toast.error('Failed to export PPTX');
    }
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
    if (!trimmedReason) {
      setOverrideReasonError('Override reason is required.');
      return;
    }
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
      const response = await closeProjectOverride(projectId, {
        expectedProjectVersion: project.version,
        reason: overrideReason.trim(),
      });
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
    <div
      data-testid="radiator-tab"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
    >
      <DimensionDetailModal
        initialFocusKey={overrideTarget?.key ?? null}
        onClose={() => setOverrideTarget(null)}
        onSaved={({ snapshot: nextSnap }) => {
          if (nextSnap) setSnap(nextSnap);
          void reloadRadiator();
        }}
        open={overrideTarget !== null}
        projectId={projectId}
        shape={project.shape ?? null}
        snapshot={snap}
      />

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

      {/* Hero header: title + overall score + shape + health + export actions */}
      <div className="dashboard-hero dashboard-hero--compact" style={{ minHeight: 'auto' }}>
        <div className="dashboard-hero__header">
          <div>
            <h3 style={{ alignItems: 'center', display: 'flex', gap: 'var(--space-2)', margin: 0 }}>
              Project Pulse
              <ShapeBadge shape={project.shape} />
              {selectedWeek !== 'current' ? (
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 400 }}>
                  · Week of {selectedWeek}
                </span>
              ) : null}
            </h3>
            {snap ? (
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                Overall: <strong>{Math.round(snap.overallScore)}/100</strong>{' '}
                <StatusBadge
                  label={bandLabel(snap.overallBand)}
                  tone={bandTone(snap.overallBand)}
                  variant="chip"
                />
              </p>
            ) : (
              <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                {loading ? 'Loading radiator…' : 'No radiator data yet.'}
              </p>
            )}
            <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              {health ? <ProjectHealthBadge grade={health.grade} score={health.score} /> : null}
              {budgetHealthColor ? (
                <StatusBadge
                  label={`Budget: ${budgetHealthColor === 'green' ? 'On Track' : budgetHealthColor === 'yellow' ? 'At Risk' : 'Over Budget'}`}
                  status={budgetHealthColor === 'green' ? 'active' : budgetHealthColor === 'yellow' ? 'warning' : 'danger'}
                  variant="chip"
                />
              ) : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="button--project-detail"
              onClick={() => {
                void refreshRadiator(projectId).then((fresh) => {
                  setSnap(fresh);
                  toast.success('Radiator refreshed');
                }).catch(() => toast.error('Refresh failed'));
              }}
              title="Re-compute from live signals (clears 60s cache)"
              type="button"
            >
              Refresh now
            </button>
            <button
              className="button--project-detail"
              disabled={!snap}
              onClick={() => void handleExportPdf()}
              type="button"
            >
              Export PDF
            </button>
            <button
              className="button--project-detail"
              disabled={!snap}
              onClick={() => void handleExportPptx()}
              type="button"
            >
              Export PPTX
            </button>
          </div>
        </div>
      </div>

      {/* V2-A split view: Radar (55%) LEFT · Weekly Status (45%) RIGHT */}
      <div className="pulse-split">
        <div className="pulse-split__left">
          <SectionCard compact title="Delivery Radiator">
            <div ref={radarRef} style={{ minHeight: 440 }}>
              {snap ? (
                <RadiatorChartTabs
                  onAxisClick={onAxisClick}
                  shape={project.shape ?? null}
                  snapshot={snap}
                />
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 13, padding: 'var(--space-4)' }}>
                  {loading ? 'Loading radar…' : 'No radar data yet.'}
                </div>
              )}
            </div>
            {snap ? <AxisHoverInfo snapshot={snap} /> : null}
            <OverallScoreSparkline
              history={history}
              onSelectWeek={setSelectedWeek}
              selectedWeek={selectedWeek}
            />
          </SectionCard>
        </div>

        <div className="pulse-split__right">
          <SectionCard compact title="Weekly Status">
            <PulseReportForm
              canEdit={canOverride}
              onSubmitted={() => void reloadRadiator()}
              projectId={projectId}
              shape={project.shape ?? null}
              snapshot={snap}
            />
          </SectionCard>
        </div>
      </div>

      {/* Drill-down — appears when an axis is clicked */}
      {selectedQuadrant ? (
        <RadiatorDrillDown
          canOverride={canOverride}
          onClose={() => setSelectedQuadrant(null)}
          onOverrideClick={setOverrideTarget}
          quadrant={selectedQuadrant}
        />
      ) : null}

      {/* Exception console (P-D) — appears when any axis is red/amber */}
      {snap ? (
        <SectionCard collapsible compact title="Exception console">
          <PulseExceptionConsole
            hasLiveSpcRates={project.hasLiveSpcRates ?? false}
            projectId={projectId}
            snapshot={snap}
          />
        </SectionCard>
      ) : null}

      {/* V2.1-F: Narrative SectionCard removed — superseded by the executive summary in the Weekly Status form. */}

      <SectionCard collapsible compact defaultCollapsed title="Project Summary">
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
                    <Link to={`/people/${project.projectManagerId}`}>
                      {project.projectManagerDisplayName ?? project.projectManagerId}
                    </Link>
                  ) : 'Not assigned'}
                </dd>
              </div>
              {project.deliveryManagerId ? (
                <div>
                  <dt>Delivery Manager</dt>
                  <dd>
                    <Link to={`/people/${project.deliveryManagerId}`}>
                      {project.deliveryManagerDisplayName ?? project.deliveryManagerId}
                    </Link>
                  </dd>
                </div>
              ) : null}
              <div><dt>Description</dt><dd>{project.description ?? 'No description available'}</dd></div>
              {project.engagementModel ? <div><dt>Engagement</dt><dd>{project.engagementModel}</dd></div> : null}
              {project.priority ? <div><dt>Priority</dt><dd>{project.priority}</dd></div> : null}
              {project.clientName ? <div><dt>Client</dt><dd>{project.clientName}</dd></div> : null}
            </dl>
            {canManageProject ? (
              <div style={{ marginTop: 12 }}>
                <button className="button--project-detail" onClick={() => { setEditName(''); setEditDescription(''); setIsEditing(true); }} type="button">Edit</button>
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

      <SectionCard collapsible compact defaultCollapsed title={`External Links (${project.externalLinks.length})`}>
        <ExternalLinksPanel links={project.externalLinks} />
      </SectionCard>

      {/* V2.1-F: Lifecycle Controls moved to LifecycleTab. */}
    </div>
  );
}

export function RadiatorTab(props: RadiatorTabProps): JSX.Element {
  return (
    <PulseHoverProvider>
      <RadiatorTabInner {...props} />
    </PulseHoverProvider>
  );
}
