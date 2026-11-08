import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/app/auth-context';
import { LoadingState } from '@/components/common/LoadingState';
import { isFeatureEnabled } from '@/lib/feature-flags';

// W4-03 — code-split the legacy Workload Overview behind the dsRefresh-OFF
// branch so the heavy charts/data hooks only load when the operator actually
// lands on the pre-flag home. Under dsRefresh ON the bundle is never fetched.
const DashboardPage = lazy(() =>
  import('@/routes/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);

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
    return (
      <Suspense fallback={<LoadingState label="Loading..." />}>
        <DashboardPage />
      </Suspense>
    );
  }
  const { principal } = useAuth();
  const roles = principal?.roles ?? [];
  if (roles.includes('director') || roles.includes('admin')) {
    return <Navigate to="/dashboard/director" replace />;
  }
  return <Navigate to="/me" replace />;
}
