import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useTitleBarActions } from '@/app/title-bar-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TipTrigger } from '@/components/common/TipBalloon';
import { StaffingDeskDetailDrawer } from '@/components/staffing-desk/StaffingDeskDetailDrawer';
import { DemandDrillDown } from '@/components/staffing-desk/DemandDrillDown';
import { BenchDashboard } from '@/components/staffing-desk/BenchDashboard';
import { StaffingDeskBoard } from '@/components/staffing-desk/StaffingDeskBoard';
import { StaffingDeskExportButton } from '@/components/staffing-desk/StaffingDeskExportButton';
import { SavedFiltersDropdown } from '@/components/staffing-desk/SavedFiltersDropdown';
import { SupplyDrillDown } from '@/components/staffing-desk/SupplyDrillDown';
import { TeamBuilderModal } from '@/components/staffing-desk/TeamBuilderModal';
import { StaffingDeskKpiStrip } from '@/components/staffing-desk/StaffingDeskKpiStrip';
import { StaffingDeskTable } from '@/components/staffing-desk/StaffingDeskTable';
import { ProjectTimeline } from '@/components/staffing-desk/ProjectTimeline';
import { StaffingDeskViewSwitcher } from '@/components/staffing-desk/StaffingDeskViewSwitcher';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { useStaffingDesk } from '@/features/staffing-desk/useStaffingDesk';
import { useStaffingDeskActions } from '@/features/staffing-desk/useStaffingDeskActions';
import { useFilterParams } from '@/hooks/useFilterParams';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';

const FILTER_DEFAULTS = {
  allocMax: '',
  allocMin: '',
  from: '',
  kind: '',
  orgUnitId: '',
  page: '1',
  pageSize: '50',
  person: '',
  poolId: '',
  priority: '',
  project: '',
  role: '',
  skills: '',
  sortBy: '',
  sortDir: '',
  status: '',
  to: '',
  view: 'table',
};

