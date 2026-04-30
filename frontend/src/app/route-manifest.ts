export type AppRole =
  | 'employee'
  | 'hr_manager'
  | 'project_manager'
  | 'resource_manager'
  | 'delivery_manager'
  | 'director'
  | 'admin';

type RouteGroup = 'dashboard' | 'people-org' | 'work' | 'governance' | 'evidence' | 'admin';

export interface AppRouteDefinition {
  description?: string;
  group: RouteGroup;
  path: string;
  title: string;
  allowedRoles?: AppRole[];
}

export interface RouteManifestEntry {
  allowedRoles?: AppRole[];
  description?: string;
  group?: RouteGroup;
  navVisible?: boolean;
  path: string;
  title?: string;
}

export const ALL_ROLES: AppRole[] = [
  'employee',
  'hr_manager',
  'project_manager',
  'resource_manager',
  'delivery_manager',
  'director',
  'admin',
];

export const MANAGEMENT_ROLES: AppRole[] = [
  'hr_manager',
  'project_manager',
  'resource_manager',
  'delivery_manager',
  'director',
  'admin',
];

export const EMPLOYEE_DASHBOARD_ROLES: AppRole[] = ['employee', 'hr_manager', 'director', 'admin'];
export const PM_DASHBOARD_ROLES: AppRole[] = ['project_manager', 'director', 'admin'];
export const RM_DASHBOARD_ROLES: AppRole[] = ['resource_manager', 'director', 'admin'];
export const HR_DASHBOARD_ROLES: AppRole[] = ['hr_manager', 'director', 'admin'];
export const DELIVERY_DASHBOARD_ROLES: AppRole[] = ['delivery_manager', 'director', 'admin'];
export const DIRECTOR_ADMIN_ROLES: AppRole[] = ['director', 'admin'];
export const EVIDENCE_MANAGEMENT_ROLES: AppRole[] = ['director', 'admin'];
export const HR_ADMIN_ROLES: AppRole[] = ['hr_manager', 'admin'];
export const HR_DIRECTOR_ADMIN_ROLES: AppRole[] = ['hr_manager', 'director', 'admin'];
export const WORKLOAD_ROLES: AppRole[] = ['resource_manager', 'director', 'admin'];
export const RESOURCE_POOL_ROLES: AppRole[] = ['resource_manager', 'director', 'admin'];
export const EXCEPTIONS_ROLES: AppRole[] = [
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
];
export const ASSIGNMENT_CREATE_ROLES: AppRole[] = [
  'project_manager',
  'resource_manager',
  'delivery_manager',
  'director',
  'admin',
];
export const PROJECT_CREATE_ROLES: AppRole[] = ['project_manager', 'delivery_manager', 'director', 'admin'];
export const CASE_CREATE_ROLES: AppRole[] = ['hr_manager', 'director', 'admin'];
export const TIMESHEET_MANAGER_ROLES: AppRole[] = [
  'project_manager',
  'resource_manager',
  'hr_manager',
  'delivery_manager',
  'director',
  'admin',
];
export const CAPITALISATION_ROLES: AppRole[] = ['delivery_manager', 'director', 'admin'];
export const EXPORT_CENTRE_ROLES: AppRole[] = ['hr_manager', 'delivery_manager', 'director', 'admin'];
export const STAFFING_BOARD_ROLES: AppRole[] = ['resource_manager', 'delivery_manager', 'director', 'admin'];
export const STAFFING_REQUEST_ROLES: AppRole[] = ['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'];
export const STAFFING_DESK_ROLES: AppRole[] = ['resource_manager', 'project_manager', 'delivery_manager', 'director', 'admin'];
export const ADMIN_ROLES: AppRole[] = ['admin'];

export const PEOPLE_MANAGE_ROLES: AppRole[] = ['hr_manager', 'resource_manager', 'director', 'admin'];
export const RM_MANAGE_ROLES: AppRole[] = ['resource_manager', 'admin'];
export const THREESIXTY_REVIEW_ROLES: AppRole[] = ['hr_manager', 'delivery_manager', 'resource_manager', 'director', 'admin'];
export const SKILL_EDIT_ROLES: AppRole[] = ['hr_manager', 'resource_manager', 'delivery_manager', 'director', 'admin', 'employee'];
export const PROJECT_DASHBOARD_ROLES: AppRole[] = ['project_manager', 'resource_manager', 'director', 'admin'];

export const ROLE_PRIORITY: AppRole[] = [
  'admin',
  'director',
  'hr_manager',
  'resource_manager',
  'project_manager',
  'delivery_manager',
  'employee',
];

