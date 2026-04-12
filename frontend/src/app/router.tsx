import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { appRoutes } from './navigation';
import { AuthProvider } from './auth-context';
import { ImpersonationProvider } from './impersonation-context';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/routes/ProtectedRoute';
import { RoleGuard } from '@/routes/RoleGuard';
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
import { ProjectDetailsPlaceholderPage } from '@/routes/projects/ProjectDetailsPlaceholderPage';
import { ProjectsPage } from '@/routes/projects/ProjectsPage';
import { CreateProjectPage } from '@/routes/projects/CreateProjectPage';
import { TeamsPage } from '@/routes/teams/TeamsPage';
import { ResourcePoolDetailPage } from '@/routes/resource-pools/ResourcePoolDetailPage';
import { ResourcePoolsPage } from '@/routes/resource-pools/ResourcePoolsPage';
import { AccountSettingsPage } from '@/routes/settings/AccountSettingsPage';
import { InboxPage } from '@/routes/notifications/InboxPage';
import { WorkEvidencePage } from '@/routes/work-evidence/WorkEvidencePage';
import { TimesheetPage } from '@/routes/timesheets/TimesheetPage';
import { TimesheetApprovalPage } from '@/routes/timesheets/TimesheetApprovalPage';
import { LeaveRequestPage } from '@/routes/leave/LeaveRequestPage';
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
const ProjectDashboardPage = lazy(() => import('@/routes/projects/ProjectDashboardPage').then(m => ({ default: m.ProjectDashboardPage })));
const TeamDashboardPage = lazy(() => import('@/routes/teams/TeamDashboardPage').then(m => ({ default: m.TeamDashboardPage })));
const StaffingBoardPage = lazy(() => import('@/routes/staffing-board/StaffingBoardPage').then(m => ({ default: m.StaffingBoardPage })));
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

const ALL_ROLES = ['employee', 'hr_manager', 'project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'];
const MANAGEMENT_ROLES = ['hr_manager', 'project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'];
const WORKLOAD_ROLES = ['resource_manager', 'director', 'admin'];
const RESOURCE_POOL_ROLES = ['resource_manager', 'admin', 'director'];
const ADMIN_ROLES = ['admin'];
const DIRECTOR_ADMIN = ['director', 'admin'];
const HR_DIR_ADMIN = ['hr_manager', 'director', 'admin'];
const EXCEPTIONS_ROLES = ['project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin'];
const ASSIGNMENT_CREATE_ROLES = ['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin'];
const PROJECT_CREATE_ROLES = ['project_manager', 'delivery_manager', 'director', 'admin'];
const CASE_CREATE_ROLES = ['hr_manager', 'director', 'admin'];
const TIMESHEET_MANAGER_ROLES = ['project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin'];
const CAPITALISATION_ROLES = ['director', 'admin', 'delivery_manager'];
const EXPORT_CENTRE_ROLES = ['director', 'admin', 'delivery_manager', 'hr_manager'];

