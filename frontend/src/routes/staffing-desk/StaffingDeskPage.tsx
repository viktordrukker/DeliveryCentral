import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { isFeatureEnabled } from '@/lib/feature-flags';
import { BulkReassignPanel } from '@/components/staffing-desk/BulkReassignPanel';
import { DistributionStudio } from './DistributionStudio';
import { useTitleBarActions } from '@/app/title-bar-context';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { TipTrigger } from '@/components/common/TipBalloon';
import { StaffingDeskDetailDrawer } from '@/components/staffing-desk/StaffingDeskDetailDrawer';
import { CreatePositionDrawer } from '@/components/staffing-requests/CreatePositionDrawer';
import { DemandDrillDown } from '@/components/staffing-desk/DemandDrillDown';
import { StaffingDeskExportButton } from '@/components/staffing-desk/StaffingDeskExportButton';
import { SavedFiltersDropdown } from '@/components/staffing-desk/SavedFiltersDropdown';
import { SupplyDrillDown } from '@/components/staffing-desk/SupplyDrillDown';
import { StaffingDeskKpiStrip } from '@/components/staffing-desk/StaffingDeskKpiStrip';
import { StaffingDeskTable } from '@/components/staffing-desk/StaffingDeskTable';
import { StaffingDeskTabStrip, type StaffingTab } from '@/components/staffing-desk/StaffingDeskTabStrip';
import { StaffingDeskViewSwitcher } from '@/components/staffing-desk/StaffingDeskViewSwitcher';
import { JqlQueryBar } from '@/components/staffing-desk/JqlQueryBar';
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
  // SoT PR 6 — `kind` is the Supply/Demand segmented toggle. Both segments are
  // ProjectPosition rows; `kind` distinguishes filled-supply (assignment) from
  // open-demand (request) for UI grouping only. The legacy `kind=request|assignment`
  // entity discriminator has been retired by PR 1 in favour of "Position" as the
  // canonical entity name.
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
  // SoT PR 6 — currently-active saved tab id. Persists tab selection through
  // back/forward navigation (UX Law 5).
  tab: 'mine',
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

const LIFECYCLE_LEGEND: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'open',       label: 'Open' },
  { key: 'proposed',   label: 'Proposed' },
  { key: 'booked',     label: 'Booked' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'assigned',   label: 'Assigned' },
  { key: 'hold',       label: 'On hold' },
  { key: 'released',   label: 'Released' },
];

