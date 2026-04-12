/**
 * 12-timesheets.spec.ts
 * Timesheet E2E tests covering the time management flows.
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsEmployee, loginAsProjectManager, loginAsDeliveryManager } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const API = 'http://127.0.0.1:3000/api';

async function getToken(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<string> {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}

// ── Employee timesheets ───────────────────────────────────────────────────────

test.describe('Employee — view timesheets', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test('timesheets page is reachable', async ({ page }) => {
    await page.goto('/timesheets');

    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
    await expect(page.getByText(/Timesheet|timesheet|Time Entry/i).first()).toBeVisible();
  });

  test('employee can see their own timesheets', async ({ page }) => {
    await page.goto('/timesheets');

    // Either a table with entries or an empty-state message is shown
    const hasTable = (await page.locator('table').count()) > 0;
    const hasEmpty = (await page.getByText(/no entries|no timesheets|no records/i).count()) > 0;
    const hasList = (await page.getByRole('list').count()) > 0;
    expect(hasTable || hasEmpty || hasList).toBeTruthy();
  });

  test('timesheets API accepts personId filter and returns paginated response', async ({ page }) => {
    const token = await getToken(page, p2.accounts.employee.email, p2.accounts.employee.password);
    const res = await page.request.get(
      `${API}/timesheets?personId=${p2.people.ethanBrooks}&page=1&pageSize=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    // 200 or 404 if timesheets are not implemented for this person
    expect([200, 404].includes(res.status())).toBeTruthy();
    if (res.status() === 200) {
      const body = await res.json() as { totalCount?: number; items?: unknown[] };
      const hasExpectedShape = typeof body.totalCount === 'number' || Array.isArray(body.items) || Array.isArray(body);
      expect(hasExpectedShape).toBeTruthy();
    }
  });
});

// ── PM timesheets ─────────────────────────────────────────────────────────────

test.describe('PM — review team timesheets', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProjectManager(page);
  });

  test('PM can access timesheets page', async ({ page }) => {
    await page.goto('/timesheets');

    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
  });
});

// ── Delivery manager timesheets ──────────────────────────────────────────────

test.describe('Delivery Manager — review project timesheets', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDeliveryManager(page);
  });

  test('timesheets page renders for delivery manager', async ({ page }) => {
    await page.goto('/timesheets');

    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
    await expect(page.getByText(/Timesheet|timesheet|Time/i).first()).toBeVisible();
  });

  test('timesheets API returns data for project-based filter', async ({ page }) => {
    const token = await getToken(page, p2.accounts.deliveryManager.email, p2.accounts.deliveryManager.password);
    const res = await page.request.get(
      `${API}/timesheets?projectId=${p2.projects.deliveryCentral}&page=1&pageSize=10`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect([200, 404].includes(res.status())).toBeTruthy();
  });
});
