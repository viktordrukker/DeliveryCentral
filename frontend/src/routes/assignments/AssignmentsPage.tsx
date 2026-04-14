import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TipBalloon, TipTrigger } from '@/components/common/TipBalloon';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { AssignmentsTable } from '@/components/assignments/AssignmentsTable';
import { useAssignments } from '@/features/assignments/useAssignments';
import { useFilterParams } from '@/hooks/useFilterParams';
import { ASSIGNMENT_STATUS_LABELS } from '@/lib/labels';
import { exportToXlsx } from '@/lib/export';

const ASSIGNMENT_MANAGE_ROLES = ['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'];

export function AssignmentsPage(): JSX.Element {
  const navigate = useNavigate();
  const { isLoading: authLoading, principal } = useAuth();
  const [filters, setFilters, resetFilters] = useFilterParams({ from: '', person: '', project: '', status: '', to: '' });

  // Employees can only see their own assignments. Default the person filter
  // to the logged-in person's id when the role is employee-only.
  const isEmployeeOnly = !authLoading &&
    (principal?.roles ?? []).length > 0 &&
    (principal?.roles ?? []).every((r) => !ASSIGNMENT_MANAGE_ROLES.includes(r));

  const effectivePersonId = isEmployeeOnly ? (principal?.personId ?? '') : undefined;
  const effectivePerson = isEmployeeOnly
    ? (principal?.personId ?? '')
    : filters.person;

  const { setActions } = useTitleBarActions();

  const state = useAssignments({
    from: filters.from,
    person: effectivePerson,
    personId: effectivePersonId,
    project: filters.project,
    status: filters.status,
    to: filters.to,
  });

  // Inject actions into title bar (filters stay in FilterBar since >3 fields)
  useEffect(() => {
    setActions(
      <>
        {state.visibleItems.length > 0 && !isEmployeeOnly ? (
          <button
            className="button button--secondary button--sm"
            disabled={state.isLoading}
            onClick={() => {
              exportToXlsx(
                state.visibleItems.map((a) => ({
                  'Allocation %': a.allocationPercent,
                  Person: a.person.displayName,
                  Project: a.project.displayName,
                  'Staffing Role': a.staffingRole,
                  Status: a.approvalState,
                })),
                'assignments',
              );
            }}
            type="button"
          >
            Export XLSX
          </button>
        ) : null}
        {!isEmployeeOnly ? (
          <>
            <Link className="button button--secondary button--sm" to="/assignments/bulk">
              Bulk assign
            </Link>
            <Link className="button button--sm" to="/assignments/new">
              Create assignment
            </Link>
          </>
        ) : null}
        <TipTrigger />
      </>
    );
    return () => setActions(null);
  }, [setActions, state.visibleItems, state.isLoading, isEmployeeOnly]);

  return (
    <PageContainer testId="assignments-page" viewport>
      <FilterBar
        actions={
          <button className="button button--secondary" onClick={resetFilters} type="button">
            Reset
          </button>
        }
      >
        <label className="field">
          <span className="field__label">Person</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ person: event.target.value })}
            placeholder="Filter by person name"
            type="search"
            value={filters.person}
          />
        </label>
        <label className="field">
          <span className="field__label">Project</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ project: event.target.value })}
            placeholder="Filter by project name"
            type="search"
            value={filters.project}
          />
        </label>
        <label className="field">
          <span className="field__label">Approval State</span>
          <select
            className="field__control"
            onChange={(event) => setFilters({ status: event.target.value })}
            value={filters.status}
          >
            <option value="">All statuses</option>
            {Object.entries(ASSIGNMENT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">From</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ from: event.target.value })}
            type="date"
            value={filters.from}
          />
        </label>
        <label className="field">
          <span className="field__label">To</span>
          <input
            className="field__control"
            onChange={(event) => setFilters({ to: event.target.value })}
            type="date"
            value={filters.to}
          />
        </label>
      </FilterBar>

      <ViewportTable>
        {state.isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          <>
            {state.totalCount > 0 ? (
              <div className="results-meta">
                <span>
                  Showing {state.visibleItems.length} of {state.totalCount} assignments
                  {' '}<TipBalloon tip="Filter by person, project, status, or date range to narrow results." arrow="left" />
                </span>
              </div>
            ) : null}

            {state.visibleItems.length === 0 ? (
              <EmptyState
                action={{ href: '/assignments/new', label: 'Create Assignment' }}
                description="The assignment register has no matching staffing records for the current filters."
                title="No assignments yet"
              />
            ) : (
              <AssignmentsTable
                items={state.visibleItems}
                onRowClick={(item) => navigate(`/assignments/${item.id}`)}
              />
            )}
          </>
        ) : null}
      </ViewportTable>
    </PageContainer>
  );
}
