import { type FeatureFlagId, isFeatureEnabled } from '@/lib/feature-flags';

export type AppRole =
  | 'employee'
  | 'hr_manager'
  | 'project_manager'
  | 'resource_manager'
  | 'delivery_manager'
  | 'director'
  | 'admin';

// F-13.5 / D-140 — RouteGroup keys after Sprint F-13 restructure (T-21).
// - `work` split into `projects` / `staffing` / `time` / `reports` (D-136)
// - `governance` retired: `/exceptions` folded into `reports` (D-137)
// - `evidence` retired: `/work-evidence` folded into `reports` (D-138)
// - `admin` split into `admin-config` / `admin-integrations` / `admin-governance` (D-139)
type RouteGroup =
  | 'dashboard'
  | 'people-org'
  | 'projects'
  | 'staffing'
  | 'time'
  | 'reports'
  | 'admin-config'
  | 'admin-integrations'
  | 'admin-governance';

/**
 * Phase A2 — DS-redesign 3-group sidebar taxonomy.
 *
 * The redesigned SidebarNavV2 (gated by `dsRefresh`) collapses the legacy
 * 9-group taxonomy above into 3 sections matching DS/chrome.jsx:32-66:
 *   - `workspace` — what I'm working on (dashboard, time, projects, staffing, reports)
 *   - `workforce` — who works here (people, org, teams)
 *   - `operations` — system admin (admin-*)
 *
 * Both fields coexist during the migration so the legacy SidebarNav keeps
 * working when `dsRefresh` is off.
 */
export type RouteGroupV2 = 'workspace' | 'workforce' | 'operations';

const GROUP_V2_MAP: Record<RouteGroup, RouteGroupV2> = {
  dashboard: 'workspace',
  time: 'workspace',
  projects: 'workspace',
  staffing: 'workspace',
  reports: 'workspace',
  'people-org': 'workforce',
  'admin-config': 'operations',
  'admin-integrations': 'operations',
  'admin-governance': 'operations',
};

/** Resolve the V2 (3-group) bucket for a legacy group. */
export function groupV2For(group: RouteGroup): RouteGroupV2 {
  return GROUP_V2_MAP[group];
}

export interface AppRouteDefinition {
  description?: string;
  group: RouteGroup;
  /** Phase A2 — optional override; otherwise derived from `group` via `groupV2For`. */
  groupV2?: RouteGroupV2;
  path: string;
  title: string;
  /**
   * Phase E — sidebar label override when `dsRefresh` is on. Routes keep
   * their canonical `title` for breadcrumbs / page-header rendering, but
   * the v2 sidebar can rename them to the canvas labels (e.g. /cases →
   * "HR Queue", /me → "Home").
   */
  titleV2?: string;
  /**
   * Phase E — hide this route from the v2 sidebar (SidebarNavV2) when
   * `dsRefresh` is on. Route stays reachable by URL; only nav visibility
   * is suppressed. Default false.
   */
  obsoleteInV2?: boolean;
  allowedRoles?: AppRole[];
  /** Sprint F-0.1 — feature flag gating route visibility + nav. */
  flag?: FeatureFlagId;
}

export interface RouteManifestEntry {
  allowedRoles?: AppRole[];
  description?: string;
  group?: RouteGroup;
  /** Phase A2 — optional override; otherwise derived from `group` via `groupV2For`. */
  groupV2?: RouteGroupV2;
  /** Phase E — v2 sidebar label override (see AppRouteDefinition.titleV2). */
  titleV2?: string;
  /** Phase E — hide from v2 sidebar (see AppRouteDefinition.obsoleteInV2). */
  obsoleteInV2?: boolean;
  navVisible?: boolean;
  path: string;
  title?: string;
  /** Sprint F-0.1 — feature flag gating route visibility + nav. */
  flag?: FeatureFlagId;
}

