import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useDrilldown } from '@/app/drilldown-context';
import { PROJECT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon } from '@/components/common/TipBalloon';
import { DetailLayout } from '@/components/layout/DetailLayout';
import type { ProjectDetails } from '@/lib/api/project-registry';
import { useProjectDetails } from '@/features/projects/useProjectDetails';
import { type ComputedRag, fetchComputedRag } from '@/lib/api/project-rag';
import { type StaffingSummary, fetchStaffingSummary } from '@/lib/api/project-role-plan';
import { humanizeEnum, PROJECT_STATUS_LABELS } from '@/lib/labels';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { Button, Pct } from '@/components/ds';

import { RadiatorTab } from './tabs/RadiatorTab';
import { MilestonesTab } from './tabs/MilestonesTab';
import { ChangeRequestsTab } from './tabs/ChangeRequestsTab';
import { RisksIssuesTab } from './tabs/RisksIssuesTab';
import { TeamVendorsTab } from './tabs/TeamVendorsTab';
import { BudgetTab } from './tabs/BudgetTab';
import { LifecycleTab } from './tabs/LifecycleTab';
import { PulseTab } from './tabs/PulseTab';
import { PlanTab } from './tabs/PlanTab';

const BASE_TABS = [
  { id: 'radiator', label: 'Radiator' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'change-requests', label: 'Change Requests' },
  { id: 'risks', label: 'Risks & Issues' },
  { id: 'team', label: 'Team & Vendors' },
  { id: 'budget', label: 'Budget' },
  { id: 'lifecycle', label: 'Lifecycle' },
];

// V2-A.1 — 3-tab canvas grammar (Pulse / Plan / Money). The Plan tab stacks
// milestones + risks + change requests + team as sequential sections; the
// Money tab keeps the BudgetTab content (already canvas-faithful internally).
const V2_TABS = [
  { id: 'pulse', label: 'Pulse' },
  { id: 'plan', label: 'Plan' },
  { id: 'money', label: 'Money' },
];

const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  status: 'radiator',
  report: 'radiator',
};

// V2-A.1 — legacy ?tab=… URLs continue to deep-link; they map onto the new
// 3-tab grammar when `dsRefresh` is on so old bookmarks survive the swap.
const LEGACY_TAB_REDIRECTS_V2: Record<string, string> = {
  radiator: 'pulse',
  milestones: 'plan',
  risks: 'plan',
  'change-requests': 'plan',
  team: 'plan',
  budget: 'money',
  lifecycle: 'plan',
  status: 'pulse',
  report: 'pulse',
};

