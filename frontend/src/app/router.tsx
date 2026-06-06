import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams, useSearchParams } from 'react-router-dom';

import {
  ADMIN_ONLY_ROLES,
  ALL_ROLES,
  ADMIN_ROLES,
  appRoutes,
  BENCH_PAGE_ROLES,
  CAPITALISATION_ROLES,
  CASE_CREATE_ROLES,
  DELIVERY_DASHBOARD_ROLES,
  DIRECTOR_ADMIN_ROLES,
  EMPLOYEE_DASHBOARD_ROLES,
  EVIDENCE_MANAGEMENT_ROLES,
  EXCEPTIONS_ROLES,
  EXPORT_CENTRE_ROLES,
  HR_ADMIN_ROLES,
  HR_DASHBOARD_ROLES,
  HR_DIRECTOR_ADMIN_ROLES,
  MANAGEMENT_ROLES,
  MONITORING_ROLES,
  PM_DASHBOARD_ROLES,
  PROJECT_CREATE_ROLES,
  RM_DASHBOARD_ROLES,
  RESOURCE_POOL_ROLES,
  STAFFING_DESK_ROLES,
  STAFFING_REQUEST_DETAIL_ROLES,
  APPROVALS_ROLES,
  TIMESHEET_MANAGER_ROLES,
  WORKLOAD_ROLES,
} from './route-manifest';
import { ImpersonationProvider } from './impersonation-context';
import { AppShell } from '@/components/layout/AppShell';
import { SetupGate } from '@/app/setup-gate';
import { SetupOpsPage } from '@/routes/admin/SetupOpsPage';
import { SetupWizardPage } from '@/routes/setup/SetupWizardPage';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';
import { FeatureGuard } from '@/routes/FeatureGuard';
import { LoginPage } from '@/routes/auth/LoginPage';
import { ForgotPasswordPage } from '@/routes/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/routes/auth/ResetPasswordPage';
import { TwoFactorSetupPage } from '@/routes/auth/TwoFactorSetupPage';
import { AdminPanelPage } from '@/routes/admin/AdminPanelPage';
import { FeatureFlagsAdminPage } from '@/routes/admin/FeatureFlagsAdminPage';
import { PeriodLocksAdminPage } from '@/routes/admin/PeriodLocksAdminPage';
import { BulkImportPage } from '@/routes/admin/BulkImportPage';
import { BusinessAuditPage } from '@/routes/admin/BusinessAuditPage';
import { SettingsPage } from '@/routes/admin/SettingsPage';
import { DictionariesPage } from '@/routes/admin/DictionariesPage';
import { IntegrationsAdminPage } from '@/routes/admin/IntegrationsAdminPage';
import { IntegrationsRegistryPage } from '@/routes/admin/IntegrationsRegistryPage';
import { SsoAdminPage } from '@/routes/admin/SsoAdminPage';
import { MonitoringPage } from '@/routes/admin/MonitoringPage';
import { NotificationsPage } from '@/routes/admin/NotificationsPage';
import { WebhooksAdminPage } from '@/routes/admin/WebhooksAdminPage';
import { HrisConfigPage } from '@/routes/admin/HrisConfigPage';
import { AccessPoliciesPage } from '@/routes/admin/AccessPoliciesPage';
import { RolePermissionAdminPage } from '@/routes/admin/RolePermissionAdminPage';
import { V2SoakChecklistPage } from '@/routes/admin/V2SoakChecklistPage';
import { VendorRegistryPage } from '@/routes/admin/VendorRegistryPage';
import { AssignmentDetailsPlaceholderPage } from '@/routes/assignments/AssignmentDetailsPlaceholderPage';
import { CasesPage } from '@/routes/cases/CasesPage';
import { CaseDetailsPage } from '@/routes/cases/CaseDetailsPage';
import { CreateCasePage } from '@/routes/cases/CreateCasePage';
import { DashboardPage } from '@/routes/dashboard/DashboardPage';
import { DashboardRedirect } from '@/routes/DashboardRedirect';
import { HomeRedirect } from '@/routes/HomeRedirect';
import { V2Redirect } from '@/routes/V2Redirect';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { ExceptionsPage } from '@/routes/exceptions/ExceptionsPage';
import { IntegrationsPage } from '@/routes/integrations/IntegrationsPage';
import { MetadataAdminPage } from '@/routes/metadata-admin/MetadataAdminPage';
import { ManagerScopePage } from '@/routes/org/ManagerScopePage';
import { BenchPage } from '@/routes/people/BenchPage';
import { EmployeeDetailsPlaceholderPage } from '@/routes/people/EmployeeDetailsPlaceholderPage';
import { EmployeeLifecycleAdminPage } from '@/routes/people/EmployeeLifecycleAdminPage';
import { PeoplePage } from '@/routes/people/PeoplePage';
import { ProjectDetailPage } from '@/routes/projects/ProjectDetailPage';
import { ProjectsPage } from '@/routes/projects/ProjectsPage';
import { CreateProjectPage } from '@/routes/projects/CreateProjectPage';
import { PositionsListPage } from '@/routes/projects/PositionsListPage';
import { ProjectPositionDetailPage } from '@/routes/projects/ProjectPositionDetailPage';
import { PortfolioRadiatorPage } from '@/routes/dashboard/PortfolioRadiatorPage';
import { OrganizationConfigPage } from '@/routes/admin/OrganizationConfigPage';
import { RadiatorThresholdsPage } from '@/routes/admin/RadiatorThresholdsPage';
import { ResponsibilityMatrixAdminPage } from '@/routes/admin/ResponsibilityMatrixAdminPage';
import { RateCardsAdminPage } from '@/routes/admin/RateCardsAdminPage';
import { HelpAdminPage } from '@/routes/admin/HelpAdminPage';
import { LeavePolicyAdminPage } from '@/routes/admin/LeavePolicyAdminPage';
import { CustomRoleAdminPage } from '@/routes/admin/CustomRoleAdminPage';
import { HelpArticleListPage } from '@/routes/help/HelpArticleListPage';
import { HelpArticleDetailPage } from '@/routes/help/HelpArticleDetailPage';
import { TeamsPage } from '@/routes/teams/TeamsPage';
import { ResourcePoolDetailPage } from '@/routes/resource-pools/ResourcePoolDetailPage';
import { ResourcePoolsPage } from '@/routes/resource-pools/ResourcePoolsPage';
import { AccountSettingsPage } from '@/routes/settings/AccountSettingsPage';
import { InboxPage } from '@/routes/notifications/InboxPage';
import { WorkEvidencePage } from '@/routes/work-evidence/WorkEvidencePage';
import { LeaveRequestPage } from '@/routes/leave/LeaveRequestPage';
import { MyTimePage } from '@/routes/my-time/MyTimePage';
import { TimeManagementPage } from '@/routes/time-management/TimeManagementPage';
import { WorkspaceShellPage } from '@/routes/me/WorkspaceShellPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { LoadingState } from '@/components/common/LoadingState';