/**
 * Sprint F-0.1 — predicate composing role + flag visibility for sidebar.
 *
 * A route is nav-visible iff:
 *   1. `navVisible !== false`
 *   2. role allowed (or `allowedRoles` undefined)
 *   3. flag enabled (or `flag` undefined)
 */
export function isRouteNavVisible(
  entry: { allowedRoles?: AppRole[]; flag?: FeatureFlagId; navVisible?: boolean },
  role: AppRole | undefined,
): boolean {
  if (entry.navVisible === false) return false;
  if (entry.allowedRoles && (!role || !entry.allowedRoles.includes(role))) return false;
  if (entry.flag && !isFeatureEnabled(entry.flag)) return false;
  return true;
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
export const ADMIN_ONLY_ROLES: AppRole[] = ['admin'];
export const EVIDENCE_MANAGEMENT_ROLES: AppRole[] = [
  'employee',
  'project_manager',
  'resource_manager',
  'delivery_manager',
  'hr_manager',
  'director',
  'admin',
];
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
  { allowedRoles: ALL_ROLES, description: 'Primary dashboard entry point.', group: 'dashboard', navVisible: true, obsoleteInV2: true, path: '/', title: 'Workload Overview' },
  { allowedRoles: MANAGEMENT_ROLES, description: 'Operational comparison of planned staffing and approved time.', group: 'dashboard', navVisible: true, obsoleteInV2: true, path: '/dashboard/planned-vs-actual', title: 'Planned vs Actual Time' },
  { allowedRoles: EMPLOYEE_DASHBOARD_ROLES, description: 'Self-oriented dashboard for assignments, workload, and time compliance.', group: 'dashboard', navVisible: true, obsoleteInV2: true, path: '/dashboard/employee', title: 'Employee Dashboard' },
  // Sprint F-0.11 (Decision-11) — merged Manager + Exec dashboards.
  // Single sidebar entry per role-class; underlying per-role surfaces stay
  // accessible via direct URL but are hidden from the sidebar (flag-gated).
  {
    allowedRoles: ['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'],
    description: 'Manager Dashboard — answers "what does my team need?" Role-routed (PM/RM/DM content).',
    flag: 'dashMergedManager',
    group: 'dashboard',
    navVisible: true,
    obsoleteInV2: true,
    path: '/dashboard/manager',
    title: 'Manager Dashboard',
  },
  {
    allowedRoles: ['director', 'admin', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager'],
    description: 'Exec Dashboard — answers "how is the org doing?" Role-routed (Director/HR/Workload content).',
    flag: 'dashMergedExec',
    group: 'dashboard',
    navVisible: true,
    obsoleteInV2: true,
    path: '/dashboard/exec',
    title: 'Exec Dashboard',
  },
  // Per-role dashboards stay routable but hidden from sidebar in v1
  // (flag-gated). The merged routes above are the canonical entries.
  { allowedRoles: PM_DASHBOARD_ROLES, description: 'Project-oriented dashboard for managed projects, staffing gaps, and anomalies.', flag: 'dashProjectManager', group: 'dashboard', navVisible: false, path: '/dashboard/project-manager', title: 'PM Dashboard' },
  { allowedRoles: RM_DASHBOARD_ROLES, description: 'Capacity-oriented dashboard for managed teams, idle resources, and pipeline.', flag: 'dashResourceManager', group: 'dashboard', navVisible: false, path: '/dashboard/resource-manager', title: 'RM Dashboard' },
  { allowedRoles: HR_DASHBOARD_ROLES, description: 'Organization-centric dashboard for headcount, distribution, and people-data quality.', flag: 'dashHr', group: 'dashboard', navVisible: false, path: '/dashboard/hr', title: 'HR Dashboard' },
  { allowedRoles: DELIVERY_DASHBOARD_ROLES, description: 'Team delivery dashboard for anomaly drilldown and delivery metrics.', flag: 'dashDeliveryManager', group: 'dashboard', navVisible: false, path: '/dashboard/delivery-manager', title: 'Delivery Dashboard' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, description: 'Executive dashboard for delivery health, capacity, and portfolio risk.', flag: 'dashDirector', group: 'dashboard', navVisible: false, path: '/dashboard/director', title: 'Director Dashboard' },
  { allowedRoles: DELIVERY_DASHBOARD_ROLES, description: 'Portfolio-wide radiator scores across all projects.', group: 'dashboard', navVisible: true, obsoleteInV2: true, path: '/dashboards/portfolio-radiator', title: 'Portfolio Radiator' },
  { allowedRoles: ADMIN_ROLES, description: 'Configure scoring thresholds for the 16-axis project radiator.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/radiator-thresholds', title: 'Radiator Thresholds' },
  { allowedRoles: ADMIN_ROLES, description: 'Organization-wide reporting cadence, exception thresholds, governance and risk cadence.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/organization-config', title: 'Organization Config' },
  { allowedRoles: ALL_ROLES, description: 'Organization structure and reporting visibility.', group: 'people-org', navVisible: true, obsoleteInV2: true, path: '/org', title: 'Org' },
  { allowedRoles: ALL_ROLES, path: '/org/managers/:id/scope' },
  { allowedRoles: HR_ADMIN_ROLES, path: '/admin/people/new' },
  { allowedRoles: ALL_ROLES, description: 'People directory and manager visibility.', group: 'people-org', navVisible: true, path: '/people', title: 'People' },
  { allowedRoles: RESOURCE_POOL_ROLES, description: 'People with no active project assignment — sorted by days off project.', group: 'people-org', navVisible: true, path: '/people/bench', title: 'Bench', titleV2: 'Bench' },
  { allowedRoles: HR_ADMIN_ROLES, path: '/people/new' },
  { allowedRoles: EXCEPTIONS_ROLES, description: 'Unified operational queue for staffing, project, and time-compliance anomalies.', group: 'reports', navVisible: true, obsoleteInV2: true, path: '/exceptions', title: 'Exceptions' },
  { allowedRoles: STAFFING_DESK_ROLES, description: 'Unified approvals across position proposals, budgets, activations, leave, cases, and skill reviews.', flag: 'dsRefresh', group: 'staffing', navVisible: true, path: '/approvals', title: 'Approvals' },
  { allowedRoles: ALL_ROLES, description: 'Operational team management distinct from the organization hierarchy.', group: 'people-org', navVisible: true, path: '/teams', title: 'Teams' },
  { allowedRoles: ALL_ROLES, path: '/teams/:id/dashboard' },
  { allowedRoles: ALL_ROLES, path: '/people/:id' },
  { allowedRoles: ALL_ROLES, description: 'Internal project registry and external links.', group: 'projects', navVisible: true, path: '/projects', title: 'Projects' },
  { allowedRoles: PROJECT_CREATE_ROLES, path: '/projects/new' },
  { allowedRoles: ALL_ROLES, path: '/projects/:id' },
  { allowedRoles: ALL_ROLES, path: '/projects/:id/dashboard' },
  { allowedRoles: STAFFING_DESK_ROLES, description: 'Authoritative staffing assignments.', group: 'staffing', navVisible: true, obsoleteInV2: true, path: '/assignments', title: 'Assignments' },
  // Sprint F-0.10 (Decision-10) — `/assignments/new` direct path is gated
  // OFF in v1. The canonical flow is `Create Staffing Request → Slate → Pick`.
  // The route still exists in code (so the page component continues to be
  // testable + reachable when the flag flips), but it's hidden from the
  // sidebar AND gated by the `staffingMakeAssignment` flag (default OFF).
  { allowedRoles: DIRECTOR_ADMIN_ROLES, flag: 'staffingMakeAssignment', navVisible: false, path: '/assignments/new' },
  // `/assignments/bulk` stays accessible to RM/Admin via direct URL (utility),
  // not in the sidebar.
  { allowedRoles: ASSIGNMENT_CREATE_ROLES, flag: 'staffingBulkAssignment', navVisible: false, path: '/assignments/bulk' },
  { allowedRoles: MANAGEMENT_ROLES, description: 'Pending approval queue for proposal slates and director sign-off.', group: 'staffing', navVisible: true, obsoleteInV2: true, path: '/assignments/queue', title: 'Approval Queue' },
  { allowedRoles: ALL_ROLES, path: '/assignments/:id' },
  { allowedRoles: ALL_ROLES, path: '/settings/account' },
  { allowedRoles: ALL_ROLES, path: '/notifications' },
  { allowedRoles: ALL_ROLES, description: 'Unified self-service workspace — Overview, Time, Leave, Projects, Inbox, Settings.', flag: 'workspaceMe', group: 'time', navVisible: true, titleV2: 'Home', path: '/me', title: 'My Workspace' },
  { allowedRoles: RESOURCE_POOL_ROLES, description: 'Named pools of people available for staffing allocation.', group: 'staffing', navVisible: true, obsoleteInV2: true, path: '/resource-pools', title: 'Resource Pools' },
  { allowedRoles: RESOURCE_POOL_ROLES, path: '/resource-pools/:id' },
  { allowedRoles: EVIDENCE_MANAGEMENT_ROLES, description: 'Observed-work records, source review, and specialist diagnostics.', group: 'reports', navVisible: true, obsoleteInV2: true, path: '/work-evidence', title: 'Evidence Management' },
  { allowedRoles: WORKLOAD_ROLES, description: 'Person × project allocation matrix for active assignments.', group: 'people-org', navVisible: false, path: '/workload', title: 'Workload Matrix' },
  { allowedRoles: WORKLOAD_ROLES, description: '12-week forward timeline of team assignment planning.', group: 'people-org', navVisible: false, path: '/workload/planning', title: 'Workload Planning' },
  { allowedRoles: ALL_ROLES, description: 'Monthly timesheet, leave requests, time gaps, and summary.', group: 'time', navVisible: true, obsoleteInV2: true, path: '/my-time', title: 'My Time' },
  { allowedRoles: TIMESHEET_MANAGER_ROLES, description: 'Approve timesheets and leave, review compliance, manage overtime.', group: 'time', navVisible: true, obsoleteInV2: true, path: '/time-management', title: 'Time Management' },
  { allowedRoles: ALL_ROLES, description: 'Weekly timesheet for logging project hours.', group: 'time', navVisible: false, path: '/timesheets', title: 'My Timesheet' },
  { allowedRoles: TIMESHEET_MANAGER_ROLES, description: 'Review and approve submitted timesheets.', group: 'time', navVisible: false, path: '/timesheets/approval', title: 'Timesheet Approval' },
  { allowedRoles: ALL_ROLES, description: 'Submit and track leave requests. Managers can approve or reject pending requests.', group: 'time', navVisible: false, path: '/leave', title: 'Time Off' },
  { allowedRoles: TIMESHEET_MANAGER_ROLES, description: 'Time analytics: hours breakdown by project, person, department with overtime, bench, and utilization.', group: 'reports', navVisible: true, obsoleteInV2: true, path: '/reports/time', title: 'Time Analytics' },
  { allowedRoles: CAPITALISATION_ROLES, description: 'CAPEX/OPEX capitalisation breakdown for approved timesheets.', group: 'reports', navVisible: true, obsoleteInV2: true, path: '/reports/capitalisation', title: 'Capitalisation' },
  { allowedRoles: EXPORT_CENTRE_ROLES, description: 'Generate and download XLSX reports for headcount, assignments, timesheets, capitalisation, and workload.', group: 'reports', navVisible: true, obsoleteInV2: true, path: '/reports/export', title: 'Export Centre' },
  { allowedRoles: EXCEPTIONS_ROLES, description: 'Available vs assigned vs actual hours per person — utilization drill-down.', group: 'reports', navVisible: true, obsoleteInV2: true, path: '/reports/utilization', title: 'Utilization' },
  { allowedRoles: EXCEPTIONS_ROLES, description: 'Build custom reports from any data source, save templates, and export to XLSX.', group: 'reports', navVisible: true, obsoleteInV2: true, path: '/reports/builder', title: 'Report Builder' },
  { allowedRoles: ALL_ROLES, description: 'Onboarding and operational case workflows.', group: 'time', navVisible: true, titleV2: 'HR Queue', path: '/cases', title: 'Cases' },
  { allowedRoles: ALL_ROLES, description: 'Post and track staffing requests; resource managers propose candidates.', group: 'staffing', navVisible: false, path: '/staffing-requests', title: 'Staffing Requests' },
  { allowedRoles: STAFFING_BOARD_ROLES, description: 'Conflict-aware drag-and-drop staffing board — move assignments between people.', group: 'staffing', navVisible: false, path: '/staffing-board', title: 'Staffing Board' },
  { allowedRoles: STAFFING_DESK_ROLES, description: 'Unified staffing operations console — assignments, requests, supply-demand gap, timeline, and export.', group: 'staffing', navVisible: true, obsoleteInV2: true, path: '/staffing-desk', title: 'Staffing Desk' },
  { allowedRoles: STAFFING_REQUEST_ROLES, path: '/staffing-requests/new' },
  { allowedRoles: ALL_ROLES, path: '/staffing-requests/:id' },
  { allowedRoles: CASE_CREATE_ROLES, path: '/cases/new' },
  { allowedRoles: ALL_ROLES, path: '/cases/:id' },
  { allowedRoles: ADMIN_ROLES, description: 'Consolidated operator-facing control surface for configuration and platform settings.', group: 'admin-config', navVisible: true, path: '/admin', title: 'Admin' },
  // F-12.4 / D-101 — legacy HR-scoped dictionary admin consolidated
  // into /metadata-admin. Route stays registered (deep-linked bookmarks
  // redirect via router.tsx) but is hidden from the sidebar.
  { allowedRoles: HR_DIRECTOR_ADMIN_ROLES, description: 'Legacy HR dictionary admin — redirects to /metadata-admin (D-101).', group: 'admin-governance', navVisible: false, path: '/admin/dictionaries', title: 'Admin Dictionaries (legacy)' },
  { allowedRoles: HR_DIRECTOR_ADMIN_ROLES, description: 'Business-action audit trail for investigation and governance workflows.', group: 'admin-governance', navVisible: true, obsoleteInV2: true, path: '/admin/audit', title: 'Business Audit' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, description: 'Notification channel and template management.', group: 'admin-governance', navVisible: true, obsoleteInV2: true, path: '/admin/notifications', title: 'Admin Notifications' },
  { allowedRoles: ADMIN_ONLY_ROLES, description: 'External provider health and synchronization.', group: 'admin-integrations', navVisible: true, obsoleteInV2: true, path: '/admin/integrations', title: 'Admin Integrations' },
  { allowedRoles: ADMIN_ONLY_ROLES, description: 'Uniform registry of every adapter (Jira, M365, RADIUS, JSM, LDAP, LLM) with status and last-sync.', group: 'admin-integrations', navVisible: true, obsoleteInV2: true, path: '/admin/integrations/registry', title: 'Integrations Registry' },
  { allowedRoles: ADMIN_ONLY_ROLES, description: 'Read-only health, readiness, and diagnostics visibility.', group: 'admin-integrations', navVisible: true, obsoleteInV2: true, path: '/admin/monitoring', title: 'Admin Monitoring' },
  { allowedRoles: DIRECTOR_ADMIN_ROLES, description: 'External provider health and synchronization.', group: 'admin-integrations', navVisible: true, obsoleteInV2: true, path: '/integrations', title: 'Integrations' },
  // F-12.4 / D-101 — widened from ADMIN_ROLES to HR_DIRECTOR_ADMIN_ROLES
  // so HR/Director keep their dictionary-admin access after the legacy
  // /admin/dictionaries route consolidated into this one.
  { allowedRoles: HR_DIRECTOR_ADMIN_ROLES, description: 'Metadata, validation, and administrative configuration (unified dictionary admin per D-101).', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/metadata-admin', title: 'Metadata / Admin' },
  { allowedRoles: ADMIN_ROLES, description: 'Configure platform-wide behaviour: timesheets, capitalisation, pulse, notifications, and security.', group: 'admin-config', navVisible: true, titleV2: 'Settings', path: '/admin/settings', title: 'Platform Settings' },
  // F-2.0a (D-93) — admin Period Locks UI on top of the existing backend
  // /admin/period-locks endpoints. Blocks edits to historical periods.
  { allowedRoles: ADMIN_ROLES, description: 'Lock past time periods so timesheets, expenses, and capitalisation rows can’t be edited retroactively.', group: 'admin-governance', navVisible: true, obsoleteInV2: true, path: '/admin/period-locks', title: 'Period Locks' },
  // F-13.7 / D-117 — post-install control surface; pairs with /setup install wizard.
  { allowedRoles: ADMIN_ROLES, description: 'Re-run setup steps, inspect install state, and reach diagnostic surfaces.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/setup', title: 'Setup Operations' },
  // Sprint F-1.1 — Tenant Settings Catalog admin surface. Lists every
  // registered feature flag with its current state and metadata.
  { allowedRoles: ADMIN_ROLES, description: 'Toggle individual features per tenant; view maturity, ownership, and dependency metadata for every registered flag.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/feature-flags', title: 'Feature Flags' },
  { allowedRoles: HR_DIRECTOR_ADMIN_ROLES, description: 'Bulk import people from a CSV file — up to 200+ records at once.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/people/import', title: 'Bulk Import' },
  { allowedRoles: ADMIN_ROLES, description: 'Manage external vendors and subcontractors for project staffing.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/vendors', title: 'Vendors' },
  { allowedRoles: ADMIN_ROLES, description: 'Manage outbound webhook subscriptions with HMAC-SHA256 signed delivery.', group: 'admin-integrations', navVisible: true, obsoleteInV2: true, path: '/admin/webhooks', title: 'Webhooks' },
  { allowedRoles: ADMIN_ROLES, description: 'Configure BambooHR or Workday HRIS integration for automated employee sync.', group: 'admin-integrations', navVisible: true, obsoleteInV2: true, path: '/admin/hris', title: 'HRIS Integration' },
  { allowedRoles: ADMIN_ROLES, description: 'View and manage ABAC (Attribute-Based Access Control) policies per role and resource.', group: 'admin-governance', navVisible: true, obsoleteInV2: true, path: '/admin/access-policies', title: 'Access Policies' },
  { allowedRoles: ADMIN_ROLES, description: 'F-5.4 / D-159 — override the role list behind each named RBAC preset (EXEC_ROLES, HR_GOVERNANCE_ROLES, etc.). Flag-gated by adminRolePermissionUI (default OFF).', group: 'admin-governance', navVisible: false, path: '/admin/access-policies/edit', title: 'Role Permissions' },
  { allowedRoles: ADMIN_ROLES, description: 'Configure who approves each governed action (project activation, budget change, person release, etc.).', group: 'admin-governance', navVisible: true, obsoleteInV2: true, path: '/admin/responsibility-matrix', title: 'Responsibility Matrix' },
  { allowedRoles: ADMIN_ROLES, description: 'Manage bill-rate cards and per-(role × grade × skill) hourly rates used by the J2 resolver at assignment-book time.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/rate-cards', title: 'Rate Cards' },
  { allowedRoles: ADMIN_ROLES, description: 'Author and publish Help Center articles end users see from the in-app `?` button.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/admin/help', title: 'Help Center' },
  { allowedRoles: ALL_ROLES, description: 'Browse Help Center articles published by your platform admins.', group: 'admin-config', navVisible: true, obsoleteInV2: true, path: '/help', title: 'Help' },
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
