/**
 * Navigation helpers for Phase 2d E2E tests.
 * Centralises common go-to patterns so individual tests stay readable.
 */
import { type Page } from '@playwright/test';

// ── Generic navigation ───────────────────────────────────────────────────────

export async function gotoAndWait(page: Page, path: string): Promise<void> {
  await page.goto(path);
  // Wait for the network to settle (avoids race with initial data fetches)
  await page.waitForLoadState('networkidle').catch(() => {
    // networkidle may time out on slow CI — ignore and let assertions handle it
  });
}

// ── Route helpers ────────────────────────────────────────────────────────────

export const routes = {
  home: '/',
  login: '/login',

  // Dashboards
  employeeDashboard: (personId: string) => `/dashboard/employee?personId=${personId}`,
  pmDashboard: (personId: string) => `/dashboard/project-manager?personId=${personId}`,
  rmDashboard: (personId: string) => `/dashboard/resource-manager?personId=${personId}`,
  hrDashboard: (personId: string) => `/dashboard/hr-manager?personId=${personId}`,
  directorDashboard: '/dashboard/director',
  deliveryManagerDashboard: (personId: string) => `/dashboard/delivery-manager?personId=${personId}`,

  // Projects
  projects: '/projects',
  projectDetail: (id: string) => `/projects/${id}`,
  projectDashboard: (id: string) => `/projects/${id}/dashboard`,
  createProject: '/projects/new',

  // Assignments
  assignments: '/assignments',
  assignmentDetail: (id: string) => `/assignments/${id}`,
  createAssignment: '/assignments/new',
  bulkAssignment: '/assignments/bulk',

  // People / HR
  people: '/people',
  personDetail: (id: string) => `/people/${id}`,
  createPerson: '/people/new',
  employeeLifecycle: '/people/lifecycle',

  // Cases
  cases: '/cases',
  caseDetail: (id: string) => `/cases/${id}`,
  createCase: '/cases/new',

  // Org
  orgChart: '/org',
  managerScope: (managerId: string) => `/org/managers/${managerId}/scope`,

  // Admin
  admin: '/admin',
  adminAudit: '/admin/audit',
  adminMetadata: '/admin/metadata',
  adminIntegrations: '/admin/integrations',
  adminNotifications: '/admin/notifications',
  adminMonitoring: '/admin/monitoring',

  // Other
  exceptions: '/exceptions',
  workEvidence: '/work-evidence',
  timesheets: '/timesheets',
  reports: '/reports',
} as const;

// ── Assertion helpers ────────────────────────────────────────────────────────

/**
 * Wait for a toast / snackbar message containing the given text.
 */
export async function expectToast(page: Page, text: string | RegExp): Promise<void> {
  await page.getByRole('status').filter({ hasText: text }).waitFor({ state: 'visible' });
}

/**
 * Accept a browser confirm() dialog that appears when clicking a button.
 */
export async function clickWithConfirm(
  page: Page,
  buttonName: string | RegExp,
): Promise<void> {
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: buttonName }).click();
}
