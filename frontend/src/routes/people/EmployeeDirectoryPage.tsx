import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { CopyLinkButton } from '@/components/common/CopyLinkButton';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { EmployeeDirectoryTable } from '@/components/people/EmployeeDirectoryTable';
import { useEmployeeDirectory } from '@/features/people/useEmployeeDirectory';
import { useFilterParams } from '@/hooks/useFilterParams';
import { fetchResourcePools, ResourcePool } from '@/lib/api/resource-pools';
import { exportToXlsx } from '@/lib/export';
import { PEOPLE_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { Avatar, Button } from '@/components/ds';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { TabBar } from '@/components/common/TabBar';
import { BenchEnrichedPanel } from '@/components/people/BenchEnrichedPanel';
import { CasesPanel } from '@/components/cases/CasesPanel';
import { fetchEnrichedBench } from '@/lib/api/people-bench';

const defaultPageSize = 25;

export function EmployeeDirectoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const canManagePeople = hasAnyRole(principal?.roles, PEOPLE_MANAGE_ROLES);
  const dsRefreshEnabled = isFeatureEnabled('dsRefresh');
  // V2-B.18 — `role` is server-side; `grade`/`groupBy`/`layout` are client-side
  // refinements over the loaded page (same page-local model as `search`).
  const [filters, setFilters] = useFilterParams({ departmentId: '', lifecycleStatus: 'ACTIVE', resourcePoolId: '', search: '', view: 'directory', role: '', grade: '', layout: 'list', groupBy: 'flat' });
  const [page, setPage] = useState(1);
  const [resourcePools, setResourcePools] = useState<ResourcePool[]>([]);
  // V2-A.12 — header count badge for people currently on the bench.
  const [benchCount, setBenchCount] = useState<number | null>(null);
  const { setActions } = useTitleBarActions();

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
  }, [setActions, canManagePeople, state.data, state.visibleItems, state.isLoading, navigate]);

  // V2-A.8 — canvas 3-tab shell: Directory / Bench / HR Queue. Each pane
  // mounts its own data-fetching panel; the parent owns the tab selection
  // state via the `view` URL filter param so deep-links survive reloads.
  const peopleTabs = [
    { id: 'directory', label: 'Directory' },
    { id: 'bench', label: 'Bench' },
    { id: 'cases', label: 'HR Queue' },
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
      {dsRefreshEnabled && activeView !== 'directory' ? null : (
      <>
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
              <EmployeeDirectoryTable
                items={gradeFilteredItems}
                onRowClick={(item) => navigate(`/people/${item.id}`)}
              />
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
    </PageContainer>
  );
}
