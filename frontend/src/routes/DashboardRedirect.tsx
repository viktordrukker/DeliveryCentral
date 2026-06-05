import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';

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
 */
export function DashboardRedirect(): JSX.Element {
  const { principal } = useAuth();
  const roles = principal?.roles ?? [];
  const target = pickDashboardTarget(roles);
  return <Navigate to={target} replace />;
}

function pickDashboardTarget(roles: string[]): string {
  if (roles.includes('admin') || roles.includes('director')) {
    return '/dashboard/director';
  }
  if (roles.includes('delivery_manager')) {
    return '/dashboard/delivery-manager';
  }
  if (roles.includes('project_manager')) {
    return '/dashboard/project-manager';
  }
  if (roles.includes('resource_manager')) {
    return '/dashboard/resource-manager';
  }
  if (roles.includes('hr_manager')) {
    return '/dashboard/hr';
  }
  return '/me?tab=overview';
}