const dashboardChildren = [
  { element: <DashboardPage />, path: '/' },
  { element: <RoleGuard allowedRoles={MANAGEMENT_ROLES}><LazyPage><PlannedVsActualPage /></LazyPage></RoleGuard>, path: 'dashboard/planned-vs-actual' },
  {
    element: <RoleGuard allowedRoles={['employee', 'hr_manager', 'director', 'admin']}><LazyPage><EmployeeDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/employee',
  },
  {
    element: <RoleGuard allowedRoles={['project_manager', 'director', 'admin']}><LazyPage><ProjectManagerDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/project-manager',
  },
  {
    element: <RoleGuard allowedRoles={['resource_manager', 'director', 'admin']}><LazyPage><ResourceManagerDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/resource-manager',
  },
  {
    element: <RoleGuard allowedRoles={['hr_manager', 'director', 'admin']}><LazyPage><HrDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/hr',
  },
  {
    element: <RoleGuard allowedRoles={['delivery_manager', 'director', 'admin']}><LazyPage><DeliveryManagerDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/delivery-manager',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN}><LazyPage><DirectorDashboardPage /></LazyPage></RoleGuard>,
    path: 'dashboard/director',
  },
  { element: <LazyPage><OrgPage /></LazyPage>, path: 'org' },
  { element: <ManagerScopePage />, path: 'org/managers/:id/scope' },
  {
    element: <RoleGuard allowedRoles={['hr_manager', 'admin']}><EmployeeLifecycleAdminPage /></RoleGuard>,
    path: 'admin/people/new',
  },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><PeoplePage /></RoleGuard>, path: 'people' },
  {
    element: <RoleGuard allowedRoles={['hr_manager', 'admin']}><EmployeeLifecycleAdminPage /></RoleGuard>,
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
  { element: <RoleGuard allowedRoles={ALL_ROLES}><ProjectDetailsPlaceholderPage /></RoleGuard>, path: 'projects/:id' },
  { element: <LazyPage><ProjectDashboardPage /></LazyPage>, path: 'projects/:id/dashboard' },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><AssignmentsPage /></RoleGuard>, path: 'assignments' },
  {
    element: <RoleGuard allowedRoles={ASSIGNMENT_CREATE_ROLES}><CreateAssignmentPage /></RoleGuard>,
    path: 'assignments/new',
  },
  {
    element: <RoleGuard allowedRoles={ASSIGNMENT_CREATE_ROLES}><BulkAssignmentPage /></RoleGuard>,
    path: 'assignments/bulk',
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
  { element: <RoleGuard allowedRoles={ALL_ROLES}><WorkEvidencePage /></RoleGuard>, path: 'work-evidence' },
  {
    element: <RoleGuard allowedRoles={WORKLOAD_ROLES}><LazyPage><WorkloadMatrixPage /></LazyPage></RoleGuard>,
    path: 'workload',
  },
  {
    element: <RoleGuard allowedRoles={WORKLOAD_ROLES}><LazyPage><WorkloadPlanningPage /></LazyPage></RoleGuard>,
    path: 'workload/planning',
  },
  { element: <TimesheetPage />, path: 'timesheets' },
  {
    element: <RoleGuard allowedRoles={TIMESHEET_MANAGER_ROLES}><TimesheetApprovalPage /></RoleGuard>,
    path: 'timesheets/approval',
  },
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
    element: <RoleGuard allowedRoles={['project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin']}><LazyPage><UtilizationPage /></LazyPage></RoleGuard>,
    path: 'reports/utilization',
  },
  {
    element: <RoleGuard allowedRoles={['project_manager', 'resource_manager', 'hr_manager', 'delivery_manager', 'director', 'admin']}><LazyPage><ReportBuilderPage /></LazyPage></RoleGuard>,
    path: 'reports/builder',
  },
  { element: <RoleGuard allowedRoles={ALL_ROLES}><CasesPage /></RoleGuard>, path: 'cases' },
  { element: <StaffingRequestsPage />, path: 'staffing-requests' },
  {
    element: <RoleGuard allowedRoles={['resource_manager', 'delivery_manager', 'director', 'admin']}><LazyPage><StaffingBoardPage /></LazyPage></RoleGuard>,
    path: 'staffing-board',
  },
  {
    element: <RoleGuard allowedRoles={['project_manager', 'resource_manager', 'delivery_manager', 'director', 'admin']}><CreateStaffingRequestPage /></RoleGuard>,
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
    element: <RoleGuard allowedRoles={HR_DIR_ADMIN}><DictionariesPage /></RoleGuard>,
    path: 'admin/dictionaries',
  },
  {
    element: <RoleGuard allowedRoles={HR_DIR_ADMIN}><BusinessAuditPage /></RoleGuard>,
    path: 'admin/audit',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN}><NotificationsPage /></RoleGuard>,
    path: 'admin/notifications',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN}><IntegrationsAdminPage /></RoleGuard>,
    path: 'admin/integrations',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN}><MonitoringPage /></RoleGuard>,
    path: 'admin/monitoring',
  },
  {
    element: <RoleGuard allowedRoles={DIRECTOR_ADMIN}><IntegrationsPage /></RoleGuard>,
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
    element: <RoleGuard allowedRoles={HR_DIR_ADMIN}><BulkImportPage /></RoleGuard>,
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
]);