export function StaffingDeskPage(): JSX.Element {
  const [filters, setFilters, resetFilters] = useFilterParams(FILTER_DEFAULTS);
  const { setActions } = useTitleBarActions();
  const [selectedRow, setSelectedRow] = useState<StaffingDeskRow | null>(null);
  const closeDrawer = useCallback(() => setSelectedRow(null), []);
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [demandOpen, setDemandOpen] = useState(false);
  const [teamBuilderOpen, setTeamBuilderOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [timelinePopup, setTimelinePopup] = useState<{ personId: string; personName: string } | null>(null);

  const state = useStaffingDesk({
    kind: filters.kind,
    person: filters.person,
    project: filters.project,
    poolId: filters.poolId,
    orgUnitId: filters.orgUnitId,
    status: filters.status,
    priority: filters.priority,
    role: filters.role,
    skills: filters.skills,
    from: filters.from,
    to: filters.to,
    allocMin: filters.allocMin,
    allocMax: filters.allocMax,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const deskActions = useStaffingDeskActions(state.refetch);

  // Title bar: Saved Filters, Export, View switcher, Tip
  useEffect(() => {
    setActions(
      <>
        <button className="button button--secondary button--sm" onClick={() => setColumnsOpen(true)} type="button">Columns</button>
        <SavedFiltersDropdown currentFilters={filters} onApply={(f) => setFilters(f as Partial<typeof filters>)} />
        <StaffingDeskExportButton
          disabled={state.isLoading || state.totalCount === 0}
          query={{
            kind: filters.kind, person: filters.person, project: filters.project,
            status: filters.status, priority: filters.priority, from: filters.from, to: filters.to,
            allocMin: filters.allocMin, allocMax: filters.allocMax, role: filters.role, skills: filters.skills,
            poolId: filters.poolId, orgUnitId: filters.orgUnitId,
          }}
        />
        <StaffingDeskViewSwitcher value={filters.view} onChange={(v) => setFilters({ view: v })} />
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, filters, state.isLoading, state.totalCount, setFilters]);

  const handlePersonClick = useCallback((personId: string, personName: string) => {
    setTimelinePopup({ personId, personName });
  }, []);

  return (
    <PageContainer testId="staffing-desk-page">
      <StaffingDeskKpiStrip
        kpis={state.kpis}
        supplyDemand={state.supplyDemand}
        onSupplyClick={() => setSupplyOpen(true)}
        onDemandClick={() => setDemandOpen(true)}
      />

      {/* Action buttons below KPIs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
        <Link className="button button--sm" to="/assignments/new">Make Assignment</Link>
        <Link className="button button--secondary button--sm" to="/staffing-requests/new">Create Staffing Request</Link>
      </div>

      {state.isLoading && <LoadingState variant="skeleton" skeletonType="table" />}
      {state.error && <ErrorState description={state.error} />}

      {!state.isLoading && !state.error && filters.view === 'table' && (
        <StaffingDeskTable
          items={state.items}
          onRowClick={setSelectedRow}
          onPersonClick={handlePersonClick}
          activeTab={filters.kind}
          onTabChange={(tab) => setFilters({ kind: tab === 'supply' ? 'assignment' : 'request', page: '1' })}
          columnsOpen={columnsOpen}
          onColumnsClose={() => setColumnsOpen(false)}
        />
      )}

      {!state.isLoading && !state.error && filters.view === 'timeline' && (
        <ProjectTimeline filters={{ poolId: filters.poolId, projectId: filters.project }} />
      )}

      {!state.isLoading && !state.error && filters.view === 'board' && (
        <StaffingDeskBoard items={state.items} onCardClick={setSelectedRow} />
      )}

      {filters.view === 'bench' && (
        <BenchDashboard poolId={filters.poolId} orgUnitId={filters.orgUnitId} />
      )}

      {/* Pagination — includes "X of Y records" */}
      {!state.isLoading && !state.error && state.totalCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)', borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface-alt)', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
        }}>
          <span style={{ flex: '1 1 0', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
            {state.items.length} of {state.totalCount} records
          </span>
          <div style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
            <button className="button button--secondary button--sm" disabled={state.page <= 1} onClick={() => setFilters({ page: String(state.page - 1) })} type="button">&larr;</button>
            <span style={{ minWidth: 80, textAlign: 'center' }}>Page {state.page} of {Math.max(1, Math.ceil(state.totalCount / state.pageSize))}</span>
            <button className="button button--secondary button--sm" disabled={state.page >= Math.ceil(state.totalCount / state.pageSize)} onClick={() => setFilters({ page: String(state.page + 1) })} type="button">&rarr;</button>
          </div>
          <span style={{ flex: '1 1 0', textAlign: 'right' }}>
            <select className="field__control" style={{ fontSize: 11, padding: '2px 6px', width: 'auto', display: 'inline', minWidth: 0 }} value={filters.pageSize} onChange={(e) => setFilters({ pageSize: e.target.value, page: '1' })}>
              {[25, 50, 100].map((n) => <option key={n} value={String(n)}>{n}/page</option>)}
            </select>
          </span>
        </div>
      )}

      {/* Person timeline popup */}
      {timelinePopup && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)' }} onClick={() => setTimelinePopup(null)} />
          <div style={{
            position: 'relative', width: 600, maxWidth: '95vw',
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 12, boxShadow: 'var(--shadow-modal)', padding: 'var(--space-3) var(--space-4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{timelinePopup.personName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Workload Timeline &mdash; 6 months back, 12 months forward</div>
              </div>
              <button className="button button--secondary button--sm" onClick={() => setTimelinePopup(null)} type="button">&times;</button>
            </div>
            <WorkloadTimeline personId={timelinePopup.personId} />
          </div>
        </div>
      )}

      {/* Drawers & modals */}
      <StaffingDeskDetailDrawer actions={deskActions} onClose={closeDrawer} row={selectedRow} />
      <SupplyDrillDown open={supplyOpen} onClose={() => setSupplyOpen(false)} poolId={filters.poolId} orgUnitId={filters.orgUnitId} />
      <DemandDrillDown open={demandOpen} onClose={() => setDemandOpen(false)} projectId={filters.project} />
      <TeamBuilderModal open={teamBuilderOpen} onClose={() => setTeamBuilderOpen(false)} />
    </PageContainer>
  );
}