// Code-split heavy chart/dashboard pages (Phase 16-02)
const ApprovalsPage = lazy(() => import('@/routes/approvals/ApprovalsPage').then(m => ({ default: m.ApprovalsPage })));
const DeliveryManagerDashboardPage = lazy(() => import('@/routes/dashboard/DeliveryManagerDashboardPage').then(m => ({ default: m.DeliveryManagerDashboardPage })));
const DirectorDashboardPage = lazy(() => import('@/routes/dashboard/DirectorDashboardPage').then(m => ({ default: m.DirectorDashboardPage })));
const EmployeeDashboardPage = lazy(() => import('@/routes/dashboard/EmployeeDashboardPage').then(m => ({ default: m.EmployeeDashboardPage })));
const HrDashboardPage = lazy(() => import('@/routes/dashboard/HrDashboardPage').then(m => ({ default: m.HrDashboardPage })));
const ProjectManagerDashboardPage = lazy(() => import('@/routes/dashboard/ProjectManagerDashboardPage').then(m => ({ default: m.ProjectManagerDashboardPage })));
const ResourceManagerDashboardPage = lazy(() => import('@/routes/dashboard/ResourceManagerDashboardPage').then(m => ({ default: m.ResourceManagerDashboardPage })));
// Sprint F-0.11 (Decision-11) — merged dashboards.
const ManagerDashboardPage = lazy(() => import('@/routes/dashboard/ManagerDashboardPage').then(m => ({ default: m.ManagerDashboardPage })));
const ExecDashboardPage = lazy(() => import('@/routes/dashboard/ExecDashboardPage').then(m => ({ default: m.ExecDashboardPage })));
const PlannedVsActualPage = lazy(() => import('@/routes/dashboard/PlannedVsActualPage').then(m => ({ default: m.PlannedVsActualPage })));
const OrgPage = lazy(() => import('@/routes/org/OrgPage').then(m => ({ default: m.OrgPage })));
// ProjectDashboardPage merged into ProjectDetailPage.
// Phase E5: under dsRefresh, the canvas "Pulse" tab is the headline view;
// pre-flag the legacy radiator tab remains the destination.
function ProjectDashboardRedirect(): JSX.Element {
  const { id } = useParams();
  const tab = isFeatureEnabled('dsRefresh') ? 'pulse' : 'radiator';
  return <Navigate to={`/projects/${id ?? ''}?tab=${tab}`} replace />;
}

