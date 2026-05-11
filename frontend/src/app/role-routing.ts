import { ROLE_PRIORITY } from '@/app/route-manifest';

// Per Decision-11 (dashboard merge 7→3) — landing dashboards are the merged
// `/dashboard/manager` (PM/RM/DM) and `/dashboard/exec` (Director/HR/Admin)
// surfaces. The per-role `/dashboard/{project-manager,...}` routes remain
// routable for back-compat but are navVisible: false in the sidebar.
export function getDashboardPath(roles: string[]): string {
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