export const routeManifest: RouteManifestEntry[] = [
  { path: '/login' },
  { path: '/forgot-password' },
  { path: '/reset-password' },
  { allowedRoles: ALL_ROLES, path: '/auth/2fa-setup' },
  { allowedRoles: ALL_ROLES, description: 'Primary dashboard entry point.', group: 'dashboard', navVisible: true, path: '/', title: 'Workload Overview' },
  { allowedRoles: MANAGEMENT_ROLES, description: 'Operational comparison of planned staffing and approved time.', group: 'dashboard', navVisible: true, path: '/dashboard/planned-vs-actual', title: 'Planned vs Actual Time' },
  { allowedRoles: EMPLOYEE_DASHBOARD_ROLES, description: 'Self-oriented dashboard for assignments, workload, and time compliance.', group: 'dashboard', navVisible: true, path: '/dashboard/employee', title: 'Employee Dashboard' },
  { allowedRoles: PM_DASHBOARD_ROLES, description: 'Project-oriented dashboard for managed projects, staffing gaps, and anomalies.', group: 'dashboard', navVisible: true, path: '/dashboard/project-manager', title: 'PM Dashboard' },
  { allowedRoles: RM_DASHBOARD_ROLES, description: 'Capacity-oriented dashboard for managed teams, idle resources, and pipeline.', group: 'dashboard', navVisible: true, path: '/dashboard/resource-manager', title: 'RM Dashboard' },
  { allowedRoles: HR_DASHBOARD_ROLES, description: 'Organization-centric dashboard for headcount, distribution, and people-data quality.', group: 'dashboard', navVisible: true, path: '/dashboard/hr', title: 'HR Dashboard' },
  { allowedRoles: DELIVERY_DASHBOARD_ROLES, description: 'Team delivery dashboard for anomaly drilldown and delivery metrics.', group: 'dashboard', navVisible: true, path: '/dashboard/delivery-manager', title: 'Delivery Dashboard' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, path: '/dashboard/director' },
  { allowedRoles: DELIVERY_DASHBOARD_ROLES, description: 'Portfolio-wide radiator scores across all projects.', group: 'dashboard', navVisible: true, path: '/dashboards/portfolio-radiator', title: 'Portfolio Radiator' },
  { allowedRoles: ADMIN_ROLES, description: 'Configure scoring thresholds for the 16-axis project radiator.', group: 'admin', navVisible: true, path: '/admin/radiator-thresholds', title: 'Radiator Thresholds' },
  { allowedRoles: ADMIN_ROLES, description: 'Organization-wide reporting cadence, exception thresholds, governance and risk cadence.', group: 'admin', navVisible: true, path: '/admin/organization-config', title: 'Organization Config' },
  { allowedRoles: ALL_ROLES, description: 'Organization structure and reporting visibility.', group: 'people-org', navVisible: true, path: '/org', title: 'Org' },
  { allowedRoles: ALL_ROLES, path: '/org/managers/:id/scope' },
  { allowedRoles: HR_ADMIN_ROLES, path: '/admin/people/new' },
  { allowedRoles: ALL_ROLES, description: 'People directory and manager visibility.', group: 'people-org', navVisible: true, path: '/people', title: 'People' },
  { allowedRoles: HR_ADMIN_ROLES, path: '/people/new' },
  { allowedRoles: EXCEPTIONS_ROLES, description: 'Unified operational queue for staffing, project, and time-compliance anomalies.', group: 'governance', navVisible: true, path: '/exceptions', title: 'Exceptions' },
  { allowedRoles: ALL_ROLES, description: 'Operational team management distinct from the organization hierarchy.', group: 'people-org', navVisible: true, path: '/teams', title: 'Teams' },
  { allowedRoles: ALL_ROLES, path: '/teams/:id/dashboard' },
  { allowedRoles: ALL_ROLES, path: '/people/:id' },
  { allowedRoles: ALL_ROLES, description: 'Internal project registry and external links.', group: 'work', navVisible: true, path: '/projects', title: 'Projects' },
  { allowedRoles: PROJECT_CREATE_ROLES, path: '/projects/new' },
  { allowedRoles: ALL_ROLES, path: '/projects/:id' },
  { allowedRoles: ALL_ROLES, path: '/projects/:id/dashboard' },
  { allowedRoles: ALL_ROLES, description: 'Authoritative staffing assignments.', group: 'work', navVisible: true, path: '/assignments', title: 'Assignments' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, path: '/assignments/new' },
  { allowedRoles: ASSIGNMENT_CREATE_ROLES, path: '/assignments/bulk' },
  { allowedRoles: MANAGEMENT_ROLES, description: 'Pending approval queue for proposal slates and director sign-off.', group: 'work', navVisible: true, path: '/assignments/queue', title: 'Approval Queue' },
  { allowedRoles: ALL_ROLES, path: '/assignments/:id' },
  { allowedRoles: ALL_ROLES, path: '/settings/account' },
  { allowedRoles: ALL_ROLES, path: '/notifications' },
  { allowedRoles: RESOURCE_POOL_ROLES, description: 'Named pools of people available for staffing allocation.', group: 'work', navVisible: true, path: '/resource-pools', title: 'Resource Pools' },
  { allowedRoles: RESOURCE_POOL_ROLES, path: '/resource-pools/:id' },
  { allowedRoles: EVIDENCE_MANAGEMENT_ROLES, description: 'Observed-work records, source review, and specialist diagnostics.', group: 'evidence', navVisible: true, path: '/work-evidence', title: 'Evidence Management' },
  { allowedRoles: WORKLOAD_ROLES, description: 'Person × project allocation matrix for active assignments.', group: 'people-org', navVisible: false, path: '/workload', title: 'Workload Matrix' },
  { allowedRoles: WORKLOAD_ROLES, description: '12-week forward timeline of team assignment planning.', group: 'people-org', navVisible: false, path: '/workload/planning', title: 'Workload Planning' },
  { allowedRoles: ALL_ROLES, description: 'Monthly timesheet, leave requests, time gaps, and summary.', group: 'work', navVisible: true, path: '/my-time', title: 'My Time' },
  { allowedRoles: TIMESHEET_MANAGER_ROLES, description: 'Approve timesheets and leave, review compliance, manage overtime.', group: 'work', navVisible: true, path: '/time-management', title: 'Time Management' },
  { allowedRoles: ALL_ROLES, description: 'Weekly timesheet for logging project hours.', group: 'work', navVisible: false, path: '/timesheets', title: 'My Timesheet' },
  { allowedRoles: TIMESHEET_MANAGER_ROLES, description: 'Review and approve submitted timesheets.', group: 'work', navVisible: false, path: '/timesheets/approval', title: 'Timesheet Approval' },
  { allowedRoles: ALL_ROLES, description: 'Submit and track leave requests. Managers can approve or reject pending requests.', group: 'work', navVisible: false, path: '/leave', title: 'Time Off' },
  { allowedRoles: TIMESHEET_MANAGER_ROLES, description: 'Time analytics: hours breakdown by project, person, department with overtime, bench, and utilization.', group: 'work', navVisible: true, path: '/reports/time', title: 'Time Analytics' },
  { allowedRoles: CAPITALISATION_ROLES, description: 'CAPEX/OPEX capitalisation breakdown for approved timesheets.', group: 'work', navVisible: true, path: '/reports/capitalisation', title: 'Capitalisation' },
  { allowedRoles: EXPORT_CENTRE_ROLES, description: 'Generate and download XLSX reports for headcount, assignments, timesheets, capitalisation, and workload.', group: 'work', navVisible: true, path: '/reports/export', title: 'Export Centre' },
  { allowedRoles: EXCEPTIONS_ROLES, description: 'Available vs assigned vs actual hours per person — utilization drill-down.', group: 'work', navVisible: true, path: '/reports/utilization', title: 'Utilization' },
  { allowedRoles: EXCEPTIONS_ROLES, description: 'Build custom reports from any data source, save templates, and export to XLSX.', group: 'work', navVisible: true, path: '/reports/builder', title: 'Report Builder' },
  { allowedRoles: ALL_ROLES, description: 'Onboarding and operational case workflows.', group: 'work', navVisible: true, path: '/cases', title: 'Cases' },
  { allowedRoles: ALL_ROLES, description: 'Post and track staffing requests; resource managers propose candidates.', group: 'work', navVisible: false, path: '/staffing-requests', title: 'Staffing Requests' },
  { allowedRoles: STAFFING_BOARD_ROLES, description: 'Conflict-aware drag-and-drop staffing board — move assignments between people.', group: 'work', navVisible: false, path: '/staffing-board', title: 'Staffing Board' },
  { allowedRoles: STAFFING_DESK_ROLES, description: 'Unified staffing operations console — assignments, requests, supply-demand gap, timeline, and export.', group: 'work', navVisible: true, path: '/staffing-desk', title: 'Staffing Desk' },
  { allowedRoles: STAFFING_REQUEST_ROLES, path: '/staffing-requests/new' },
  { allowedRoles: ALL_ROLES, path: '/staffing-requests/:id' },
  { allowedRoles: CASE_CREATE_ROLES, path: '/cases/new' },
  { allowedRoles: ALL_ROLES, path: '/cases/:id' },
  { allowedRoles: ADMIN_ROLES, description: 'Consolidated operator-facing control surface for configuration and platform settings.', group: 'admin', navVisible: true, path: '/admin', title: 'Admin' },
  { allowedRoles: HR_DIRECTOR_ADMIN_ROLES, description: 'Metadata-backed dictionary management for people-related configuration.', group: 'admin', navVisible: true, path: '/admin/dictionaries', title: 'Admin Dictionaries' },
  { allowedRoles: HR_DIRECTOR_ADMIN_ROLES, description: 'Business-action audit trail for investigation and governance workflows.', group: 'admin', navVisible: true, path: '/admin/audit', title: 'Business Audit' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, description: 'Notification channel and template management.', group: 'admin', navVisible: true, path: '/admin/notifications', title: 'Admin Notifications' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, description: 'External provider health and synchronization.', group: 'admin', navVisible: true, path: '/admin/integrations', title: 'Admin Integrations' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, description: 'Read-only health, readiness, and diagnostics visibility.', group: 'admin', navVisible: true, path: '/admin/monitoring', title: 'Admin Monitoring' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, description: 'External provider health and synchronization.', group: 'governance', navVisible: true, path: '/integrations', title: 'Integrations' },
  { allowedRoles: ADMIN_ROLES, description: 'Metadata, validation, and administrative configuration.', group: 'admin', navVisible: true, path: '/metadata-admin', title: 'Metadata / Admin' },
  { allowedRoles: ADMIN_ROLES, description: 'Configure platform-wide behaviour: timesheets, capitalisation, pulse, notifications, and security.', group: 'admin', navVisible: true, path: '/admin/settings', title: 'Platform Settings' },
  { allowedRoles: HR_DIRECTOR_ADMIN_ROLES, description: 'Bulk import people from a CSV file — up to 200+ records at once.', group: 'admin', navVisible: true, path: '/admin/people/import', title: 'Bulk Import' },
  { allowedRoles: ADMIN_ROLES, description: 'Manage external vendors and subcontractors for project staffing.', group: 'admin', navVisible: true, path: '/admin/vendors', title: 'Vendors' },
  { allowedRoles: ADMIN_ROLES, description: 'Manage outbound webhook subscriptions with HMAC-SHA256 signed delivery.', group: 'admin', navVisible: true, path: '/admin/webhooks', title: 'Webhooks' },
  { allowedRoles: ADMIN_ROLES, description: 'Configure BambooHR or Workday HRIS integration for automated employee sync.', group: 'admin', navVisible: true, path: '/admin/hris', title: 'HRIS Integration' },
  { allowedRoles: ADMIN_ROLES, description: 'View and manage ABAC (Attribute-Based Access Control) policies per role and resource.', group: 'admin', navVisible: true, path: '/admin/access-policies', title: 'Access Policies' },
];

const routeManifestByPath = new Map(routeManifest.map((route) => [route.path, route]));

export const appRoutes: AppRouteDefinition[] = routeManifest
  .filter((route): route is RouteManifestEntry & Required<Pick<RouteManifestEntry, 'group' | 'title'>> => Boolean(route.navVisible && route.group && route.title))
  .map((route) => ({
    allowedRoles: route.allowedRoles,
    description: route.description,
    group: route.group,
    path: route.path,
    title: route.title,
  }));

export function getAllowedRoles(path: string): AppRole[] | undefined {
  return routeManifestByPath.get(path)?.allowedRoles;
}

export function canAccessRoute(path: string, roles: string[] | undefined): boolean {
  const allowedRoles = getAllowedRoles(path);
  if (!allowedRoles) {
    return true;
  }

  return allowedRoles.some((role) => roles?.includes(role));
}

export function getVisibleNavigationRoutes(roles: string[] | undefined): AppRouteDefinition[] {
  return appRoutes.filter((route) => canAccessRoute(route.path, roles));
}

export function hasAnyRole(userRoles: string[] | undefined, allowed: AppRole[]): boolean {
  return allowed.some((role) => userRoles?.includes(role));
}
