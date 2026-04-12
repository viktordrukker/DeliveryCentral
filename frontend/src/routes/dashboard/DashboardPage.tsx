import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';

import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { FilterBar } from '@/components/common/FilterBar';
import { LoadingState } from '@/components/common/LoadingState';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import { SectionCard } from '@/components/common/SectionCard';
import { HeadcountTrendChart } from '@/components/charts/HeadcountTrendChart';
import { StaffingStatusDonut } from '@/components/charts/StaffingStatusDonut';
import { WorkloadDistributionChart } from '@/components/charts/WorkloadDistributionChart';
import {
  DashboardPersonSummary,
  DashboardProjectSummary,
  WorkloadDashboardSummary,
  fetchWorkloadDashboardSummary,
  fetchWorkloadTrend,
} from '@/lib/api/workload-dashboard';
import { QueryState } from '@/lib/api/query-state';

const ELEVATED_ROLES = ['resource_manager', 'project_manager', 'hr_manager', 'delivery_manager', 'director', 'admin'];

export function DashboardPage(): JSX.Element {
  const { principal } = useAuth();
  const [asOf, setAsOf] = useState(() => new Date().toISOString());
  const [state, setState] = useState<QueryState<WorkloadDashboardSummary>>({
    isLoading: true,
  });
  const [trendData, setTrendData] = useState<Array<{ count: number; week: string }>>([]);

  useEffect(() => {
    let active = true;

    setState({ isLoading: true });
    void fetchWorkloadDashboardSummary(asOf)
      .then((data) => {
        if (!active) {
          return;
        }

        setState({
          data,
          isLoading: false,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState({
          error: error instanceof Error ? error.message : 'Failed to load dashboard data.',
          isLoading: false,
        });
      });

    return () => {
      active = false;
    };
  }, [asOf]);

  // Fetch headcount trend via dedicated endpoint (single API call)
  useEffect(() => {
    let active = true;

    void fetchWorkloadTrend(12)
      .then((points) => {
        if (!active) return;
        setTrendData(points.map((p) => ({ count: p.activeAssignments, week: p.week })));
      })
      .catch(() => {
        if (!active) return;
        setTrendData([]);
      });

    return () => { active = false; };
  }, [asOf]);

  const projectColumns = useMemo(
    () => [
      {
        key: 'projectCode',
        render: (item: DashboardProjectSummary) => item.projectCode,
        title: 'Code',
      },
      {
        key: 'name',
        render: (item: DashboardProjectSummary) => item.name,
        title: 'Name',
      },
    ],
    [],
  );

  const personColumns = useMemo(
    () => [
      {
        key: 'displayName',
        render: (item: DashboardPersonSummary) => (
          <Link to={`/people/${item.id}`}>{item.displayName}</Link>
        ),
        title: 'Person',
      },
    ],
    [],
  );

  // Derive chart data from summary
  const staffingDonutData = state.data
    ? [
        {
          color: '#22c55e',
          href: '/projects',
          name: 'Staffed',
          value: state.data.totalActiveProjects - state.data.projectsWithNoStaffCount,
        },
        {
          color: '#ef4444',
          href: '/projects?filter=unstaffed',
          name: 'No Staff',
          value: state.data.projectsWithNoStaffCount,
        },
        {
          color: '#f59e0b',
          href: '/dashboard/planned-vs-actual',
          name: 'Evidence Mismatch',
          value: state.data.projectsWithEvidenceButNoApprovedAssignmentCount,
        },
      ]
    : [];

  const workloadData = state.data?.projectsWithNoStaff.map((p) => ({
    name: p.name,
    Unstaffed: 1,
  })) ?? [];

  // Redirect pure-employee accounts to their dedicated dashboard
  if (principal && !principal.roles.some((r) => ELEVATED_ROLES.includes(r))) {
    return <Navigate replace to="/dashboard/employee" />;
  }

  return (
    <PageContainer viewport>
      <PageHeader
        actions={
          <div className="page-header__actions">
            <Link className="button button--secondary" to="/projects">
              View projects
            </Link>
            <Link className="button button--secondary" to="/assignments">
              View assignments
            </Link>
            <Link className="button button--secondary" to="/dashboard/planned-vs-actual">
              Compare planned vs actual
            </Link>
          </div>
        }
        eyebrow="Workload"
        subtitle="Operational summary across projects, assignments, and work evidence."
        title="Dashboard"
      />

      <FilterBar
        actions={
          <button
            className="button button--secondary"
            onClick={() => setAsOf(new Date().toISOString())}
            type="button"
          >
            Reset
          </button>
        }
      >
        <label className="field">
          <span className="field__label">As of</span>
          <input
            className="field__control"
            onChange={(event) => setAsOf(event.target.value)}
            type="datetime-local"
            value={asOf.slice(0, 16)}
          />
        </label>
      </FilterBar>

      {state.isLoading ? <LoadingState label="Loading dashboard summary..." /> : null}
      {state.error ? <ErrorState description={state.error} /> : null}

      {state.data ? (
        <>
          {/* Compact KPI strip */}
          <div className="kpi-strip" aria-label="Key metrics">
            <Link className="kpi-strip__item" to="/projects">
              <span className="kpi-strip__value">{state.data.totalActiveProjects}</span>
              <span className="kpi-strip__label">Active Projects</span>
            </Link>
            <Link className="kpi-strip__item" to="/assignments">
              <span className="kpi-strip__value">{state.data.totalActiveAssignments}</span>
              <span className="kpi-strip__label">Active Assignments</span>
            </Link>
            <Link className="kpi-strip__item" to="/people">
              <span className="kpi-strip__value">{state.data.unassignedActivePeopleCount}</span>
              <span className="kpi-strip__label">Unassigned People</span>
            </Link>
            <Link className="kpi-strip__item" to="/projects">
              <span className="kpi-strip__value">{state.data.projectsWithNoStaffCount}</span>
              <span className="kpi-strip__label">Projects Without Staff</span>
            </Link>
            <Link className="kpi-strip__item" to="/dashboard/planned-vs-actual">
              <span className="kpi-strip__value">{state.data.projectsWithEvidenceButNoApprovedAssignmentCount}</span>
              <span className="kpi-strip__label">Evidence Mismatches</span>
            </Link>
          </div>

          {/* 2×2 viewport-fit grid */}
          <div className="dashboard-main-grid">
            <SectionCard
              chartExport={workloadData.length > 0 ? {
                headers: ['Project', 'Unstaffed'],
                rows: workloadData.map((d) => ({ Project: d.name, Unstaffed: d.Unstaffed })),
              } : undefined}
              collapsible
              title="Workload Distribution"
            >
              {workloadData.length > 0 ? (
                <WorkloadDistributionChart data={workloadData} />
              ) : (
                <EmptyState description="No unstaffed projects." title="All projects staffed" />
              )}
            </SectionCard>

            <SectionCard
              chartExport={{
                headers: ['Status', 'Count'],
                rows: staffingDonutData.map((d) => ({ Status: d.name, Count: d.value })),
              }}
              collapsible
              title="Staffing Status"
            >
              <StaffingStatusDonut data={staffingDonutData} />
            </SectionCard>

            <SectionCard
              chartExport={trendData.length > 0 ? {
                headers: ['Week', 'Active Assignments'],
                rows: trendData.map((d) => ({ Week: d.week, 'Active Assignments': d.count })),
              } : undefined}
              collapsible
              title="Headcount Trend (12 Weeks)"
            >
              {trendData.length > 0 ? (
                <HeadcountTrendChart data={trendData} />
              ) : (
                <EmptyState description="Trend data is loading." title="Loading trend" />
              )}
            </SectionCard>

            <SectionCard title="Projects Without Staff">
              <div className="section-card__actions-row">
                <Link className="button button--secondary" to="/projects">
                  Open registry
                </Link>
              </div>
              <DataTable
                columns={projectColumns}
                emptyState={
                  <EmptyState
                    description="All active projects currently have staffing."
                    title="No gaps found"
                  />
                }
                items={state.data.projectsWithNoStaff}
              />
            </SectionCard>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
}
