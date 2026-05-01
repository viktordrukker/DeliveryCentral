import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { CopyLinkButton } from '@/components/common/CopyLinkButton';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { EmployeeDirectoryTable } from '@/components/people/EmployeeDirectoryTable';
import { useEmployeeDirectory } from '@/features/people/useEmployeeDirectory';
import { useFilterParams } from '@/hooks/useFilterParams';
import { fetchResourcePools, ResourcePool } from '@/lib/api/resource-pools';
import { exportToXlsx } from '@/lib/export';
import { PEOPLE_MANAGE_ROLES, hasAnyRole } from '@/app/route-manifest';
import { Button } from '@/components/ds';

const defaultPageSize = 25;

export function EmployeeDirectoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const canManagePeople = hasAnyRole(principal?.roles, PEOPLE_MANAGE_ROLES);
  const [filters, setFilters] = useFilterParams({ departmentId: '', lifecycleStatus: 'ACTIVE', resourcePoolId: '', search: '' });
  const [page, setPage] = useState(1);
  const [resourcePools, setResourcePools] = useState<ResourcePool[]>([]);
  const { setActions } = useTitleBarActions();

  useEffect(() => {
    void fetchResourcePools().then((r) => setResourcePools(r.items));
  }, []);

  const state = useEmployeeDirectory({
    departmentId: filters.departmentId || undefined,
    lifecycleStatus: filters.lifecycleStatus,
    page,
    pageSize: defaultPageSize,
    resourcePoolId: filters.resourcePoolId || undefined,
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

  return (
    <PageContainer testId="employee-directory-page" viewport>
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
            ) : (
              <EmployeeDirectoryTable
                items={state.visibleItems}
                onRowClick={(item) => navigate(`/people/${item.id}`)}
              />
            )}
          </>
        ) : null}
      </ViewportTable>
    </PageContainer>
  );
}
