import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';

import {
  ALL_ROLES,
  ADMIN_ROLES,
  appRoutes,
  ASSIGNMENT_CREATE_ROLES,
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
  PM_DASHBOARD_ROLES,
  PROJECT_CREATE_ROLES,
  RESOURCE_POOL_ROLES,
  RM_DASHBOARD_ROLES,
  STAFFING_BOARD_ROLES,
  STAFFING_DESK_ROLES,
  STAFFING_REQUEST_ROLES,
  TIMESHEET_MANAGER_ROLES,
  WORKLOAD_ROLES,
} from './route-manifest';
import { AuthProvider } from './auth-context';
import { ImpersonationProvider } from './impersonation-context';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';
import { FeatureGuard } from '@/routes/FeatureGuard';
import { LoginPage } from '@/routes/auth/LoginPage';
import { ForgotPasswordPage } from '@/routes/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/routes/auth/ResetPasswordPage';
import { TwoFactorSetupPage } from '@/routes/auth/TwoFactorSetupPage';
import { AdminPanelPage } from '@/routes/admin/AdminPanelPage';
import { BulkImportPage } from '@/routes/admin/BulkImportPage';
import { BusinessAuditPage } from '@/routes/admin/BusinessAuditPage';
import { SettingsPage } from '@/routes/admin/SettingsPage';
import { DictionariesPage } from '@/routes/admin/DictionariesPage';
import { IntegrationsAdminPage } from '@/routes/admin/IntegrationsAdminPage';
import { MonitoringPage } from '@/routes/admin/MonitoringPage';
import { NotificationsPage } from '@/routes/admin/NotificationsPage';
import { WebhooksAdminPage } from '@/routes/admin/WebhooksAdminPage';
import { HrisConfigPage } from '@/routes/admin/HrisConfigPage';
import { AccessPoliciesPage } from '@/routes/admin/AccessPoliciesPage';
import { VendorRegistryPage } from '@/routes/admin/VendorRegistryPage';
import { ApprovalQueuePage } from '@/routes/assignments/ApprovalQueuePage';
import { AssignmentDetailsPlaceholderPage } from '@/routes/assignments/AssignmentDetailsPlaceholderPage';
import { AssignmentsPage } from '@/routes/assignments/AssignmentsPage';
import { BulkAssignmentPage } from '@/routes/assignments/BulkAssignmentPage';
import { CreateAssignmentPage } from '@/routes/assignments/CreateAssignmentPage';
import { CasesPage } from '@/routes/cases/CasesPage';
import { CaseDetailsPage } from '@/routes/cases/CaseDetailsPage';
import { CreateCasePage } from '@/routes/cases/CreateCasePage';
import { StaffingRequestsPage } from '@/routes/staffing-requests/StaffingRequestsPage';
import { StaffingRequestDetailPage } from '@/routes/staffing-requests/StaffingRequestDetailPage';
import { CreateStaffingRequestPage } from '@/routes/staffing-requests/CreateStaffingRequestPage';
import { DashboardPage } from '@/routes/dashboard/DashboardPage';
import { ExceptionsPage } from '@/routes/exceptions/ExceptionsPage';
import { IntegrationsPage } from '@/routes/integrations/IntegrationsPage';
import { MetadataAdminPage } from '@/routes/metadata-admin/MetadataAdminPage';
import { ManagerScopePage } from '@/routes/org/ManagerScopePage';
import { EmployeeDetailsPlaceholderPage } from '@/routes/people/EmployeeDetailsPlaceholderPage';
import { EmployeeLifecycleAdminPage } from '@/routes/people/EmployeeLifecycleAdminPage';
import { PeoplePage } from '@/routes/people/PeoplePage';
import { ProjectDetailPage } from '@/routes/projects/ProjectDetailPage';
import { ProjectsPage } from '@/routes/projects/ProjectsPage';
import { CreateProjectPage } from '@/routes/projects/CreateProjectPage';
import { PortfolioRadiatorPage } from '@/routes/dashboard/PortfolioRadiatorPage';
import { OrganizationConfigPage } from '@/routes/admin/OrganizationConfigPage';
import { RadiatorThresholdsPage } from '@/routes/admin/RadiatorThresholdsPage';
import { TeamsPage } from '@/routes/teams/TeamsPage';
import { ResourcePoolDetailPage } from '@/routes/resource-pools/ResourcePoolDetailPage';
import { ResourcePoolsPage } from '@/routes/resource-pools/ResourcePoolsPage';
import { AccountSettingsPage } from '@/routes/settings/AccountSettingsPage';
import { InboxPage } from '@/routes/notifications/InboxPage';
import { WorkEvidencePage } from '@/routes/work-evidence/WorkEvidencePage';
import { LeaveRequestPage } from '@/routes/leave/LeaveRequestPage';
import { MyTimePage } from '@/routes/my-time/MyTimePage';
import { TimeManagementPage } from '@/routes/time-management/TimeManagementPage';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { NotFoundPage } from '@/routes/NotFoundPage';
import { LoadingState } from '@/components/common/LoadingState';

