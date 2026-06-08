import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { hasAnyRole, STAFFING_REQUEST_DETAIL_ROLES } from '@/app/route-manifest';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { BulkReassignPanel } from '@/components/staffing-desk/BulkReassignPanel';
import { DistributionStudio } from './DistributionStudio';
import { useTitleBarActions } from '@/app/title-bar-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TipTrigger } from '@/components/common/TipBalloon';
import { StaffingDeskDetailDrawer } from '@/components/staffing-desk/StaffingDeskDetailDrawer';
import { StaffingRequestDrawer } from '@/components/staffing-requests/StaffingRequestDrawer';
import { DemandDrillDown } from '@/components/staffing-desk/DemandDrillDown';
import { WorkforcePlanner } from '@/components/staffing-desk/WorkforcePlanner';
import { StaffingDeskExportButton } from '@/components/staffing-desk/StaffingDeskExportButton';
import { SavedFiltersDropdown } from '@/components/staffing-desk/SavedFiltersDropdown';
import { SupplyDrillDown } from '@/components/staffing-desk/SupplyDrillDown';
import { PlannerScenarioPanel } from '@/components/staffing-desk/PlannerScenarioPanel';
import { StaffingDeskKpiStrip } from '@/components/staffing-desk/StaffingDeskKpiStrip';
import { StaffingDeskTable } from '@/components/staffing-desk/StaffingDeskTable';
import { StaffingDeskViewSwitcher } from '@/components/staffing-desk/StaffingDeskViewSwitcher';
import { WorkloadTimeline } from '@/components/staffing-desk/WorkloadTimeline';
import { useStaffingDesk } from '@/features/staffing-desk/useStaffingDesk';
import { useStaffingDeskActions } from '@/features/staffing-desk/useStaffingDeskActions';
import { useFilterParams } from '@/hooks/useFilterParams';
import type { StaffingDeskRow } from '@/lib/api/staffing-desk';
import { Button } from '@/components/ds';

const FILTER_DEFAULTS = {
  allocMax: '',
  allocMin: '',
  colWidths: '',
  from: '',
  kind: '',
  orgUnitId: '',
  page: '1',
  pageSize: '50',
  person: '',
  poolId: '',
  // LEAN-P4-missing-6 — CSV of ProjectPosition ids the page is filtered to.
  // Wired in by the Director "What needs you now" anomaly rail (deep-link
  // from /dashboard/director). Filtering is client-side over `state.items`;
  // the BE already narrows by `projectId` carried alongside.
  positionIds: '',
  priority: '',
  project: '',
  projectId: '',
  role: '',
  skills: '',
  sortBy: '',
  sortDir: '',
  status: '',
  to: '',
  view: 'table',
};

function parseColWidths(serialized: string): Record<string, number> {
  if (!serialized) return {};
  const result: Record<string, number> = {};
  for (const pair of serialized.split(',')) {
    const [key, value] = pair.split(':');
    const n = Number(value);
    if (key && Number.isFinite(n) && n > 0) result[key] = n;
  }
  return result;
}

function serializeColWidths(widths: Record<string, number>): string {
  return Object.entries(widths)
    .filter(([, v]) => Number.isFinite(v) && v > 0)
    .map(([k, v]) => `${k}:${Math.round(v)}`)
    .join(',');
}