// Wave 1 / W1-21 — legacy `/assignments/new` (interim ProjectAssignment flow)
// is superseded by the lean ProjectPosition flow at `/staffing-requests/new`.
// Preserves the `projectId` query param so deep-links from project detail
// continue to pre-select the project on the create form.
function AssignmentsNewRedirect(): JSX.Element {
  const [params] = useSearchParams();
  const projectId = params.get('projectId');
  const target = projectId
    ? `/staffing-requests/new?projectId=${encodeURIComponent(projectId)}`
    : '/staffing-requests/new';
  return <Navigate to={target} replace />;
}
const TeamDashboardPage = lazy(() => import('@/routes/teams/TeamDashboardPage').then(m => ({ default: m.TeamDashboardPage })));
const StaffingDeskPage = lazy(() => import('@/routes/staffing-desk/StaffingDeskPage').then(m => ({ default: m.StaffingDeskPage })));
const CreatePositionPage = lazy(() => import('@/routes/staffing-desk/CreatePositionPage').then(m => ({ default: m.CreatePositionPage })));
const BulkCreatePositionsPage = lazy(() => import('@/routes/staffing-desk/BulkCreatePositionsPage').then(m => ({ default: m.BulkCreatePositionsPage })));
const ReportsPage = lazy(() => import('@/routes/reports/ReportsPage').then(m => ({ default: m.ReportsPage })));
const UtilizationPage = lazy(() => import('@/routes/reports/UtilizationPage').then(m => ({ default: m.UtilizationPage })));
const ReportBuilderPage = lazy(() => import('@/routes/reports/ReportBuilderPage').then(m => ({ default: m.ReportBuilderPage })));
const TimeReportPage = lazy(() => import('@/routes/reports/TimeReportPage').then(m => ({ default: m.TimeReportPage })));
const CapitalisationPage = lazy(() => import('@/routes/reports/CapitalisationPage').then(m => ({ default: m.CapitalisationPage })));
const ExportCentrePage = lazy(() => import('@/routes/reports/ExportCentrePage').then(m => ({ default: m.ExportCentrePage })));
const WorkloadMatrixPage = lazy(() => import('@/routes/workload/WorkloadMatrixPage').then(m => ({ default: m.WorkloadMatrixPage })));
const WorkloadPlanningPage = lazy(() => import('@/routes/workload/WorkloadPlanningPage').then(m => ({ default: m.WorkloadPlanningPage })));

function LazyPage({ children }: { children: React.ReactNode }): JSX.Element {
  return <Suspense fallback={<LoadingState label="Loading..." />}>{children}</Suspense>;
}

