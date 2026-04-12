/**
 * Auth fixtures for Phase 2d E2E tests.
 * Provides a login() helper that authenticates via the API and injects the
 * token into localStorage so SPA route guards pass immediately.
 */
import { test as base, type Page } from '@playwright/test';

const API_BASE = process.env['PLAYWRIGHT_API_BASE'] ?? 'http://127.0.0.1:3000/api';
const TOKEN_KEY = 'deliverycentral.authToken';

// ── Credentials ─────────────────────────────────────────────────────────────

export const CREDENTIALS = {
  admin:           { email: 'admin@deliverycentral.local',   password: 'DeliveryCentral@Admin1' },
  director:        { email: 'noah.bennett@example.com',       password: 'DirectorPass1!' },
  hrManager:       { email: 'diana.walsh@example.com',        password: 'HrManagerPass1!' },
  resourceManager: { email: 'sophia.kim@example.com',         password: 'ResourceMgrPass1!' },
  projectManager:  { email: 'lucas.reed@example.com',         password: 'ProjectMgrPass1!' },
  deliveryManager: { email: 'carlos.vega@example.com',        password: 'DeliveryMgrPass1!' },
  employee:        { email: 'ethan.brooks@example.com',       password: 'EmployeePass1!' },
} as const;

// ── Core login helper ────────────────────────────────────────────────────────

/**
 * Authenticates via the REST API and injects the JWT into localStorage.
 * Call this before the first page.goto() in each test.
 */
export async function login(page: Page, email: string, password: string): Promise<string> {
  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed for ${email}: ${response.status()} ${await response.text()}`,
    );
  }

  const body = (await response.json()) as { accessToken?: string };

  if (!body.accessToken) {
    throw new Error(`No accessToken in login response for ${email}`);
  }

  const token = body.accessToken;

  await page.addInitScript(
    ({ key, tok }: { key: string; tok: string }) => {
      localStorage.setItem(key, tok);
    },
    { key: TOKEN_KEY, tok: token },
  );

  return token;
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

export async function loginAsAdmin(page: Page): Promise<string> {
  return login(page, CREDENTIALS.admin.email, CREDENTIALS.admin.password);
}

export async function loginAsDirector(page: Page): Promise<string> {
  return login(page, CREDENTIALS.director.email, CREDENTIALS.director.password);
}

export async function loginAsHrManager(page: Page): Promise<string> {
  return login(page, CREDENTIALS.hrManager.email, CREDENTIALS.hrManager.password);
}

export async function loginAsResourceManager(page: Page): Promise<string> {
  return login(page, CREDENTIALS.resourceManager.email, CREDENTIALS.resourceManager.password);
}

export async function loginAsProjectManager(page: Page): Promise<string> {
  return login(page, CREDENTIALS.projectManager.email, CREDENTIALS.projectManager.password);
}

export async function loginAsDeliveryManager(page: Page): Promise<string> {
  return login(page, CREDENTIALS.deliveryManager.email, CREDENTIALS.deliveryManager.password);
}

export async function loginAsEmployee(page: Page): Promise<string> {
  return login(page, CREDENTIALS.employee.email, CREDENTIALS.employee.password);
}

// ── Extended test fixtures ───────────────────────────────────────────────────

type AuthFixtures = {
  /** page already authenticated as an employee */
  employeePage: Page;
  /** page already authenticated as project_manager */
  pmPage: Page;
  /** page already authenticated as resource_manager */
  rmPage: Page;
  /** page already authenticated as hr_manager */
  hrPage: Page;
  /** page already authenticated as director */
  directorPage: Page;
  /** page already authenticated as admin */
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  employeePage: async ({ page }, use) => {
    await loginAsEmployee(page);
    await use(page);
  },
  pmPage: async ({ page }, use) => {
    await loginAsProjectManager(page);
    await use(page);
  },
  rmPage: async ({ page }, use) => {
    await loginAsResourceManager(page);
    await use(page);
  },
  hrPage: async ({ page }, use) => {
    await loginAsHrManager(page);
    await use(page);
  },
  directorPage: async ({ page }, use) => {
    await loginAsDirector(page);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
