import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import type { AppRole } from '@/app/route-manifest';
import { LoadingState } from '@/components/common/LoadingState';

import { DeliveryManagerDashboardPage } from './DeliveryManagerDashboardPage';
import { ProjectManagerDashboardPage } from './ProjectManagerDashboardPage';
import { ResourceManagerDashboardPage } from './ResourceManagerDashboardPage';

/**
 * Sprint F-0.11 (Decision-11) — merged Manager Dashboard.
 *
 * v1 implementation is a role-router: PM users see the PM content, RM users
 * see the RM content, DM users see the DM content. Single URL `/dashboard/manager`
 * answers the question "what does my team need from me?" regardless of role.
 *
 * Future sprints will collapse the duplicate KPIs across these three views
 * into a single composed surface with `data-jtbd` attribution per tile (per
 * the locked plan §"Dashboard merge — 7 role dashboards → 3"). The role-router
 * is the safe stage-1 merge — preserves all existing tests and KPIs while
 * collapsing the navigation surface from 3 sidebar entries to 1.
 *
 * Precedence when a user has multiple management roles (e.g. dual_role,
 * director+admin): PM > RM > DM > fallback to PM. Director-only / HR-only
 * users are routed to /dashboard/exec instead.
 */
const PM_ROLES: AppRole[] = ['project_manager'];
const RM_ROLES: AppRole[] = ['resource_manager'];
const DM_ROLES: AppRole[] = ['delivery_manager'];

export function ManagerDashboardPage(): JSX.Element {
  const { principal, isLoading } = useAuth();

  if (isLoading || !principal) {
    return <LoadingState label="Loading…" variant="skeleton" skeletonType="page" />;
  }

  const roles = principal.roles as AppRole[];

  if (roles.some((r) => PM_ROLES.includes(r))) {
    return <ProjectManagerDashboardPage />;
  }
  if (roles.some((r) => RM_ROLES.includes(r))) {
    return <ResourceManagerDashboardPage />;
  }
  if (roles.some((r) => DM_ROLES.includes(r))) {
    return <DeliveryManagerDashboardPage />;
  }

  // Director / HR / Admin land on the exec dashboard, not manager.
  // Employee-only users land on their personal dashboard.
  if (roles.includes('director') || roles.includes('admin') || roles.includes('hr_manager')) {
    return <Navigate replace to="/dashboard/exec" />;
  }
  return <Navigate replace to="/dashboard/employee" />;
}