const dashboardChildren = [
  { element: <HomeRedirect />, path: '/' },
  // `/dashboard` bare URL — per-role redirect to the persona's default dashboard.
  // Without this, `/dashboard` falls through to the catch-all 404 (hard-locked
  // on the v2 QA walk for every persona).
  { element: <DashboardRedirect />, path: 'dashboard' },
  { element: <RoleGuard allowedRoles={MANAGEMENT_ROLES}><LazyPage><PlannedVsActualPage /></LazyPage></RoleGuard>, path: 'dashboard/planned-vs-actual' },
  // Sprint F-0.11 (Decision-11) — merged Manager + Exec dashboards.
  // The per-role routes below remain for direct access; the merged routes
  // are the canonical sidebar entries in v1.
  {
    element: (
      <RoleGuard allowedRoles={['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin']}>
        <V2Redirect to="/me"><LazyPage><ManagerDashboardPage /></LazyPage></V2Redirect>
      </RoleGuard>
    ),
    path: 'dashboard/manager',
  },
  {
    element: (
      <RoleGuard allowedRoles={['director', 'admin', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager']}>
        <V2Redirect to="/dashboard/director"><LazyPage><ExecDashboardPage /></LazyPage></V2Redirect>
      </RoleGuard>
    ),
    path: 'dashboard/exec',
  },
  {
    element: <RoleGuard allowedRoles={EMPLOYEE_DASHBOARD_ROLES}><V2Redirect to="/me"><LazyPage><EmployeeDashboardPage /></LazyPage></V2Redirect></RoleGuard>,
    path: 'dashboard/employee',
  },
  {
    element: <RoleGuard allowedRoles={PM_DASHBOARD_ROLES}><LazyPage><ProjectManagerDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/project-manager',
  },
  {
    element: <RoleGuard allowedRoles={RM_DASHBOARD_ROLES}><LazyPage><ResourceManagerDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/resource-manager',
  },
  {
    element: <RoleGuard allowedRoles={HR_DASHBOARD_ROLES}><LazyPage><HrDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/hr',
  },
  {
    element: <RoleGuard allowedRoles={DELIVERY_DASHBOARD_ROLES}><LazyPage><DeliveryManagerDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/delivery-manager',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN_ROLES}><LazyPage><DirectorDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/director',
  },
  // W1-01 — short-form dashboard aliases for muscle-memory URLs.
  { element: <Navigate to="/dashboard/delivery-manager" replace />, path: 'dashboard/dm' },
  { element: <Navigate to="/dashboard/project-manager" replace />, path: 'dashboard/pm' },
  { element: <Navigate to="/dashboard/resource-manager" replace />, path: 'dashboard/rm' },
  {
    element: <RoleGuard allowedRoles={APPROVALS_ROLES}><LazyPage><ApprovalsPage /></LazyPage></RoleGuard>,
    path: 'approvals',
  },
  // W1-04 — /approvals/queue is a legacy URL; redirect to the canonical
  // unified queue at /approvals.
  { element: <Navigate to="/approvals" replace />, path: 'approvals/queue' },
  {
    element: <RoleGuard allowedRoles={DELIVERY_DASHBOARD_ROLES}><V2Redirect to="/dashboard/director"><PortfolioRadiatorPage /></V2Redirect></RoleGuard>,
    path: 'dashboards/portfolio-radiator',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><RadiatorThresholdsPage /></RoleGuard>,
    path: 'admin/radiator-thresholds',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><ResponsibilityMatrixAdminPage /></RoleGuard>,
    path: 'admin/responsibility-matrix',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><RateCardsAdminPage /></RoleGuard>,
    path: 'admin/rate-cards',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><LeavePolicyAdminPage /></RoleGuard>,
    path: 'admin/leave-policies',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><CustomRoleAdminPage /></RoleGuard>,
    path: 'admin/governance/roles',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><HelpAdminPage /></RoleGuard>,
    path: 'admin/help',
  },
  {
    element: <RoleGuard allowedRoles={ALL_ROLES}><HelpArticleListPage /></RoleGuard>,
    path: 'help',
  },
  {
    element: <RoleGuard allowedRoles={ALL_ROLES}><HelpArticleDetailPage /></RoleGuard>,
    path: 'help/:slug',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><OrganizationConfigPage /></RoleGuard>,
    path: 'admin/organization-config',
  },
  { element: <LazyPage><OrgPage /></LazyPage>, path: 'org' },
  // W1-27 — wrap in RoleGuard. BE `ManagerScopeController` is guarded by
  // `@RequireRoles(...ALL_MANAGER_ROLES)` + `@AllowSelfScope({ param: 'id' })`
  // so employees can hit their own scope; FE keeps `ALL_ROLES` so a self-scope
  // call by an employee isn't blocked at the FE before the BE self-scope check.
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ManagerScopePage /></RoleGuard>, path: 'org/managers/:id/scope' },
  {
    // F-11.1 / D-86 — `/admin/people/new` is a legacy alias of `/people/new`.
    // Both rendered the same `EmployeeLifecycleAdminPage`; consolidating
    // via a `<Navigate>` to keep one canonical route. RoleGuard preserved
    // so deep-linked unauthenticated users still see the 403.
    element: <RoleGuard allowedRoles={HR_ADMIN_ROLES}><Navigate to="/people/new" replace /></RoleGuard>,
    path: 'admin/people/new',
  },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><PeoplePage /></RoleGuard>, path: 'people' },
  {
    element: <RoleGuard allowedRoles={HR_ADMIN_ROLES}><EmployeeLifecycleAdminPage /></RoleGuard>,
    path: 'people/new',
  },
  {
    element: <RoleGuard allowedRoles={EXCEPTIONS_ROLES}><ExceptionsPage /></RoleGuard>,
    path: 'exceptions',
  },
  { element: <TeamsPage />, path: 'teams' },
  { element: <LazyPage><TeamDashboardPage /></LazyPage>, path: 'teams/:id/dashboard' },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><EmployeeDetailsPlaceholderPage /></RoleGuard>, path: 'people/:id' },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ProjectsPage /></RoleGuard>, path: 'projects' },
  {
    element: <RoleGuard allowedRoles={PROJECT_CREATE_ROLES}><CreateProjectPage /></RoleGuard>,
    path: 'projects/new',
  },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ProjectDetailPage /></RoleGuard>, path: 'projects/:id' },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ProjectDashboardRedirect /></RoleGuard>, path: 'projects/:id/dashboard' },
  // LEAN-P2 exit-gate: legacy /assignments surfaces removed. Direct visits
  // redirect to the canonical project-positions surfaces (staffing desk,
  // approvals queue).
  { element: <Navigate to="/staffing-desk?view=table&kind=assignment&status=APPROVED,ACTIVE" replace />, path: 'assignments' },
  // W1-21 — legacy /assignments/new redirects to the lean ProjectPosition
  // create form, preserving any projectId query param from project-detail
  // deep-links.
  { element: <AssignmentsNewRedirect />, path: 'assignments/new' },
  { element: <Navigate to="/staffing-desk?view=table&kind=assignment&status=APPROVED,ACTIVE" replace />, path: 'assignments/bulk' },
  { element: <Navigate to="/approvals" replace />, path: 'assignments/queue' },
  // Lean canonical: both /assignments/:id and /staffing-requests/:id route
  // to the unified ProjectPositionDetailPage (positionId == :id). When the
  // id doesn't resolve as a position, the page surfaces "not found" cleanly.
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ProjectPositionDetailPage /></RoleGuard>, path: 'assignments/:id' },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ProjectPositionDetailPage /></RoleGuard>, path: 'positions/:id' },
  { element: <AccountSettingsPage />, path: 'settings/account' },
  { element: <InboxPage />, path: 'notifications' },
  // /me — Employee Workspace shell. Gated by flag.workspaceMe (default OFF in
  // prod; ON in v2-staging via VITE_FORCE_FLAGS_ON). Hosts the existing
  // self-service pages inside a unified tab strip; subsequent PRs ship the
  // redesigned Overview / Leave / Projects content.
  {
    element: (
      <FeatureGuard flag="workspaceMe">
        <WorkspaceShellPage />
      </FeatureGuard>
    ),
    path: 'me',
  },
  // W1-02 — short-form /me/:tab aliases redirect into the workspace shell
  // (?tab=...) so deep-linked URLs from email / docs / chat resolve cleanly.
  // `/me/cases` resolves outside the shell to the canonical HR queue.
  { element: <Navigate to="/me?tab=overview" replace />, path: 'me/overview' },
  { element: <Navigate to="/me?tab=time" replace />, path: 'me/time' },
  { element: <Navigate to="/me?tab=leave" replace />, path: 'me/leave' },
  { element: <Navigate to="/me?tab=projects" replace />, path: 'me/projects' },
  { element: <Navigate to="/me?tab=skills" replace />, path: 'me/skills' },
  { element: <Navigate to="/me?tab=inbox" replace />, path: 'me/inbox' },
  { element: <Navigate to="/me?tab=settings" replace />, path: 'me/profile' },
  { element: <Navigate to="/me?tab=settings" replace />, path: 'me/settings' },
  { element: <Navigate to="/cases" replace />, path: 'me/cases' },
  {
    element: <RoleGuard allowedRoles={RESOURCE_POOL_ROLES}><ResourcePoolsPage /></RoleGuard>,
    path: 'resource-pools',
  },
  {
    element: <RoleGuard allowedRoles={RESOURCE_POOL_ROLES}><ResourcePoolDetailPage /></RoleGuard>,
    path: 'resource-pools/:id',
  },
  {
    element: (
      <RoleGuard allowedRoles={EVIDENCE_MANAGEMENT_ROLES}>
        <FeatureGuard feature="evidenceManagement">
          <WorkEvidencePage />
        </FeatureGuard>
      </RoleGuard>
    ),
    path: 'work-evidence',
  },
  {
    element: <RoleGuard allowedRoles={WORKLOAD_ROLES}><Navigate to="/staffing-desk?view=table&kind=assignment&status=APPROVED,ACTIVE" replace /></RoleGuard>,
    path: 'workload',
  },
  {
    element: <RoleGuard allowedRoles={WORKLOAD_ROLES}><Navigate to="/staffing-desk?view=timeline" replace /></RoleGuard>,
    path: 'workload/planning',
  },
  { element: <MyTimePage />, path: 'my-time' },
  {
    // W1-22 — legacy /time-management is absorbed into the unified
    // /approvals queue under dsRefresh. The page still renders pre-flag
    // so OFF-flag tenants retain the manager timesheet approval surface.
    element: (
      <RoleGuard allowedRoles={TIMESHEET_MANAGER_ROLES}>
        <V2Redirect to="/approvals"><TimeManagementPage /></V2Redirect>
      </RoleGuard>
    ),
    path: 'time-management',
  },
  { element: <Navigate to="/my-time" replace />, path: 'timesheets' },
  { element: <RoleGuard allowedRoles={TIMESHEET_MANAGER_ROLES}><Navigate to="/time-management" replace /></RoleGuard>, path: 'timesheets/approval' },
  { element: <LeaveRequestPage />, path: 'leave' },
  {
    element: <RoleGuard allowedRoles={EXCEPTIONS_ROLES}><LazyPage><ReportsPage /></LazyPage></RoleGuard>,
    path: 'reports',
  },
  {
    element: <RoleGuard allowedRoles={TIMESHEET_MANAGER_ROLES}><LazyPage><TimeReportPage /></LazyPage></RoleGuard>,
    path: 'reports/time',
  },
  {
    element: <RoleGuard allowedRoles={CAPITALISATION_ROLES}><LazyPage><CapitalisationPage /></LazyPage></RoleGuard>,
    path: 'reports/capitalisation',
  },
  {
    element: <RoleGuard allowedRoles={EXPORT_CENTRE_ROLES}><LazyPage><ExportCentrePage /></LazyPage></RoleGuard>,
    path: 'reports/export',
  },
  {
    element: <RoleGuard allowedRoles={EXCEPTIONS_ROLES}><LazyPage><UtilizationPage /></LazyPage></RoleGuard>,
    path: 'reports/utilization',
  },
  {
    element: <RoleGuard allowedRoles={EXCEPTIONS_ROLES}><LazyPage><ReportBuilderPage /></LazyPage></RoleGuard>,
    path: 'reports/builder',
  },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><CasesPage /></RoleGuard>, path: 'cases' },
  // LEAN-P2 exit-gate: legacy /staffing-requests surfaces removed. Redirect
  // to the canonical staffing-desk and position-detail surfaces.
  { element: <Navigate to="/staffing-desk?view=board" replace />, path: 'staffing-requests' },
  // Sprint 2 / S2-8 — lean staffing aggregate skeleton pages.
  { element: <RoleGuard allowedRoles={ALL_ROLES}><PositionsListPage /></RoleGuard>, path: 'projects/:projectId/positions' },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ProjectPositionDetailPage /></RoleGuard>, path: 'projects/:projectId/positions/:positionId' },
  // W1-25 — FE/BE alignment: BE `/people/bench` is guarded by STAFFING_ROLES
  // (PM+RM+DM+director+admin). FE was RESOURCE_POOL_ROLES (RM+director+admin)
  // which hid the surface from PM/DM despite BE accepting them.
  { element: <RoleGuard allowedRoles={BENCH_PAGE_ROLES}><BenchPage /></RoleGuard>, path: 'people/bench' },
  // LEAN-P2 exit-gate: /staffing-board is now a redirect-only path. RBAC is
  // enforced at the canonical /staffing-desk destination — keep this entry
  // permissive (matches manifest ALL_ROLES) so redirects always resolve.
  {
    element: <Navigate to="/staffing-desk?view=timeline&kind=assignment&status=APPROVED,ACTIVE" replace />,
    path: 'staffing-board',
  },
  {
    element: <RoleGuard allowedRoles={STAFFING_DESK_ROLES}><LazyPage><StaffingDeskPage /></LazyPage></RoleGuard>,
    path: 'staffing-desk',
  },
  // Lean full-page flow for opening a new ProjectPosition. Replaces the
  // legacy CreateStaffingRequestPage with a thin form that writes the
  // canonical aggregate directly — no interim ProjectAssignment.
  { element: <RoleGuard allowedRoles={STAFFING_DESK_ROLES}><LazyPage><CreatePositionPage /></LazyPage></RoleGuard>, path: 'staffing-requests/new' },
  { element: <RoleGuard allowedRoles={STAFFING_DESK_ROLES}><LazyPage><CreatePositionPage /></LazyPage></RoleGuard>, path: 'staffing-desk/positions/new' },
  // W2-05 — bulk "open multiple positions at once" surface. Complements the
  // single-position CreatePositionPage and the BulkReassignPanel (existing-
  // position reassignment) shipped in issue 542. PM/RM JTBD: stand up a
  // whole project team in one pass.
  { element: <RoleGuard allowedRoles={STAFFING_DESK_ROLES}><LazyPage><BulkCreatePositionsPage /></LazyPage></RoleGuard>, path: 'staffing-requests/bulk' },
  // Lean canonical: /staffing-requests/:id renders the unified ProjectPositionDetailPage.
  // W1-23 — FE/BE alignment: BE `StaffingRequestsController` is guarded by
  // `@RequireRoles(...STAFFING_ROLES)` (PM+RM+DM+director+admin). FE was
  // permissive (`ALL_ROLES`) which let employees hit a forbidden surface.
  { element: <RoleGuard allowedRoles={STAFFING_REQUEST_DETAIL_ROLES}><ProjectPositionDetailPage /></RoleGuard>, path: 'staffing-requests/:id' },
  {
    element: <RoleGuard allowedRoles={CASE_CREATE_ROLES}><CreateCasePage /></RoleGuard>,
    path: 'cases/new',
  },
  { element: <CaseDetailsPage />, path: 'cases/:id' },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><AdminPanelPage /></RoleGuard>,
    path: 'admin',
  },
  {
    // F-12.4 / D-101 — legacy HR-scoped dictionary admin consolidated
    // into /metadata-admin. Redirect preserves deep-linked bookmarks;
    // /metadata-admin RBAC widened to HR_DIRECTOR_ADMIN_ROLES.
    element: <RoleGuard allowedRoles={HR_DIRECTOR_ADMIN_ROLES}><Navigate to="/metadata-admin" replace /></RoleGuard>,
    path: 'admin/dictionaries',
  },
  {
    element: <RoleGuard allowedRoles={HR_DIRECTOR_ADMIN_ROLES}><BusinessAuditPage /></RoleGuard>,
    path: 'admin/audit',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN_ROLES}><NotificationsPage /></RoleGuard>,
    path: 'admin/notifications',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ONLY_ROLES}><IntegrationsAdminPage /></RoleGuard>,
    path: 'admin/integrations',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ONLY_ROLES}><IntegrationsRegistryPage /></RoleGuard>,
    path: 'admin/integrations/registry',
  },
  {
    // NEW-LGL-2 — bank-ops self-serve SSO configuration.
    element: <RoleGuard allowedRoles={ADMIN_ONLY_ROLES}><SsoAdminPage /></RoleGuard>,
    path: 'admin/integrations/sso',
  },
  {
    // W1-26 — widen to director so executives can observe platform health.
    // Page is read-only — no write actions, no credentials exposed.
    element: <RoleGuard allowedRoles={MONITORING_ROLES}><MonitoringPage /></RoleGuard>,
    path: 'admin/monitoring',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN_ROLES}><V2Redirect to="/admin?section=integrations"><IntegrationsPage /></V2Redirect></RoleGuard>,
    path: 'integrations',
  },
  {
    // F-12.4 / D-101 — RBAC widened from ADMIN_ROLES to
    // HR_DIRECTOR_ADMIN_ROLES so HR/Director keep dictionary-admin
    // access after the legacy /admin/dictionaries consolidation.
    element: <RoleGuard allowedRoles={HR_DIRECTOR_ADMIN_ROLES}><MetadataAdminPage /></RoleGuard>,
    path: 'metadata-admin',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><SettingsPage /></RoleGuard>,
    path: 'admin/settings',
  },
  {
    // Sprint F-1.1 — Tenant Settings Catalog admin surface.
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><FeatureFlagsAdminPage /></RoleGuard>,
    path: 'admin/feature-flags',
  },
  {
    // F-2.0a (D-93) — admin Period Locks UI.
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><PeriodLocksAdminPage /></RoleGuard>,
    path: 'admin/period-locks',
  },
  {
    // F-13.7 (D-117) — post-install control surface; pairs with /setup wizard.
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><SetupOpsPage /></RoleGuard>,
    path: 'admin/setup',
  },
  {
    element: <RoleGuard allowedRoles={HR_DIRECTOR_ADMIN_ROLES}><BulkImportPage /></RoleGuard>,
    path: 'admin/people/import',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><WebhooksAdminPage /></RoleGuard>,
    path: 'admin/webhooks',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><HrisConfigPage /></RoleGuard>,
    path: 'admin/hris',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><VendorRegistryPage /></RoleGuard>,
    path: 'admin/vendors',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><AccessPoliciesPage /></RoleGuard>,
    path: 'admin/access-policies',
  },
  {
    element: (
      <RoleGuard allowedRoles={ADMIN_ROLES}>
        <FeatureGuard flag="adminRolePermissionUI">
          <RolePermissionAdminPage />
        </FeatureGuard>
      </RoleGuard>
    ),
    path: 'admin/access-policies/edit',
  },
  {
    // MANUAL-CLICK-THROUGH-30 — admin V2 soak click-through checklist.
    // Gated by `dsRefresh` because the matrix only matters during the
    // staging soak that precedes the C0 cutover flip.
    element: (
      <RoleGuard allowedRoles={ADMIN_ROLES}>
        <FeatureGuard flag="dsRefresh">
          <V2SoakChecklistPage />
        </FeatureGuard>
      </RoleGuard>
    ),
    path: 'admin/v2-soak-checklist',
  },
];

