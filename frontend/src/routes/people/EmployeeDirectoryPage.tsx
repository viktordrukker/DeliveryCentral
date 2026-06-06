import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { CopyLinkButton } from '@/components/common/CopyLinkButton';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { EmployeeDirectoryTable } from '@/components/people/EmployeeDirectoryTable';
import { useEmployeeDirectory } from '@/features/people/useEmployeeDirectory';
import { useFilterParams } from '@/hooks/useFilterParams';
import { bulkReassignOrgMembership } from '@/lib/api/organization';
import { fetchOrgChart, OrgChartNode } from '@/lib/api/org-chart';
import { fetchResourcePools, ResourcePool } from '@/lib/api/resource-pools';
import { exportToXlsx } from '@/lib/export';
import { HR_DIRECTOR_ADMIN_ROLES, PEOPLE_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { Avatar, Button } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { TabBar } from '@/components/common/TabBar';
import { BenchEnrichedPanel } from '@/components/people/BenchEnrichedPanel';
import { CasesPanel } from '@/components/cases/CasesPanel';
import { LeaveApprovalsPanel } from '@/components/people/LeaveApprovalsPanel';
import { PersonDirectoryInspector } from '@/components/people/PersonDirectoryInspector';
import { fetchEnrichedBench } from '@/lib/api/people-bench';
import { fetchSidebarCounts } from '@/lib/api/sidebar-counts';

const defaultPageSize = 25;

export function EmployeeDirectoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const canManagePeople = hasAnyRole(principal?.roles, PEOPLE_MANAGE_ROLES);
  const canBulkReassign = hasAnyRole(principal?.roles, HR_DIRECTOR_ADMIN_ROLES);
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  // V2-B.18 — `role` is server-side; `grade`/`groupBy`/`layout` are client-side
  // refinements over the loaded page (same page-local model as `search`).
  // SCOPED-MIN-3 — `selected` joins the URL-persisted filter set so the
  // inspector drawer survives reload/back-nav (UX Law 5 + Law 10).
  const [filters, setFilters] = useFilterParams({ departmentId: '', lifecycleStatus: 'ACTIVE', resourcePoolId: '', search: '', view: 'directory', role: '', grade: '', layout: 'list', groupBy: 'flat', selected: '' });
  const [page, setPage] = useState(1);
  const [resourcePools, setResourcePools] = useState<ResourcePool[]>([]);
  // V2-A.12 — header count badge for people currently on the bench.
  const [benchCount, setBenchCount] = useState<number | null>(null);
  // V2-B.17 — HR-Queue tab count (the directory header already shows bench; do
  // not duplicate the bench number on the tab to avoid double-counting).
  const [hrQueueCount, setHrQueueCount] = useState<number | null>(null);
  // V2 §4 item 6 — list-detail inspector pane. Only used in the flat+list
  // layout under dsRefresh; other layouts (grid, grouped list) retain the
  // legacy navigate-on-click behavior to keep this change scoped.
  // SCOPED-MIN-3 — sourced from URL via `filters.selected` to deep-link the drawer.
  const selectedPersonId = filters.selected || null;
  const setSelectedPersonId = (id: string | null): void => setFilters({ selected: id ?? '' });
  const { setActions } = useTitleBarActions();

  // LEAN-P4-missing-4 — bulk org-structure reassignment (HR/Director/Admin).
  // Gated by dsRefresh and HR_DIRECTOR_ADMIN_ROLES.
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOrgUnits, setBulkOrgUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [bulkTargetUnitId, setBulkTargetUnitId] = useState('');
  const [bulkEffectiveFrom, setBulkEffectiveFrom] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    moved: number;
    skipped: number;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!dsRefreshEnabled || !canBulkReassign || !bulkPanelOpen) return;
    let active = true;
    function flatten(nodes: OrgChartNode[]): Array<{ id: string; name: string }> {
      const out: Array<{ id: string; name: string }> = [];
      for (const node of nodes) {
        out.push({ id: node.id, name: node.name });
        if (node.children?.length) out.push(...flatten(node.children));
      }
      return out;
    }
    void fetchOrgChart()
      .then((chart) => {
        if (active) setBulkOrgUnits(flatten(chart.roots).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => {
        if (active) setBulkOrgUnits([]);
      });
    return () => {
      active = false;
    };
  }, [dsRefreshEnabled, canBulkReassign, bulkPanelOpen]);

  function toggleBulkSelected(id: string): void {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkConfirm(reason?: string): Promise<void> {
    setBulkConfirmOpen(false);
    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const res = await bulkReassignOrgMembership({
        personIds: Array.from(bulkSelectedIds),
        toOrgUnitId: bulkTargetUnitId,
        effectiveFrom: bulkEffectiveFrom,
        reason: reason?.trim() || undefined,
      });
      setBulkResult({
        moved: res.movedPersonIds.length,
        skipped: res.skippedPersonIds.length,
      });
      setBulkSelectedIds(new Set());
    } catch (err) {
      setBulkResult({ moved: 0, skipped: 0, error: err instanceof Error ? err.message : 'Bulk reassign failed.' });
    } finally {
      setBulkSubmitting(false);
    }
  }

  useEffect(() => {
    void fetchResourcePools().then((r) => setResourcePools(r.items));
  }, []);

  useEffect(() => {
    if (!dsRefreshEnabled) return;
    let active = true;
    void fetchEnrichedBench()
      .then((rows) => {
        if (active) setBenchCount(rows.filter((r) => r.isOnBench).length);
      })
      .catch(() => {
        if (active) setBenchCount(null);
      });
    return () => {
      active = false;
    };
  }, [dsRefreshEnabled]);

  // V2-B.17 — HR-Queue tab count via sidebar-counts.
  useEffect(() => {
    if (!dsRefreshEnabled) return;
    let active = true;
    void fetchSidebarCounts()
      .then((c) => {
        if (active) setHrQueueCount(c.hrQueue);
      })
      .catch(() => {
        if (active) setHrQueueCount(null);
      });
    return () => {
      active = false;
    };
  }, [dsRefreshEnabled]);

  const state = useEmployeeDirectory({
    departmentId: filters.departmentId || undefined,
    lifecycleStatus: filters.lifecycleStatus,
    page,
    pageSize: defaultPageSize,
    resourcePoolId: filters.resourcePoolId || undefined,
    role: dsRefreshEnabled ? filters.role || undefined : undefined,
    search: filters.search,
  });

  // Inject actions into title bar
  useEffect(() => {
    setActions(
      <>
        {canManagePeople && state.data && (state.data.total > 0 || state.visibleItems.length > 0) ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={state.isLoading}
            onClick={() => {
              exportToXlsx(
                state.visibleItems.map((p) => ({
                  Email: p.primaryEmail ?? '',
                  'Line Manager': p.currentLineManager?.displayName ?? '',
                  Name: p.displayName,
                  'Org Unit': p.currentOrgUnit?.name ?? '',
                })),
                'people-directory',
              );
            }}
            type="button"
          >
            Export XLSX
          </Button>
        ) : null}
        {dsRefreshEnabled && canBulkReassign ? (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setBulkPanelOpen((v) => !v)}
            data-testid="people-bulk-reassign-toggle"
          >
            {bulkPanelOpen ? 'Close bulk reassign' : 'Bulk reassign org unit'}
          </Button>
        ) : null}
        {canManagePeople ? (
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/people/new')} type="button">
            Create employee
          </Button>
        ) : null}
        <CopyLinkButton />
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, canManagePeople, canBulkReassign, dsRefreshEnabled, bulkPanelOpen, state.data, state.visibleItems, state.isLoading, navigate]);

  // V2-A.8 — canvas 3-tab shell: Directory / Bench / HR Queue. Each pane
  // mounts its own data-fetching panel; the parent owns the tab selection
  // state via the `view` URL filter param so deep-links survive reloads.
  // V2-B.17 — HR-Queue tab carries a live count badge from sidebar-counts.
  // Bench tab count is intentionally omitted: the header already shows
  // "N on bench" (A12) and duplicating it on the tab would double-count.
  const peopleTabs: { id: string; label: import('react').ReactNode }[] = [
    { id: 'directory', label: 'Directory' },
    { id: 'bench', label: 'Bench' },
    {
      id: 'cases',
      label:
        hrQueueCount != null && hrQueueCount > 0 ? (
          <>
            HR Queue{' '}
            <span style={{ marginLeft: 4, fontVariantNumeric: 'tabular-nums', opacity: 0.8 }}>
              ({hrQueueCount})
            </span>
          </>
        ) : (
          'HR Queue'
        ),
    },
    { id: 'leave-approvals', label: 'Leave Approvals' },
  ];
  const activeView = peopleTabs.some((t) => t.id === filters.view) ? filters.view : 'directory';

  // ── V2-B.18/19 — directory filter chips + grid/group-by (dsRefresh only).
  // role is server-side (already in the query); grade/groupBy/layout refine the
  // loaded page client-side, exactly like the existing search filter.
  const directoryItems = state.visibleItems;
  const officeOf = (p: (typeof directoryItems)[number]): string => p.currentOrgUnit?.name ?? '—';
  const roleOptions = Array.from(
    new Set(directoryItems.map((p) => p.role).filter((r): r is string => !!r)),
  ).sort();
  const gradeOptions = Array.from(
    new Set(directoryItems.map((p) => p.grade).filter((g): g is string => !!g)),
  ).sort();
  const gradeFilteredItems = filters.grade
    ? directoryItems.filter((p) => p.grade === filters.grade)
    : directoryItems;
  const groupKeyOf = (p: (typeof directoryItems)[number]): string =>
    filters.groupBy === 'role'
      ? p.role ?? '—'
      : filters.groupBy === 'grade'
        ? p.grade ?? '—'
        : filters.groupBy === 'office'
          ? officeOf(p)
          : '';
  const groupedDirectory: Array<{ key: string; items: typeof directoryItems }> =
    filters.groupBy === 'flat'
      ? [{ key: '', items: gradeFilteredItems }]
      : Array.from(
          gradeFilteredItems.reduce((map, p) => {
            const k = groupKeyOf(p);
            (map.get(k) ?? map.set(k, []).get(k)!).push(p);
            return map;
          }, new Map<string, typeof directoryItems>()),
        )
          .map(([key, items]) => ({ key, items }))
          .sort((a, b) => a.key.localeCompare(b.key));

  return (
    <PageContainer testId="employee-directory-page" viewport>
      {dsRefreshEnabled ? (
        <PageHeader
          eyebrow="Workforce"
          title="People"
          subtitle="Directory, bench availability, and the HR action queue for your organization."
          badges={
            <>
              {state.data ? (
                <StatusBadge tone="info" label={`${state.data.total} people`} variant="chip" />
              ) : null}
              {benchCount !== null ? (
                <StatusBadge
                  tone={benchCount > 0 ? 'warning' : 'active'}
                  label={`${benchCount} on bench`}
                  variant="chip"
                />
              ) : null}
            </>
          }
        />
      ) : null}
      {dsRefreshEnabled ? (
        <TabBar
          tabs={peopleTabs}
          activeTab={activeView}
          onTabChange={(tab) => setFilters({ view: tab })}
        />
      ) : null}
      {dsRefreshEnabled && activeView === 'bench' ? <BenchEnrichedPanel /> : null}
      {dsRefreshEnabled && activeView === 'cases' ? <CasesPanel /> : null}
      {dsRefreshEnabled && activeView === 'leave-approvals' ? <LeaveApprovalsPanel /> : null}
      {dsRefreshEnabled && activeView !== 'directory' ? null : (
      <>
      {dsRefreshEnabled && canBulkReassign && bulkPanelOpen ? (
        <SectionCard title="Bulk reassign org unit">
          <div data-testid="people-bulk-reassign-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13 }}>
              Select people below, choose the destination org unit and effective date, then confirm. The current membership closes the day before <code>effectiveFrom</code>; a new one opens on it.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
              <label className="field">
                <span className="field__label">Destination org unit</span>
                <select
                  className="field__control"
                  value={bulkTargetUnitId}
                  onChange={(e) => setBulkTargetUnitId(e.target.value)}
                  data-testid="people-bulk-target-unit"
                >
                  <option value="">Select unit…</option>
                  {bulkOrgUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field__label">Effective from</span>
                <input
                  className="field__control"
                  type="date"
                  value={bulkEffectiveFrom}
                  onChange={(e) => setBulkEffectiveFrom(e.target.value)}
                  data-testid="people-bulk-effective-from"
                />
              </label>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={bulkSelectedIds.size === 0 || !bulkTargetUnitId || !bulkEffectiveFrom || bulkSubmitting}
                  onClick={() => setBulkConfirmOpen(true)}
                  data-testid="people-bulk-reassign-submit"
                >
                  Reassign {bulkSelectedIds.size} {bulkSelectedIds.size === 1 ? 'person' : 'people'}
                </Button>
                {bulkSelectedIds.size > 0 ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setBulkSelectedIds(new Set())}
                  >
                    Clear selection
                  </Button>
                ) : null}
              </div>
            </div>
            {bulkResult ? (
              bulkResult.error ? (
                <ErrorState description={bulkResult.error} />
              ) : (
                <div
                  data-testid="people-bulk-reassign-result"
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-alt)',
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  Moved {bulkResult.moved} · skipped {bulkResult.skipped} (already in destination).
                </div>
              )
            ) : null}
            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 6 }}>
              <ul
                data-testid="people-bulk-select-list"
                style={{ listStyle: 'none', margin: 0, padding: 0 }}
              >
                {state.visibleItems.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderBottom: '1px solid var(--color-border)',
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={bulkSelectedIds.has(p.id)}
                      onChange={() => toggleBulkSelected(p.id)}
                      aria-label={`Select ${p.displayName}`}
                      data-testid={`people-bulk-select-${p.id}`}
                    />
                    <span style={{ fontWeight: 500, minWidth: 180 }}>{p.displayName}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {p.currentOrgUnit?.name ?? 'Unassigned'}
                    </span>
                  </li>
                ))}
                {state.visibleItems.length === 0 ? (
                  <li style={{ padding: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 13 }}>
                    No people in view. Adjust filters above to select people for reassignment.
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        </SectionCard>
      ) : null}
      <FilterBar>
        <label className="field">
          <span className="field__label">Search</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ search: event.target.value })}
            placeholder="Search by person, org unit, manager, or email"
            type="search"
            value={filters.search}
          />
        </label>
        <label className="field">
          <span className="field__label">Department ID</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ departmentId: event.target.value })}
            placeholder="Filter by department"
            type="text"
            value={filters.departmentId}
          />
        </label>
        <label className="field">
          <span className="field__label">Resource Pool</span>
          <select
            className="field__control"
            onChange={(event) => setFilters({ resourcePoolId: event.target.value })}
            value={filters.resourcePoolId}
          >
            <option value="">All pools</option>
            {resourcePools.map((pool) => (
              <option key={pool.id} value={pool.id}>{pool.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Status</span>
          <select
            className="field__control"
            onChange={(event) => { setFilters({ lifecycleStatus: event.target.value }); setPage(1); }}
            value={filters.lifecycleStatus}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
            <option value="ALL">All</option>
          </select>
        </label>
        {/* V2-B.18 — dsRefresh-gated role/grade chips + group-by + layout toggle */}
        {dsRefreshEnabled ? (
          <>
            <label className="field">
              <span className="field__label">Role</span>
              <select
                className="field__control"
                onChange={(event) => { setFilters({ role: event.target.value }); setPage(1); }}
                value={filters.role}
                data-testid="directory-role-filter"
              >
                <option value="">All roles</option>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Grade</span>
              <select
                className="field__control"
                onChange={(event) => setFilters({ grade: event.target.value })}
                value={filters.grade}
                data-testid="directory-grade-filter"
              >
                <option value="">All grades</option>
                {gradeOptions.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Group by</span>
              <select
                className="field__control"
                onChange={(event) => setFilters({ groupBy: event.target.value })}
                value={filters.groupBy}
                data-testid="directory-groupby"
              >
                <option value="flat">None</option>
                <option value="role">Role</option>
                <option value="grade">Grade</option>
                <option value="office">Office</option>
              </select>
            </label>
            <label className="field">
              <span className="field__label">View</span>
              <span style={{ display: 'inline-flex', gap: 4 }} data-testid="directory-layout-toggle">
                <Button
                  variant={filters.layout !== 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  type="button"
                  onClick={() => setFilters({ layout: 'list' })}
                >
                  List
                </Button>
                <Button
                  variant={filters.layout === 'grid' ? 'primary' : 'secondary'}
                  size="sm"
                  type="button"
                  onClick={() => setFilters({ layout: 'grid' })}
                >
                  Grid
                </Button>
              </span>
            </label>
          </>
        ) : null}
      </FilterBar>

      <ViewportTable>
        {state.isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          <>
            {state.data && state.data.total > 0 ? (
              <div className="results-meta">
                <span>
                  {state.visibleItems.length === state.data.items.length
                    ? `Showing ${(state.data.page - 1) * state.data.pageSize + 1}–${Math.min(state.data.page * state.data.pageSize, state.data.total)} of ${state.data.total}`
                    : `Showing ${state.visibleItems.length} filtered`} people
                  {' '}<TipBalloon tip="Use filters above to narrow by department, pool, or status." arrow="left" />
                </span>
                <div className="results-meta__pagination">
                  <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                    Previous
                  </Button>
                  <span>Page {state.data.page}</span>
                  <Button variant="secondary" disabled={state.data.page * state.data.pageSize >= state.data.total} onClick={() => setPage((current) => current + 1)} type="button">
                    Next
                  </Button>
                </div>
              </div>
            ) : null}

            {state.data && state.data.total === 0 ? (
              <EmptyState
                description="The employee directory is available, but there are no people to display yet."
                title="No employees available"
              />
            ) : !dsRefreshEnabled ? (
              <EmployeeDirectoryTable
                items={state.visibleItems}
                onRowClick={(item) => navigate(`/people/${item.id}`)}
              />
            ) : filters.layout === 'grid' ? (
              /* V2-B.19 — grid/card layout */
              <div data-testid="directory-grid">
                {groupedDirectory.map((group) => (
                  <div key={group.key || 'all'}>
                    {group.key ? (
                      <h4 style={{ margin: 'var(--space-3) 0 var(--space-2)', fontSize: 13, color: 'var(--color-text-muted)' }}>
                        {group.key} <span className="muted">({group.items.length})</span>
                      </h4>
                    ) : null}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 'var(--space-3)' }}>
                      {group.items.map((p) => (
                        <Link
                          key={p.id}
                          to={`/people/${p.id}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left',
                            padding: 'var(--space-3)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-card, 8px)', background: 'var(--color-surface)',
                            cursor: 'pointer', textDecoration: 'none', color: 'inherit',
                          }}
                        >
                          <Avatar name={p.displayName} size="md" />
                          <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.displayName}</span>
                            <span className="compact muted" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {[p.role, p.grade, p.currentOrgUnit?.name].filter(Boolean).join(' · ') || '—'}
                            </span>
                            <StatusBadge
                              tone={p.lifecycleStatus === 'ACTIVE' ? 'active' : 'neutral'}
                              label={p.lifecycleStatus}
                              variant="chip"
                              size="small"
                            />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filters.groupBy === 'flat' ? (
              /* V2 §4 item 6 — list-detail layout: DataView on the left,
                 inspector drawer on the right when a row is selected. */
              (() => {
                const selectedRow =
                  selectedPersonId
                    ? gradeFilteredItems.find((p) => p.id === selectedPersonId) ?? null
                    : null;
                const selectedIndex = selectedPersonId
                  ? gradeFilteredItems.findIndex((p) => p.id === selectedPersonId)
                  : -1;
                const stepTo = (delta: number): void => {
                  const next = selectedIndex + delta;
                  if (next < 0 || next >= gradeFilteredItems.length) return;
                  setSelectedPersonId(gradeFilteredItems[next].id);
                };
                return (
                  <div
                    data-testid="directory-list-detail"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: selectedRow
                        ? 'minmax(0, 1fr) minmax(280px, 360px)'
                        : 'minmax(0, 1fr)',
                      gap: 16,
                      alignItems: 'start',
                    }}
                  >
                    <EmployeeDirectoryTable
                      items={gradeFilteredItems}
                      onRowClick={(item) => setSelectedPersonId(item.id)}
                    />
                    {selectedRow ? (
                      <PersonDirectoryInspector
                        row={selectedRow}
                        onClose={() => setSelectedPersonId(null)}
                        position={{
                          index: selectedIndex,
                          total: gradeFilteredItems.length,
                          onPrev: selectedIndex > 0 ? () => stepTo(-1) : undefined,
                          onNext:
                            selectedIndex < gradeFilteredItems.length - 1
                              ? () => stepTo(1)
                              : undefined,
                        }}
                      />
                    ) : null}
                  </div>
                );
              })()
            ) : (
              /* V2-B.18 — grouped list with section headers */
              <div data-testid="directory-grouped">
                {groupedDirectory.map((group) => (
                  <div key={group.key || 'all'} style={{ marginBottom: 'var(--space-4)' }}>
                    <h4 style={{ margin: 'var(--space-2) 0', fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {group.key} <span className="muted">({group.items.length})</span>
                    </h4>
                    <EmployeeDirectoryTable
                      items={group.items}
                      onRowClick={(item) => navigate(`/people/${item.id}`)}
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </ViewportTable>
      </>
      )}
      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Confirm bulk reassign"
        message={`Reassign ${bulkSelectedIds.size} ${bulkSelectedIds.size === 1 ? 'person' : 'people'} to the selected org unit effective ${bulkEffectiveFrom}?`}
        confirmLabel="Reassign"
        requireReason
        onCancel={() => setBulkConfirmOpen(false)}
        onConfirm={(reason) => { void handleBulkConfirm(reason); }}
      />
    </PageContainer>
  );
}
