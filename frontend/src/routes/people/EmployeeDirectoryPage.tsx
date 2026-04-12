import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { TableSkeleton } from '@/components/common/Skeleton';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { EmployeeDirectoryTable } from '@/components/people/EmployeeDirectoryTable';
import { useEmployeeDirectory } from '@/features/people/useEmployeeDirectory';
import { fetchResourcePools, ResourcePool } from '@/lib/api/resource-pools';
import { exportToXlsx } from '@/lib/export';

const PEOPLE_MANAGE_ROLES = ['hr_manager', 'resource_manager', 'director', 'admin'];

const defaultPageSize = 10;

export function EmployeeDirectoryPage(): JSX.Element {
  const navigate = useNavigate();
  const { principal } = useAuth();
  const canManagePeople = principal?.roles.some((r) => PEOPLE_MANAGE_ROLES.includes(r)) ?? false;
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [resourcePoolId, setResourcePoolId] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState(
    searchParams.get('status')?.toUpperCase() ?? 'ACTIVE',
  );
  const [page, setPage] = useState(1);
  const [resourcePools, setResourcePools] = useState<ResourcePool[]>([]);

  useEffect(() => {
    void fetchResourcePools().then((r) => setResourcePools(r.items));
  }, []);

  const state = useEmployeeDirectory({
    departmentId: departmentId || undefined,
    lifecycleStatus,
    page,
    pageSize: defaultPageSize,
    resourcePoolId: resourcePoolId || undefined,
    search,
  });

  return (
    <PageContainer testId="employee-directory-page" viewport>
      <PageHeader
        actions={
          canManagePeople ? (
            <>
              {state.data && (state.data.total > 0 || state.visibleItems.length > 0) ? (
                <button
                  className="button button--secondary"
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
                </button>
              ) : null}
              <button
                className="button"
                onClick={() => navigate('/admin/people/new')}
                type="button"
              >
                Create employee
              </button>
            </>
          ) : null
        }
        eyebrow="Organization"
        subtitle="Browse people before creating or reviewing staffing assignments."
        title="Employee Directory"
      />

      <FilterBar>
        <label className="field">
          <span className="field__label">Search</span>
          <input
            className="field__control"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by person, org unit, manager, or email"
            type="search"
            value={search}
          />
        </label>
        <label className="field">
          <span className="field__label">Department ID</span>
          <input
            className="field__control"
            onChange={(event) => setDepartmentId(event.target.value)}
            placeholder="Filter by department"
            type="text"
            value={departmentId}
          />
        </label>
        <label className="field">
          <span className="field__label">Resource Pool</span>
          <select
            className="field__control"
            onChange={(event) => setResourcePoolId(event.target.value)}
            value={resourcePoolId}
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
            onChange={(event) => { setLifecycleStatus(event.target.value); setPage(1); }}
            value={lifecycleStatus}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="TERMINATED">Terminated</option>
            <option value="ALL">All</option>
          </select>
        </label>
      </FilterBar>

      <ViewportTable>
        {state.isLoading ? <TableSkeleton cols={5} rows={8} /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          <>
            {state.data && state.data.total > 0 ? (
              <div className="results-meta">
                <span>
                  Showing {state.visibleItems.length}
                  {state.visibleItems.length === state.data.items.length
                    ? ` of ${state.data.total}`
                    : ` filtered`} people
                </span>
                <div className="results-meta__pagination">
                  <button
                    className="button button--secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    Previous
                  </button>
                  <span>Page {state.data.page}</span>
                  <button
                    className="button button--secondary"
                    disabled={state.data.page * state.data.pageSize >= state.data.total}
                    onClick={() => setPage((current) => current + 1)}
                    type="button"
                  >
                    Next
                  </button>
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