export const appRouter = createBrowserRouter([
  {
    element: <SetupGate><SetupWizardPage /></SetupGate>,
    path: '/setup',
  },
  {
    // F-22 / CC-10 — AuthProvider hoisted to App.tsx; SetupGate stays
    // here because it uses `useLocation` and must run inside the router.
    element: <SetupGate><LoginPage /></SetupGate>,
    path: '/login',
  },
  {
    element: <SetupGate><ForgotPasswordPage /></SetupGate>,
    path: '/forgot-password',
  },
  {
    element: <SetupGate><ResetPasswordPage /></SetupGate>,
    path: '/reset-password',
  },
  {
    element: (
      <SetupGate>
        <ProtectedRoute>
          <TwoFactorSetupPage />
        </ProtectedRoute>
      </SetupGate>
    ),
    path: '/auth/2fa-setup',
  },
  {
    children: [
      ...dashboardChildren,
      { element: <NotFoundPage />, path: '*' },
    ],
    element: (
      <SetupGate>
        <ImpersonationProvider>
          <ProtectedRoute>
            <ErrorBoundary>
              <AppShell routes={appRoutes} />
            </ErrorBoundary>
          </ProtectedRoute>
        </ImpersonationProvider>
      </SetupGate>
    ),
    path: '/',
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