export function StaffingDeskPage(): JSX.Element {
  const [filters, setFilters] = useFilterParams(FILTER_DEFAULTS);
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
  const [selectedRow, setSelectedRow] = useState<StaffingDeskRow | null>(null);
  const closeDrawer = useCallback(() => setSelectedRow(null), []);
  const [supplyOpen, setSupplyOpen] = useState(false);
  const [demandOpen, setDemandOpen] = useState(false);
  // SoT PR 8 — embedded CreatePositionDrawer driven by `?openCreatePosition=true`.
  // Same query-param contract as ProjectDetailPage so BenchInspector deep-links
  // and other callers behave consistently.
  const [searchParams, setSearchParams] = useSearchParams();
  const createPositionOpen = searchParams.get('openCreatePosition') === 'true';
  // PR-11 — bench candidate threading: the bench "Propose to position" CTA
  // (and the legacy /staffing-requests/new redirect) forward
  // `?candidatePersonId=<id>`. Arm the drawer with it so the candidate is
  // pinned in the header and auto-proposed after create.
  const candidatePersonId = searchParams.get('candidatePersonId') ?? undefined;
  const closeCreatePosition = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('openCreatePosition');
      next.delete('candidatePersonId');
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const openCreatePosition = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('openCreatePosition', 'true');
      return next;
    }, { replace: true });
  }, [setSearchParams]);
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

  // SoT PR 6 — saved-tab strip + JqlBar are the page chrome that replaces the
  // legacy inline CTA cluster. The title-bar slot keeps the export/columns
  // /view-switcher actions plus the page-level quick-action links
  // (UX Law 9 — every dashboard exposes its companions).
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
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, filters, state.isLoading, state.totalCount, setFilters]);

  const handlePersonClick = useCallback((personId: string, personName: string) => {
    setTimelinePopup({ personId, personName });
  }, []);

  // SoT PR 6 — dirty indicator: any filter that is not the empty default
  // (excluding page/pageSize/tab/view/colWidths) counts as "unsaved moves"
  // relative to the active saved tab.
  const dirty = useMemo(() => {
    return Object.entries(filters).some(([k, v]) => {
      if (k === 'page' || k === 'pageSize' || k === 'tab' || k === 'view' || k === 'colWidths') return false;
      if (k === 'positionIds') return false;
      return v && v !== (FILTER_DEFAULTS as Record<string, string>)[k];
    });
  }, [filters]);

  const onSelectTab = useCallback((tab: StaffingTab) => {
    // Apply the tab's query to URL params, reset paging, switch off planner.
    const reset: Record<string, string> = {};
    for (const k of Object.keys(FILTER_DEFAULTS)) {
      if (k === 'colWidths' || k === 'pageSize') continue;
      reset[k] = '';
    }
    setFilters({ ...reset, ...tab.query, tab: tab.id, page: '1', view: 'table' });
  }, [setFilters]);

  const onOpenPlanner = useCallback(() => {
    setFilters({ view: 'planner' });
  }, [setFilters]);

  const handleJqlApply = useCallback((nextFilters: Partial<Record<string, string>>) => {
    // Reset all kind/person/project/etc keys touched by the parser; keep colWidths/tab/view.
    const cleared: Record<string, string> = {};
    for (const [k, v] of Object.entries(nextFilters)) cleared[k] = v ?? '';
    setFilters({ ...cleared, page: '1' });
  }, [setFilters]);

  const totalPages = Math.max(1, Math.ceil(state.totalCount / state.pageSize));

  return (
    <PageContainer testId="staffing-desk-page">
      {/* Section 1 — PageHeader with badges (open positions / bench / dirty)
          and the primary "+ New Position" CTA (DS canvas locates the page-level
          primary action in the header, not floating above the table). */}
      <PageHeader
        title="Staffing Desk"
        breadcrumbs={[{ label: 'Workforce' }, { label: 'Staffing Desk' }]}
        badges={
          <>
            <span className="badge badge-outline" data-testid="sd-badge-open">
              {state.supplyDemand.headcountOpen} open
            </span>
            <span className="badge badge-outline" data-testid="sd-badge-bench">
              {state.supplyDemand.benchCount} bench
            </span>
            {dirty && (
              <span className="sd-tab__dirty" aria-live="polite" data-testid="sd-badge-dirty">
                unsaved moves
              </span>
            )}
          </>
        }
        actions={
          <Button variant="primary" size="sm" type="button" data-testid="create-position-open" onClick={openCreatePosition}>+ New Position</Button>
        }
      />

      {/* Section 2 — Saved tab strip (6 tabs Mine/Public + Distribution Studio + add). */}
      <StaffingDeskTabStrip
        activeTabId={filters.tab}
        currentFilters={filters}
        onSelectTab={onSelectTab}
        dirty={dirty}
        onOpenPlanner={onOpenPlanner}
        plannerActive={filters.view === 'planner'}
      />

      {/* Section 3 — JqlBar (visible when planner not active). */}
      {filters.view !== 'planner' && (
        <div className="sd-jql-row">
          <div className="sd-jql-row__jql">
            <JqlQueryBar
              filters={filters}
              onApplyFilters={handleJqlApply}
              visible
            />
          </div>
        </div>
      )}

      {/* Section 4 — KPI strip (6 tiles). */}
      <StaffingDeskKpiStrip
        kpis={state.kpis}
        supplyDemand={state.supplyDemand}
        onSupplyClick={() => setSupplyOpen(true)}
        onDemandClick={() => setDemandOpen(true)}
      />

      {/* Section 5 — Supply/Demand segmented toggle (SoT PR 6).
          Chrome (Columns/SavedFilters/Export) lives in the title-bar slot
          and is not duplicated here. */}
      {filters.view !== 'planner' && (
        <div className="sd-bulk-bar">
          <div className="sd-bulk-bar__supply-toggle" role="tablist" aria-label="Supply / Demand">
            <Button
              role="tab"
              aria-selected={filters.kind !== 'request'}
              variant={filters.kind !== 'request' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilters({ kind: 'assignment', page: '1' })}
              type="button"
              style={{ borderRadius: 0 }}
            >
              Supply
            </Button>
            <Button
              role="tab"
              aria-selected={filters.kind === 'request'}
              variant={filters.kind === 'request' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilters({ kind: 'request', page: '1' })}
              type="button"
              style={{ borderRadius: 0 }}
            >
              Demand
            </Button>
          </div>
        </div>
      )}

      {/* SoT PR 17g — the "+ New Position" CTA was promoted into the PageHeader's
          actions slot above (DS canvas locates the page-level primary action in
          the header, not floating above the table). The CreatePositionDrawer
          remains mounted here so deep-links (?openCreatePosition=true) work. */}
      <CreatePositionDrawer
        open={createPositionOpen}
        initialProjectId={filters.project || filters.projectId || undefined}
        candidatePersonId={candidatePersonId}
        onClose={closeCreatePosition}
        onCreated={() => {
          closeCreatePosition();
          state.refetch();
        }}
      />

      {state.isLoading && <LoadingState variant="skeleton" skeletonType="table" />}
      {state.error && <ErrorState description={state.error} />}

      {/* Section 6 — Master DataTable with filter row + util column + lifecycle legend. */}
      {!state.isLoading && !state.error && (filters.view === 'table' || !filters.view) && (
        <>
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
          {dsRefreshEnabled && (
            <BulkReassignPanel
              items={state.items.filter((row) => !HIDDEN_STATUSES.has(row.status?.toUpperCase() ?? ''))}
              onApplied={() => state.refetch()}
            />
          )}
          {/* Lifecycle legend — readable but unobtrusive (DS canvas L393-413). */}
          <div className="sd-lifecycle-legend" aria-label="Position lifecycle legend">
            <span className="sd-lifecycle-legend__label">Timeline legend</span>
            {LIFECYCLE_LEGEND.map((l) => (
              <span key={l.key} className="sd-lifecycle-legend__item">
                <span className={`sd-lifecycle-legend__swatch sd-lifecycle-legend__swatch--${l.key}`} aria-hidden />
                <span>{l.label}</span>
              </span>
            ))}
          </div>
        </>
      )}

      {filters.view === 'planner' && (
        /* SoT PR 7 — single canonical Distribution Studio (DS canvas Planner
           view): JqlBar → 240px BenchSidebar + PlannerGrid + AnomalyDrawer.
           Scenario CRUD lives inside the planner toolbar (PlannerScenariosMenu);
           the standalone PlannerScenarioPanel + scenarios-only DistributionStudio
           were retired. */
        <DistributionStudio poolId={filters.poolId} orgUnitId={filters.orgUnitId} />
      )}

      {/* Section 7 — Pagination footer. */}
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
            <span style={{ minWidth: 80, textAlign: 'center' }}>Page {state.page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={state.page >= totalPages} onClick={() => setFilters({ page: String(state.page + 1) })} type="button">&rarr;</Button>
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
