import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { useTitleBarActions } from '@/app/title-bar-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { TipTrigger } from '@/components/common/TipBalloon';
import { CopyLinkButton } from '@/components/common/CopyLinkButton';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { SavedFiltersDropdown } from '@/components/staffing-desk/SavedFiltersDropdown';
import { AssignmentsWorkflowTable, type WorkflowTab } from '@/components/assignments/AssignmentsWorkflowTable';
import { useStaffingDesk } from '@/features/staffing-desk/useStaffingDesk';
import { useFilterParams } from '@/hooks/useFilterParams';
import { exportToXlsx } from '@/lib/export';
import { ASSIGNMENT_CREATE_ROLES, hasAnyRole } from '@/app/route-manifest';

export function AssignmentsPage(): JSX.Element {
  const navigate = useNavigate();
  const { isLoading: authLoading, principal } = useAuth();
  const [filters, setFilters] = useFilterParams({ tab: 'assignments' });
  const [columnsOpen, setColumnsOpen] = useState(false);

  const isEmployeeOnly = !authLoading &&
    (principal?.roles ?? []).length > 0 &&
    !hasAnyRole(principal?.roles, ASSIGNMENT_CREATE_ROLES);

  const activeTab: WorkflowTab = filters.tab === 'positions' ? 'positions' : 'assignments';

  const state = useStaffingDesk({
    kind: '',
    personId: isEmployeeOnly ? (principal?.personId ?? undefined) : undefined,
  });

  const { setActions } = useTitleBarActions();

  useEffect(() => {
    setActions(
      <>
        <button
          className="button button--secondary button--sm"
          onClick={() => setColumnsOpen(true)}
          style={{ fontSize: 10 }}
          type="button"
        >
          Columns
        </button>
        <SavedFiltersDropdown
          currentFilters={filters}
          onApply={(f) => setFilters(f)}
          storageKey="assignments-saved-filters"
        />
        {state.items.length > 0 && (
          <button
            className="button button--secondary button--sm"
            disabled={state.isLoading}
            onClick={() => {
              const tabItems = state.items.filter((r) =>
                activeTab === 'assignments' ? r.kind === 'assignment' : r.kind === 'request',
              );
              exportToXlsx(
                tabItems.map((r) => ({
                  ...(r.kind === 'assignment'
                    ? {
                        Person: r.personName ?? '',
                        Project: r.projectName,
                        Role: r.role,
                        'Allocation %': r.allocationPercent,
                        Start: r.startDate.slice(0, 10),
                        End: r.endDate?.slice(0, 10) ?? 'Open',
                        Status: r.status,
                      }
                    : {
                        Project: r.projectName,
                        Role: r.role,
                        Priority: r.priority ?? '',
                        'HC Required': r.headcountRequired ?? 1,
                        'HC Fulfilled': r.headcountFulfilled ?? 0,
                        Status: r.status,
                      }),
                })),
                activeTab,
              );
            }}
            style={{ fontSize: 10 }}
            type="button"
          >
            Export XLSX
          </button>
        )}
        {!isEmployeeOnly && (
          <>
            <Link className="button button--secondary button--sm" to="/assignments/new">
              Create Assignment
            </Link>
            <Link className="button button--sm" to="/staffing-requests/new">
              Create Position
            </Link>
          </>
        )}
        <CopyLinkButton />
        <TipTrigger />
      </>,
    );
    return () => setActions(null);
    // Use primitive/string keys so identity-changing object refs (filters, state.items)
    // don't retrigger the effect on every render and cause infinite loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActions, state.items.length, state.isLoading, isEmployeeOnly, JSON.stringify(filters), activeTab, setFilters]);

  function handleRowClick(row: { id: string; kind: string }): void {
    if (row.kind === 'assignment') navigate(`/assignments/${row.id}`);
    else navigate(`/staffing-requests/${row.id}`);
  }

  return (
    <PageContainer testId="assignments-page" viewport>
      <ViewportTable>
        {state.isLoading ? <LoadingState variant="skeleton" skeletonType="table" /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          state.items.length === 0 ? (
            <EmptyState
              action={!isEmployeeOnly ? { href: '/assignments/new', label: 'Create Assignment' } : undefined}
              description="No assignments or positions found."
              title="Nothing here yet"
            />
          ) : (
            <AssignmentsWorkflowTable
              items={state.items}
              activeTab={activeTab}
              onTabChange={(tab) => setFilters({ tab })}
              onRowClick={handleRowClick}
              columnsOpen={columnsOpen}
              onColumnsClose={() => setColumnsOpen(false)}
            />
          )
        ) : null}
      </ViewportTable>
    </PageContainer>
  );
}
