import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { isRouteEnabled } from '@/app/route-manifest';

/**
 * `/dashboard` per-role redirect — fixes the hard 404 on the bare URL.
 *
 * The role-specific dashboards live at `/dashboard/director`,
 * `/dashboard/project-manager`, etc. The bare `/dashboard` had no route
 * handler and rendered the 404 page for every persona. This component
 * picks the persona's primary dashboard surface and `<Navigate>`s there.
 *
 * Priority is highest-privilege-first so dual-role accounts land on the
 * most-capable surface (director/admin → Director Dashboard).
 *
 *   admin / director        → /dashboard/director
 *   delivery_manager        → /dashboard/delivery-manager
 *   project_manager         → /dashboard/project-manager
 *   resource_manager        → /dashboard/resource-manager
 *   hr_manager              → /dashboard/hr
 *   employee (fallback)     → /me?tab=overview
 *
 * F-REDIRECT-DASH — these per-role dashboards are each feature-flag gated
 * (default off; off on v2 where dashboards are obsolete). Only redirect to one
 * when its flag is actually on; otherwise fall back to the always-on workspace
 * home so the user never lands on the "Module disabled" dead-end.
 */
export function DashboardRedirect(): JSX.Element {
  const { principal } = useAuth();
  const roles = principal?.roles ?? [];
  const target = pickDashboardTarget(roles);
  return <Navigate to={target} replace />;
}

const WORKSPACE_HOME = '/me?tab=overview';

function pickDashboardTarget(roles: string[]): string {
  const candidate = preferredDashboard(roles);
  if (candidate && isRouteEnabled(candidate, roles)) {
    return candidate;
  }
  return WORKSPACE_HOME;
}

function preferredDashboard(roles: string[]): string | null {
  if (roles.includes('admin') || roles.includes('director')) return '/dashboard/director';
  if (roles.includes('delivery_manager')) return '/dashboard/delivery-manager';
  if (roles.includes('project_manager')) return '/dashboard/project-manager';
  if (roles.includes('resource_manager')) return '/dashboard/resource-manager';
  if (roles.includes('hr_manager')) return '/dashboard/hr';
  return null;
}
