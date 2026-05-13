import { ROLE_PRIORITY, canAccessRoute } from '@/app/route-manifest';
import { getPreferredDashboardRoute } from '@/lib/user-prefs';

// Per Decision-11 (dashboard merge 7→3) — landing dashboards are the merged
// `/dashboard/manager` (PM/RM/DM) and `/dashboard/exec` (Director/HR/Admin)
// surfaces. The per-role `/dashboard/{project-manager,...}` routes remain
// routable for back-compat but are navVisible: false in the sidebar.
//
// F-3.7 / D-119 — a per-user `preferredDashboardRoute` localStorage
// preference takes precedence over the role-based default, but only when
// the current role set can access it (otherwise we'd land them somewhere
// FeatureGuard / RoleGuard would 403). Falls back to role precedence
// per ROLE_PRIORITY (HR > RM for dual-role HR+RM, etc.).
export function getDashboardPath(roles: string[]): string {
  const preferred = getPreferredDashboardRoute();
  if (preferred && canAccessRoute(preferred, roles)) {
    return preferred;
  }
  return getDefaultDashboardPath(roles);
}

export function getDefaultDashboardPath(roles: string[]): string {
  const top = ROLE_PRIORITY.find((r) => roles.includes(r));

  switch (top) {
    case 'admin':
    case 'director':
    case 'hr_manager':
      return '/dashboard/exec';
    case 'resource_manager':
    case 'project_manager':
    case 'delivery_manager':
      return '/dashboard/manager';
    default:
      return '/dashboard/employee';
  }
}

// F-3.7 — list of dashboard routes a user can pick as their landing page.
// Filtered down to routes the caller's roles can actually access (avoids
// presenting a choice that lands them on a Forbidden state).
export const DASHBOARD_PREFERENCE_OPTIONS: ReadonlyArray<{ route: string; label: string }> = [
  { route: '/dashboard/employee', label: 'Employee dashboard' },
  { route: '/dashboard/manager', label: 'Manager dashboard (PM / RM / DM)' },
  { route: '/dashboard/exec', label: 'Exec dashboard (Director / HR / Admin)' },
];

export function availableDashboardPreferences(roles: string[]): ReadonlyArray<{ route: string; label: string }> {
  return DASHBOARD_PREFERENCE_OPTIONS.filter((opt) => canAccessRoute(opt.route, roles));
}
