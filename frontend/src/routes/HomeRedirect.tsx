import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { DashboardPage } from '@/routes/dashboard/DashboardPage';
import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * Phase E1 — role-aware `/` Home redirect (DS canvas "Home").
 *
 * When `dsRefresh` is on, the canvas drops "Workload Overview" as a
 * sidebar item — `/` becomes a redirect to the role's primary home:
 *
 *   director / admin → `/dashboard/director`  (Director Home)
 *   everyone else    → `/me`                  (Workspace Home)
 *
 * When `dsRefresh` is off, the legacy `DashboardPage` (Workload Overview)
 * renders unchanged.
 *
 * Reference: `/home/drukker/.claude/plans/v2-lean-restructure-phase-e.md` §4.4
 */
export function HomeRedirect(): JSX.Element {
  if (!isFeatureEnabled('dsRefresh')) {
    return <DashboardPage />;
  }
  const { principal } = useAuth();
  const roles = principal?.roles ?? [];
  if (roles.includes('director') || roles.includes('admin')) {
    return <Navigate to="/dashboard/director" replace />;
  }
  return <Navigate to="/me" replace />;
}
