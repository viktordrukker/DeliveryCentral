import { Navigate } from 'react-router-dom';

import { isFeatureEnabled } from '@/lib/feature-flags';

/**
 * Phase E5 — Flag-gated legacy redirector.
 *
 * When `dsRefresh` is ON, navigates to the v2 target.
 * When `dsRefresh` is OFF, renders the legacy children unchanged.
 *
 * Routes wrapped with this helper (with their v2 targets):
 *   /dashboard/employee          → /me
 *   /dashboard/manager           → /me
 *   /dashboard/exec              → /dashboard/director
 *   /dashboards/portfolio-radiator → /dashboard/director
 *   /integrations                → /admin?section=integrations
 *
 * Reference: `/home/drukker/.claude/plans/v2-lean-restructure-phase-e.md` §E5
 */
export function V2Redirect({
  to,
  children,
}: {
  to: string;
  children: JSX.Element;
}): JSX.Element {
  if (isFeatureEnabled('dsRefresh')) {
    return <Navigate to={to} replace />;
  }
  return children;
}