// Code-split heavy chart/dashboard pages (Phase 16-02)
const DeliveryManagerDashboardPage = lazy(() => import('@/routes/dashboard/DeliveryManagerDashboardPage').then(m => ({ default: m.DeliveryManagerDashboardPage })));
const DirectorDashboardPage = lazy(() => import('@/routes/dashboard/DirectorDashboardPage').then(m => ({ default: m.DirectorDashboardPage })));
const EmployeeDashboardPage = lazy(() => import('@/routes/dashboard/EmployeeDashboardPage').then(m => ({ default: m.EmployeeDashboardPage })));
const HrDashboardPage = lazy(() => import('@/routes/dashboard/HrDashboardPage').then(m => ({ default: m.HrDashboardPage })));
const ProjectManagerDashboardPage = lazy(() => import('@/routes/dashboard/ProjectManagerDashboardPage').then(m => ({ default: m.ProjectManagerDashboardPage })));
const ResourceManagerDashboardPage = lazy(() => import('@/routes/dashboard/ResourceManagerDashboardPage').then(m => ({ default: m.ResourceManagerDashboardPage })));
const PlannedVsActualPage = lazy(() => import('@/routes/dashboard/PlannedVsActualPage').then(m => ({ default: m.PlannedVsActualPage })));
const OrgPage = lazy(() => import('@/routes/org/OrgPage').then(m => ({ default: m.OrgPage })));
// ProjectDashboardPage merged into ProjectDetailPage — route redirects to ?tab=radiator
function ProjectDashboardRedirect(): JSX.Element {
  const { id } = useParams();
  return <Navigate to={`/projects/${id ?? ''}?tab=radiator`} replace />;
}
const TeamDashboardPage = lazy(() => import('@/routes/teams/TeamDashboardPage').then(m => ({ default: m.TeamDashboardPage })));
const StaffingBoardPage = lazy(() => import('@/routes/staffing-board/StaffingBoardPage').then(m => ({ default: m.StaffingBoardPage })));
const StaffingDeskPage = lazy(() => import('@/routes/staffing-desk/StaffingDeskPage').then(m => ({ default: m.StaffingDeskPage })));
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
  { element: <DashboardPage />, path: '/' },
  { element: <RoleGuard allowedRoles={MANAGEMENT_ROLES}><LazyPage><PlannedVsActualPage /></LazyPage></RoleGuard>, path: 'dashboard/planned-vs-actual' },
  {
    element: <RoleGuard allowedRoles={EMPLOYEE_DASHBOARD_ROLES}><LazyPage><EmployeeDashboardPage /></LazyPage></RoleGuard>,
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
  {
    element: <RoleGuard allowedRoles={DELIVERY_DASHBOARD_ROLES}><PortfolioRadiatorPage /></RoleGuard>,
    path: 'dashboards/portfolio-radiator',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><RadiatorThresholdsPage /></RoleGuard>,
    path: 'admin/radiator-thresholds',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><OrganizationConfigPage /></RoleGuard>,
    path: 'admin/organization-config',
  },
  { element: <LazyPage><OrgPage /></LazyPage>, path: 'org' },
  { element: <ManagerScopePage />, path: 'org/managers/:id/scope' },
  {
    element: <RoleGuard allowedRoles={HR_ADMIN_ROLES}><EmployeeLifecycleAdminPage /></RoleGuard>,
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
  { element: <RoleGuard allowedRoles={ALL_ROLES}><AssignmentsPage /></RoleGuard>, path: 'assignments' },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN_ROLES}><CreateAssignmentPage /></RoleGuard>,
    path: 'assignments/new',
  },
  {
    element: <RoleGuard allowedRoles={ASSIGNMENT_CREATE_ROLES}><BulkAssignmentPage /></RoleGuard>,
    path: 'assignments/bulk',
  },
  {
    element: <RoleGuard allowedRoles={MANAGEMENT_ROLES}><ApprovalQueuePage /></RoleGuard>,
    path: 'assignments/queue',
  },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><AssignmentDetailsPlaceholderPage /></RoleGuard>, path: 'assignments/:id' },
  { element: <AccountSettingsPage />, path: 'settings/account' },
  { element: <InboxPage />, path: 'notifications' },
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
    element: <RoleGuard allowedRoles={TIMESHEET_MANAGER_ROLES}><TimeManagementPage /></RoleGuard>,
    path: 'time-management',
  },
  { element: <Navigate to="/my-time" replace />, path: 'timesheets' },
  { element: <RoleGuard allowedRoles={TIMESHEET_MANAGER_ROLES}><Navigate to="/time-management" replace /></RoleGuard>, path: 'timesheets/approval' },
  { element: <LeaveRequestPage />, path: 'leave' },
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
  { element: <StaffingRequestsPage />, path: 'staffing-requests' },
  {
    element: <RoleGuard allowedRoles={STAFFING_BOARD_ROLES}><Navigate to="/staffing-desk?view=timeline&kind=assignment&status=APPROVED,ACTIVE" replace /></RoleGuard>,
    path: 'staffing-board',
  },
  {
    element: <RoleGuard allowedRoles={STAFFING_DESK_ROLES}><LazyPage><StaffingDeskPage /></LazyPage></RoleGuard>,
    path: 'staffing-desk',
  },
  {
    element: <RoleGuard allowedRoles={STAFFING_REQUEST_ROLES}><CreateStaffingRequestPage /></RoleGuard>,
    path: 'staffing-requests/new',
  },
  { element: <StaffingRequestDetailPage />, path: 'staffing-requests/:id' },
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
    element: <RoleGuard allowedRoles={HR_DIRECTOR_ADMIN_ROLES}><DictionariesPage /></RoleGuard>,
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
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN_ROLES}><IntegrationsAdminPage /></RoleGuard>,
    path: 'admin/integrations',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN_ROLES}><MonitoringPage /></RoleGuard>,
    path: 'admin/monitoring',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN_ROLES}><IntegrationsPage /></RoleGuard>,
    path: 'integrations',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><MetadataAdminPage /></RoleGuard>,
    path: 'metadata-admin',
  },
  {
    element: <RoleGuard allowedRoles={ADMIN_ROLES}><SettingsPage /></RoleGuard>,
    path: 'admin/settings',
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
];

export const appRouter = createBrowserRouter([
  {
    element: <AuthProvider><LoginPage /></AuthProvider>,
    path: '/login',
  },
  {
    element: <AuthProvider><ForgotPasswordPage /></AuthProvider>,
    path: '/forgot-password',
  },
  {
    element: <AuthProvider><ResetPasswordPage /></AuthProvider>,
    path: '/reset-password',
  },
  {
    element: (
      <AuthProvider>
        <ProtectedRoute>
          <TwoFactorSetupPage />
        </ProtectedRoute>
      </AuthProvider>
    ),
    path: '/auth/2fa-setup',
  },
  {
    children: [
      ...dashboardChildren,
      { element: <NotFoundPage />, path: '*' },
    ],
    element: (
      <AuthProvider>
        <ImpersonationProvider>
          <ProtectedRoute>
            <ErrorBoundary>
              <AppShell routes={appRoutes} />
            </ErrorBoundary>
          </ProtectedRoute>
        </ImpersonationProvider>
      </AuthProvider>
    ),
    path: '/',
  },
], {
  future: {
    v7_relativeSplatPath: true,
  },
});
