import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import type { AppRole } from '@/app/route-manifest';
import { LoadingState } from '@/components/common/LoadingState';

import { DashboardPage as WorkloadOverviewPage } from './DashboardPage';
import { DirectorDashboardPage } from './DirectorDashboardPage';
import { HrDashboardPage } from './HrDashboardPage';

/**
 * Sprint F-0.11 (Decision-11) — merged Exec Dashboard.
 *
 * v1 implementation is a role-router that answers "how is the org doing?"
 * regardless of which exec role the user holds:
 *   - Director / Admin → DirectorDashboardPage (portfolio + delivery health)
 *   - HR Manager → HrDashboardPage (workforce-shape view)
 *   - Anyone else with management privilege → Workload Overview (canonical)
 *
 * Future sprints will compose a single surface from these three with
 * `data-jtbd` attribution per tile (per locked plan §"Dashboard merge").
 * The role-router is the safe stage-1 merge — preserves all existing tests
 * and KPIs while collapsing navigation from 3 sidebar entries to 1.
 *
 * Employee-only users redirect to their personal dashboard.
 */
const DIRECTOR_FIRST: AppRole[] = ['director', 'admin'];

export function ExecDashboardPage(): JSX.Element {
  const { principal, isLoading } = useAuth();

  if (isLoading || !principal) {
    return <LoadingState label="Loading…" variant="skeleton" skeletonType="page" />;
  }

  const roles = principal.roles as AppRole[];

  if (roles.some((r) => DIRECTOR_FIRST.includes(r))) {
    return <DirectorDashboardPage />;
  }
  if (roles.includes('hr_manager')) {
    return <HrDashboardPage />;
  }
  if (roles.some((r) => ['project_manager', 'resource_manager', 'delivery_manager'].includes(r))) {
    // Mid-management users without exec role land on Workload Overview as
    // the universal "what's the workforce doing" surface.
    return <WorkloadOverviewPage />;
  }
  return <Navigate replace to="/dashboard/employee" />;
}
