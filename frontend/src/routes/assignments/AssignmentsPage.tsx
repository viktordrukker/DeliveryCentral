import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { TableSkeleton } from '@/components/common/Skeleton';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { ViewportTable } from '@/components/layout/ViewportTable';
import { AssignmentsTable } from '@/components/assignments/AssignmentsTable';
import { useAssignments } from '@/features/assignments/useAssignments';
import { ASSIGNMENT_STATUS_LABELS } from '@/lib/labels';
import { exportToXlsx } from '@/lib/export';

const ASSIGNMENT_MANAGE_ROLES = ['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'];

export function AssignmentsPage(): JSX.Element {
  const navigate = useNavigate();
  const { isLoading: authLoading, principal } = useAuth();
  const [searchParams] = useSearchParams();
  const [person, setPerson] = useState(() => searchParams.get('person') ?? '');
  const [project, setProject] = useState(() => searchParams.get('project') ?? '');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [from, setFrom] = useState(() => searchParams.get('from') ?? '');
  const [to, setTo] = useState(() => searchParams.get('to') ?? '');

  // Employees can only see their own assignments. Default the person filter
  // to the logged-in person's id when the role is employee-only.
  const isEmployeeOnly = !authLoading &&
    (principal?.roles ?? []).length > 0 &&
    (principal?.roles ?? []).every((r) => !ASSIGNMENT_MANAGE_ROLES.includes(r));

  const effectivePersonId = isEmployeeOnly ? (principal?.personId ?? '') : undefined;
  const effectivePerson = isEmployeeOnly
    ? (principal?.personId ?? '')
    : person;

  useEffect(() => {
    if (!isEmployeeOnly) {
      setPerson(searchParams.get('person') ?? '');
    }
    setProject(searchParams.get('project') ?? '');
    setStatus(searchParams.get('status') ?? '');
    setFrom(searchParams.get('from') ?? '');
    setTo(searchParams.get('to') ?? '');
  }, [searchParams, isEmployeeOnly]);

  const state = useAssignments({
    from,
    person: effectivePerson,
    personId: effectivePersonId,
    project,
    status,
    to,
  });

  function handleReset(): void {
    setPerson('');
    setProject('');
    setStatus('');
    setFrom('');
    setTo('');
  }

  return (
    <PageContainer testId="assignments-page" viewport>
      <PageHeader
        actions={
          <>
            {state.visibleItems.length > 0 && !isEmployeeOnly ? (
              <button
                className="button button--secondary"
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
                <Link className="button button--secondary" to="/assignments/bulk">
                  Bulk assign
                </Link>
                <Link className="button" to="/assignments/new">
                  Create assignment
                </Link>
              </>
            ) : null}
          </>
        }
        eyebrow="Assignments"
        subtitle="Review authoritative person-to-project staffing assignments without mixing in work evidence or external issue data."
        title="Assignments"
      />

      <FilterBar
        actions={
          <button className="button button--secondary" onClick={handleReset} type="button">
            Reset
          </button>
        }
      >
        <label className="field">
          <span className="field__label">Person</span>
          <input
            className="field__control"
            onChange={(event) => setPerson(event.target.value)}
            placeholder="Filter by person name"
            type="search"
            value={person}
          />
        </label>
        <label className="field">
          <span className="field__label">Project</span>
          <input
            className="field__control"
            onChange={(event) => setProject(event.target.value)}
            placeholder="Filter by project name"
            type="search"
            value={project}
          />
        </label>
        <label className="field">
          <span className="field__label">Approval State</span>
          <select
            className="field__control"
            onChange={(event) => setStatus(event.target.value)}
            value={status}
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
            onChange={(event) => setFrom(event.target.value)}
            type="date"
            value={from}
          />
        </label>
        <label className="field">
          <span className="field__label">To</span>
          <input
            className="field__control"
            onChange={(event) => setTo(event.target.value)}
            type="date"
            value={to}
          />
        </label>
      </FilterBar>

      <ViewportTable>
        {state.isLoading ? <TableSkeleton cols={5} rows={6} /> : null}
        {state.error ? <ErrorState description={state.error} /> : null}

        {!state.isLoading && !state.error ? (
          <>
            {state.totalCount > 0 ? (
              <div className="results-meta">
                <span>
                  Showing {state.visibleItems.length} of {state.totalCount} assignments
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
