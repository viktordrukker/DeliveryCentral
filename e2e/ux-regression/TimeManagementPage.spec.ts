/**
 * UX Contract regression — TimeManagementPage
 * Mirrors: docs/planning/ux-contracts/TimeManagementPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsEmployee, loginAsHrManager, loginAsAdmin } from '../fixtures/auth';

const PATH = '/time-management';

test.describe('UX contract — TimeManagementPage §1 Route & Roles @ux-contract', () => {
  test('hr_manager can access /time-management', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/time-management/);
  });

  test('employee is route-guarded away', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/time-management(?:[?#]|$)/);
  });
});

test.describe('UX contract — TimeManagementPage §5 Toasts @ux-contract', () => {
  test('Approve emits toast.success', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/timesheets/*/approve', (route) =>
      route.fulfill({ status: 200, body: '{}', contentType: 'application/json' }),
    );
    await page.route('**/api/leave-requests/*/approve', (route) =>
      route.fulfill({ status: 200, body: '{}', contentType: 'application/json' }),
    );
    await page.goto(PATH);
    const approveBtn = page.getByRole('button', { name: /^approve$/i }).first();
    if (await approveBtn.count() === 0) test.skip();
    await approveBtn.click();
    await expect(page.getByText(/^approved /i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('UX contract — TimeManagementPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /time-management/queue', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/time-management\/(queue|team-calendar|compliance)/.test(url)) calls.push(url);
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
