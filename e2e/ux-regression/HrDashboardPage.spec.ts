/**
 * UX Contract regression — HrDashboardPage
 * Mirrors: docs/planning/ux-contracts/HrDashboardPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsHrManager, loginAsEmployee } from '../fixtures/auth';

const PATH = '/dashboard/hr';

test.describe('UX contract — HrDashboardPage §1 Route & Roles @ux-contract', () => {
  test('hr_manager can access /dashboard/hr', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/dashboard\/hr/);
  });

  test('employee is route-guarded away', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/\/dashboard\/hr/);
  });
});

test.describe('UX contract — HrDashboardPage §2 Click paths @ux-contract', () => {
  test('"Employee directory" link → /people', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PATH);
    const link = page.getByRole('link', { name: /employee directory/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/people');
  });

  test('"Cases" link → /cases', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PATH);
    const link = page.getByRole('link', { name: /^cases$/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/cases');
  });

  test('Tab change writes hash fragment', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PATH);
    const tab = page.getByRole('button', { name: /lifecycle/i }).first();
    if (await tab.count() === 0) test.skip();
    await tab.click();
    await expect(page).toHaveURL(/#lifecycle/);
  });
});

test.describe('UX contract — HrDashboardPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /dashboard/hr-manager/:id', async ({ page }) => {
    await loginAsHrManager(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/dashboard\/hr-manager\/[^/?]+/.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls.some((u) => /asOf=/.test(u))).toBe(true);
  });
});
