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
import { Button } from '@/components/ds';

import { RadiatorTab } from './tabs/RadiatorTab';
import { MilestonesTab } from './tabs/MilestonesTab';
import { ChangeRequestsTab } from './tabs/ChangeRequestsTab';
import { RisksIssuesTab } from './tabs/RisksIssuesTab';
import { TeamVendorsTab } from './tabs/TeamVendorsTab';
import { BudgetTab } from './tabs/BudgetTab';
import { LifecycleTab } from './tabs/LifecycleTab';

const TABS = [
  { id: 'radiator', label: 'Radiator' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'change-requests', label: 'Change Requests' },
  { id: 'risks', label: 'Risks & Issues' },
  { id: 'team', label: 'Team & Vendors' },
  { id: 'budget', label: 'Budget' },
  { id: 'lifecycle', label: 'Lifecycle' },
];

const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  status: 'radiator',
  report: 'radiator',
};

export function ProjectDetailPage(): JSX.Element {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'radiator';
  const activeTab = LEGACY_TAB_REDIRECTS[rawTab] ?? rawTab;
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

  useEffect(() => {
    if (state.data?.name) setCurrentLabel(state.data.name);
  }, [state.data?.name, setCurrentLabel]);

  useEffect(() => {
    if (!id) return;
    let active = true;

    void (async () => {
      try { const r = await fetchComputedRag(id); if (active) setComputedRag(r); } catch { /* optional */ }
      try { const s = await fetchStaffingSummary(id); if (active) setStaffingSummary(s); } catch { /* optional */ }
    })();

    return () => { active = false; };
  }, [id]);

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
          <span className="kpi-strip__value">{staffingSummary.fillRate}%</span>
          <span className="kpi-strip__label">Fill Rate</span>
        </Link>
      ) : null}

      {computedRag ? (
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
            <Button as={Link} variant="secondary" size="sm" to={`/staffing-requests/new?projectId=${id}`}>Staffing request</Button>
            <Button as={Link} variant="secondary" size="sm" to={`/assignments/new?projectId=${id}`}>Quick assign</Button>
          </div>
        ) : null
      }
      banners={banners}
      kpiStrip={kpiStrip}
      tabs={project ? TABS : undefined}
      activeTab={project ? activeTab : undefined}
      onTabChange={project ? setTab : undefined}
    >
      {project ? (
        <>
          {activeTab === 'radiator' ? <RadiatorTab project={project} projectId={id!} reload={state.reload} /> : null}
          {activeTab === 'milestones' ? <MilestonesTab projectId={id!} shape={state.data?.shape} /> : null}
          {activeTab === 'change-requests' ? <ChangeRequestsTab projectId={id!} /> : null}
          {activeTab === 'risks' ? <RisksIssuesTab projectId={id!} /> : null}
          {activeTab === 'team' ? <TeamVendorsTab project={project} projectId={id!} reload={state.reload} /> : null}
          {activeTab === 'budget' ? <BudgetTab projectId={id!} /> : null}
          {activeTab === 'lifecycle' ? (
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