export function StaffingDeskPage(): JSX.Element {
  const [filters, setFilters, resetFilters] = useFilterParams(FILTER_DEFAULTS);
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  const { setActions } = useTitleBarActions();

  // W3-10 — The legacy `?view=board` (kanban) view was retired in Phase 2;
  // a prior fix made it a render-alias for `view=table`. Now coerce the URL
  // itself so back/forward navigation, bookmarks, and deep-links land on the
  // canonical `?view=table` and the View switcher reflects the selected tab.
  useEffect(() => {
    if (filters.view === 'board') {
      setFilters({ view: 'table' });
    }
  }, [filters.view, setFilters]);
  // W1-23 — DistributionStudio `canEdit` (apply / rename / delete destructive
  // actions) must match BE proposal RBAC. BE `ProposalsController.autoMatch`
  // is guarded by `@RequireRoles(...STAFFING_ROLES)`. Mirror that on the FE
  // so the canEdit gate stops e.g. an employee with /staffing-desk URL access
  // from seeing destructive actions when role narrowing changes elsewhere.
  const { principal } = useAuth();
  const canEditScenarios = hasAnyRole(principal?.roles, STAFFING_REQUEST_DETAIL_ROLES);
  const [selectedRow, setSelectedRow] = useState<StaffingDeskRow | null>(null);
  const closeDrawer = useCallback(() => setSelectedRow(null), []);
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [demandOpen, setDemandOpen] = useState(false);
  const [requestDrawerOpen, setRequestDrawerOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [timelinePopup, setTimelinePopup] = useState<{ personId: string; personName: string } | null>(null);

  // Default-hidden statuses — surfacing rejected/cancelled rows on the
  // staffing desk creates noise; users explicitly look at active/pending
  // work here. They can still appear in dedicated audit/history surfaces.
  const HIDDEN_STATUSES = new Set(['REJECTED', 'CANCELLED']);

  const columnWidths = useMemo(() => parseColWidths(filters.colWidths), [filters.colWidths]);
  const handleColumnWidthChange = useCallback((columnKey: string, width: number) => {
    const next = { ...parseColWidths(filters.colWidths), [columnKey]: Math.round(width) };
    setFilters({ colWidths: serializeColWidths(next) });
  }, [filters.colWidths, setFilters]);

  const state = useStaffingDesk({
    kind: filters.kind,
    person: filters.person,
    project: filters.project,
    projectId: filters.projectId,
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

  // LEAN-P4-missing-6 — when the Director anomaly rail deep-links us with
  // `?positionIds=<csv>`, filter the desk rows down to that exact set.
  // ProjectPosition ids appear as `row.id` (lean-aggregate model: each desk
  // row is the position projected as an assignment/request); rows with no
  // matching id are excluded. Done client-side because the position id is
  // not yet a first-class server-side filter on the desk endpoint.
  const positionIdsSet = useMemo(() => {
    const csv = filters.positionIds.trim();
    if (!csv) return null;
    return new Set(csv.split(',').map((s) => s.trim()).filter((s) => s.length > 0));
  }, [filters.positionIds]);

  const deskActions = useStaffingDeskActions(state.refetch);

  // Title bar: Saved Filters, Export, View switcher, quick-action links, Tip.
  // W3-03 — adds quick-action navigation buttons (Approvals, Bench, Dashboard)
  // to match the canonical DashboardPage grammar
  // (filters + quick-action links + TipTrigger).
  useEffect(() => {
    setActions(
      <>
        <Button variant="secondary" size="sm" onClick={() => setColumnsOpen(true)} type="button">Columns</Button>
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
        <Button as={Link} variant="secondary" size="sm" to="/approvals">Approvals</Button>
        <Button as={Link} variant="secondary" size="sm" to="/people/bench">Bench</Button>
        <Button as={Link} variant="secondary" size="sm" to="/dashboard">Dashboard</Button>
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

      {/* Action buttons below KPIs.
          Sprint F-0.10 (Decision-10) — single canonical staffing flow:
          Create Staffing Request → Slate → Pick → Assignment lifecycle.
          The legacy "Make Assignment" direct-create CTA is removed in v1
          (route gated by `staffingMakeAssignment` flag, default OFF). */}
      {/* W4-06 — button copy clarified per audit. The primary CTA explicitly
          says "Quick" so users know which surface they're about to open; the
          secondary CTA points to the full-page workflow for slate/pick details. */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', padding: 'var(--space-2) 0' }}>
        <Button variant="primary" size="sm" onClick={() => setRequestDrawerOpen(true)}>+ New Staffing Request (Quick)</Button>
        <Button as={Link} variant="ghost" size="sm" to="/staffing-requests/new">New Staffing Request (Full page)</Button>
      </div>
      <StaffingRequestDrawer
        open={requestDrawerOpen}
        onClose={() => setRequestDrawerOpen(false)}
        onSubmitted={() => state.refetch()}
        initialValues={filters.project ? { projectId: filters.project } : undefined}
      />

      {state.isLoading && <LoadingState variant="skeleton" skeletonType="table" />}
      {state.error && <ErrorState description={state.error} />}

      {!state.isLoading && !state.error && (filters.view === 'table' || !filters.view) && (
        <StaffingDeskTable
          items={state.items.filter((row) =>
            !HIDDEN_STATUSES.has(row.status?.toUpperCase() ?? '')
            && (positionIdsSet === null || positionIdsSet.has(row.id))
          )}
          onRowClick={setSelectedRow}
          onPersonClick={handlePersonClick}
          activeTab={filters.kind}
          onTabChange={(tab) => setFilters({ kind: tab === 'supply' ? 'assignment' : 'request', page: '1' })}
          columnsOpen={columnsOpen}
          onColumnsClose={() => setColumnsOpen(false)}
          columnWidths={columnWidths}
          onColumnWidthChange={handleColumnWidthChange}
          dsRefresh={dsRefreshEnabled}
        />
      )}

      {dsRefreshEnabled && !state.isLoading && !state.error && (filters.view === 'table' || !filters.view) && (
        <BulkReassignPanel
          items={state.items.filter((row) => !HIDDEN_STATUSES.has(row.status?.toUpperCase() ?? ''))}
          onApplied={() => state.refetch()}
        />
      )}

      {filters.view === 'planner' && (
        <>
          {/* The full swimlane planner is the flagship Planner surface in both
              flag states. dsRefresh ON additionally surfaces the saved-scenario
              panel + studio beneath it (additive — not a replacement, which
              previously regressed the ON path to a scenario list only).
              LEAN-P4a-2 adds the compact PlannerScenarioPanel sidebar with
              Save / Load / Cancel for the new /api/staffing/scenarios CRUD. */}
          <WorkforcePlanner poolId={filters.poolId} orgUnitId={filters.orgUnitId} />
          {dsRefreshEnabled ? (
            <>
              <PlannerScenarioPanel />
              <DistributionStudio canEdit={canEditScenarios} />
            </>
          ) : null}
        </>
      )}

      {/* Pagination — includes "X of Y records" */}
      {!state.isLoading && !state.error && state.totalCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)', borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface-alt)', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)',
        }}>
          <span style={{ flex: '1 1 0', textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>
            {(state.page - 1) * state.pageSize + 1}&ndash;{Math.min(state.page * state.pageSize, state.totalCount)} of {state.totalCount} records
          </span>
          <div style={{ display: 'inline-flex', gap: 'var(--space-2)', alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
            <Button variant="secondary" size="sm" disabled={state.page <= 1} onClick={() => setFilters({ page: String(state.page - 1) })} type="button">&larr;</Button>
            <span style={{ minWidth: 80, textAlign: 'center' }}>Page {state.page} of {Math.max(1, Math.ceil(state.totalCount / state.pageSize))}</span>
            <Button variant="secondary" size="sm" disabled={state.page >= Math.ceil(state.totalCount / state.pageSize)} onClick={() => setFilters({ page: String(state.page + 1) })} type="button">&rarr;</Button>
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
          <div style={{ position: 'absolute', inset: 0, background: 'var(--color-overlay)' }} onClick={() => setTimelinePopup(null)} />
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
              <Button variant="secondary" size="sm" onClick={() => setTimelinePopup(null)} type="button">&times;</Button>
            </div>
            <WorkloadTimeline personId={timelinePopup.personId} />
          </div>
        </div>
      )}

      {/* Drawers & modals */}
      <StaffingDeskDetailDrawer actions={deskActions} onClose={closeDrawer} row={selectedRow} />
      <SupplyDrillDown open={supplyOpen} onClose={() => setSupplyOpen(false)} poolId={filters.poolId} orgUnitId={filters.orgUnitId} />
      <DemandDrillDown open={demandOpen} onClose={() => setDemandOpen(false)} projectId={filters.project} />
    </PageContainer>
  );
}