export function ProjectDetailPage(): JSX.Element {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const TABS = dsRefreshEnabled ? V2_TABS : BASE_TABS;
  const defaultTab = dsRefreshEnabled ? 'pulse' : 'radiator';
  const rawTab = searchParams.get('tab') ?? defaultTab;
  // V2-A.1 — when dsRefresh is on, the legacy 7-tab IDs collapse onto the
  // 3-tab grammar (Pulse / Plan / Money). When off, only the original
  // status/report aliases apply.
  const redirectMap = dsRefreshEnabled ? LEGACY_TAB_REDIRECTS_V2 : LEGACY_TAB_REDIRECTS;
  const activeTab = redirectMap[rawTab] ?? rawTab;
  const { principal } = useAuth();
  const canManage = hasAnyRole(principal?.roles, PROJECT_CREATE_ROLES);
  const state = useProjectDetails(id);
  const { setCurrentLabel } = useDrilldown();

  // Keep last loaded project to prevent unmounting tabs during reload
  const lastProjectRef = useRef<ProjectDetails | undefined>(undefined);
  if (state.data) lastProjectRef.current = state.data;

  // KPI strip data
  const [computedRag, setComputedRag] = useState<ComputedRag | null>(null);
  const [staffingSummary, setStaffingSummary] = useState<StaffingSummary | null>(null);

  // Sprint F-0.6 (B-06 / D-54) — KPI-strip RAG and Project Pulse / Radiator
  // overall band were computed from different signals and could disagree on
  // the same screen. Per Decision-11 the radiator flag is OFF in v1; suppress
  // the duplicate "Overall RAG" KPI tile when it's off so there's only one
  // health story visible. Re-enables automatically when the flag flips.
  const radiatorEnabled = isFeatureEnabled('projectRadiator');

  useEffect(() => {
    if (state.data?.name) setCurrentLabel(state.data.name);
  }, [state.data?.name, setCurrentLabel]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    void (async () => {
      if (radiatorEnabled) {
        try { const r = await fetchComputedRag(id); if (active) setComputedRag(r); } catch { /* optional */ }
      }
      try { const s = await fetchStaffingSummary(id); if (active) setStaffingSummary(s); } catch { /* optional */ }
    })();

    return () => { active = false; };
  }, [id, radiatorEnabled]);

  function setTab(tab: string): void {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  }

  // Use last loaded project during reload to prevent tab unmount
  const project = state.data ?? lastProjectRef.current;
  const daysRemaining = project?.plannedEndDate
    ? Math.max(0, Math.ceil((new Date(project.plannedEndDate).getTime() - Date.now()) / 86400000))
    : null;

  const banners = (
    <>
      {state.isLoading && !project ? <LoadingState label="Loading project..." variant="skeleton" skeletonType="detail" /> : null}
      {state.notFound ? (
        <SectionCard><EmptyState description={`No project found for ${id ?? 'the requested id'}.`} title="Project not found" /></SectionCard>
      ) : null}
      {state.error ? <ErrorState description={state.error} /> : null}
    </>
  );

  const kpiStrip = project ? (
    <div className="kpi-strip" aria-label="Key metrics">
      <Link className="kpi-strip__item" to={`/projects/${id ?? ''}?tab=radiator`}
        style={{ borderLeft: '3px solid var(--color-accent)' }}>
        <span className="kpi-strip__value">{humanizeEnum(project.status, PROJECT_STATUS_LABELS)}</span>
        <span className="kpi-strip__label">Status</span>
      </Link>

      <Link className="kpi-strip__item" to={`/projects/${id ?? ''}?tab=team`}
        style={{ borderLeft: '3px solid var(--color-chart-5)' }}>
        <TipBalloon tip="People currently assigned to this project." arrow="left" />
        <span className="kpi-strip__value">{project.assignmentCount}</span>
        <span className="kpi-strip__label">Active Staff</span>
      </Link>

      {staffingSummary && staffingSummary.totalPlanned > 0 ? (
        <Link className="kpi-strip__item" to={`/projects/${id ?? ''}?tab=team`}
          style={{ borderLeft: `3px solid ${staffingSummary.fillRate >= 80 ? 'var(--color-status-active)' : staffingSummary.fillRate >= 50 ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}` }}>
          <span className="kpi-strip__value"><Pct value={staffingSummary.fillRate} /></span>
          <span className="kpi-strip__label">Fill Rate</span>
        </Link>
      ) : null}

      {radiatorEnabled && computedRag ? (
        <Link className="kpi-strip__item" to={`/projects/${id ?? ''}?tab=radiator`}
          style={{ borderLeft: `3px solid ${computedRag.overallRag === 'GREEN' ? 'var(--color-status-active)' : computedRag.overallRag === 'AMBER' ? 'var(--color-status-warning)' : 'var(--color-status-danger)'}` }}>
          <StatusBadge status={computedRag.overallRag.toLowerCase()} label={computedRag.overallRag} variant="chip" />
          <span className="kpi-strip__label">Overall RAG</span>
        </Link>
      ) : null}

      <Link className="kpi-strip__item" to={`/projects/${id ?? ''}?tab=team`}
        style={{ borderLeft: `3px solid ${daysRemaining !== null && daysRemaining <= 7 ? 'var(--color-status-danger)' : daysRemaining !== null && daysRemaining <= 30 ? 'var(--color-status-warning)' : 'var(--color-status-active)'}` }}>
        <TipBalloon tip="Calendar days until planned end date." arrow="left" />
        <span className="kpi-strip__value">{daysRemaining !== null ? `${daysRemaining}d` : '—'}</span>
        <span className="kpi-strip__label">Days Remaining</span>
        {daysRemaining !== null && daysRemaining <= 7 ? (
          <span className="kpi-strip__context" style={{ color: 'var(--color-status-danger)' }}>ending soon</span>
        ) : null}
      </Link>
    </div>
  ) : null;

  return (
    <DetailLayout
      testId="project-detail-page"
      eyebrow="Projects"
      title={project?.name ?? 'Project Details'}
      subtitle="Project status reporting, staffing, budget, and lifecycle management."
      actions={
        id && canManage ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Sprint F-0.10 (Decision-10) — single canonical staffing flow.
                "Quick assign" direct-create CTA removed; all staffing goes
                through Create Staffing Request → Slate → Pick. */}
            <Button as={Link} variant="primary" size="sm" to={`/staffing-requests/new?projectId=${id}`}>Create Staffing Request</Button>
          </div>
        ) : null
      }
      banners={banners}
      // V2-D.1 / V2-A.2 — suppress the legacy kpiStrip on the Pulse tab;
      // PulseTab renders its own canvas-style `kpi tone-*` strip (see
      // PulseTab.tsx:135-156). Two strips stacking is a visible bug
      // surfaced in the 2026-05-25 BA validation. Other tabs keep the
      // legacy strip until the full 3-tab consolidation (V2-A.1) lands.
      kpiStrip={activeTab === 'pulse' ? undefined : kpiStrip}
      tabs={project ? TABS : undefined}
      activeTab={project ? activeTab : undefined}
      onTabChange={project ? setTab : undefined}
    >
      {project ? (
        <>
          {/* V2-A.1 — 3-tab grammar when dsRefresh is on */}
          {dsRefreshEnabled && activeTab === 'pulse' ? <PulseTab projectId={id!} /> : null}
          {dsRefreshEnabled && activeTab === 'plan' ? (
            <PlanTab project={project} projectId={id!} shape={state.data?.shape} reload={state.reload} />
          ) : null}
          {dsRefreshEnabled && activeTab === 'money' ? <BudgetTab projectId={id!} /> : null}

          {/* Legacy 7-tab grammar when dsRefresh is off */}
          {!dsRefreshEnabled && activeTab === 'radiator' ? <RadiatorTab project={project} projectId={id!} reload={state.reload} /> : null}
          {!dsRefreshEnabled && activeTab === 'milestones' ? <MilestonesTab projectId={id!} shape={state.data?.shape} /> : null}
          {!dsRefreshEnabled && activeTab === 'change-requests' ? <ChangeRequestsTab projectId={id!} /> : null}
          {!dsRefreshEnabled && activeTab === 'risks' ? <RisksIssuesTab projectId={id!} /> : null}
          {!dsRefreshEnabled && activeTab === 'team' ? <TeamVendorsTab project={project} projectId={id!} reload={state.reload} /> : null}
          {!dsRefreshEnabled && activeTab === 'budget' ? <BudgetTab projectId={id!} /> : null}
          {!dsRefreshEnabled && activeTab === 'lifecycle' ? (
            <LifecycleTab
              canManageProject={canManage}
              onReload={state.reload}
              project={project}
              projectId={id!}
            />
          ) : null}

          <div className="print-footer print-only">
            {project.projectCode} {'·'} Printed {new Date().toLocaleDateString()}
          </div>
        </>
      ) : null}
    </DetailLayout>
  );
}
