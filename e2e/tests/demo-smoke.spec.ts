/**
 * Demo Smoke Test — Go/No-Go Check Before Investor Meeting
 *
 * Logs in as each of the 6 investor-demo roles and asserts:
 *   (a) No "empty state" text visible on the primary dashboard
 *   (b) No raw UUID strings visible in table cells
 *   (c) Dashboard loads without redirecting to /login
 *
 * Requires: investor-demo seed profile loaded in the database.
 * Run: npx playwright test e2e/tests/demo-smoke.spec.ts --config playwright.docker.config.ts
 */
import { expect, test } from '@playwright/test';

import { login } from '../fixtures/auth';

const DEMO_CREDENTIALS = [
  { role: 'Director',         email: 'catherine.monroe@apexdigital.demo', password: 'InvestorDemo1!', dashboardPath: '/dashboard' },
  { role: 'HR Manager',       email: 'laura.petrov@apexdigital.demo',     password: 'InvestorDemo1!', dashboardPath: '/dashboard/hr' },
  { role: 'Resource Manager', email: 'ethan.grant@apexdigital.demo',      password: 'InvestorDemo1!', dashboardPath: '/dashboard/rm' },
  { role: 'Project Manager',  email: 'rafael.moreno@apexdigital.demo',    password: 'InvestorDemo1!', dashboardPath: '/dashboard/pm' },
  { role: 'Delivery Manager', email: 'amara.diallo@apexdigital.demo',     password: 'InvestorDemo1!', dashboardPath: '/dashboard/delivery' },
  { role: 'Employee',         email: 'aisha.patel@apexdigital.demo',      password: 'InvestorDemo1!', dashboardPath: '/dashboard/employee' },
] as const;

const EMPTY_STATE_PATTERNS = [
  'No data found',
  'No records found',
  '0 results',
  'No active assignments',
];

// UUID pattern: 8-4-4-4-12 hex chars
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-/i;

for (const { role, email, password, dashboardPath } of DEMO_CREDENTIALS) {
  test.describe(`Demo smoke — ${role}`, () => {
    test.beforeEach(async ({ page }) => {
      await login(page, email, password);
    });

    test(`(c) ${role}: dashboard loads without redirecting to /login`, async ({ page }) => {
      await page.goto(dashboardPath);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      expect(url, `Expected dashboard URL, got: ${url}`).not.toContain('/login');
    });

    test(`(a) ${role}: no empty-state text on primary dashboard`, async ({ page }) => {
      await page.goto(dashboardPath);
      await page.waitForLoadState('networkidle');

      const bodyText = await page.locator('main').textContent() ?? '';

      for (const pattern of EMPTY_STATE_PATTERNS) {
        expect(
          bodyText,
          `Found empty-state text "${pattern}" on ${role} dashboard`,
        ).not.toContain(pattern);
      }
    });

    test(`(b) ${role}: no raw UUID strings in table cells`, async ({ page }) => {
      await page.goto(dashboardPath);
      await page.waitForLoadState('networkidle');

      // Collect all table cell text content
      const cells = page.locator('td');
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const text = await cells.nth(i).textContent() ?? '';
        expect(
          UUID_REGEX.test(text),
          `Table cell contains raw UUID: "${text.slice(0, 60)}" on ${role} dashboard`,
        ).toBe(false);
      }
    });
  });
}
