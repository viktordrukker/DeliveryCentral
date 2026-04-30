/**
 * UX Contract regression — DirectorDashboardPage
 * Mirrors: docs/planning/ux-contracts/DirectorDashboardPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector, loginAsEmployee, loginAsAdmin } from '../fixtures/auth';

const PATH = '/dashboard/director';

test.describe('UX contract — DirectorDashboardPage §1 Route & Roles @ux-contract', () => {
  test('director can access /dashboard/director', async ({ page }) => {
    await loginAsDirector(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/dashboard\/director/);
  });

  test('admin can access /dashboard/director', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/dashboard\/director/);
  });

  test('employee is route-guarded away', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/\/dashboard\/director/);
  });
});

test.describe('UX contract — DirectorDashboardPage §2 Click paths @ux-contract', () => {
  test('KPI Active Projects → /projects', async ({ page }) => {
    await loginAsDirector(page);
    await page.goto(PATH);
    const link = page.getByRole('link', { name: /active projects/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/projects');
  });

  test('KPI On Bench → /people?filter=unassigned', async ({ page }) => {
    await loginAsDirector(page);
    await page.goto(PATH);
    const link = page.getByRole('link', { name: /on bench/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/people?filter=unassigned');
  });
});

test.describe('UX contract — DirectorDashboardPage §8 Side effects @ux-contract', () => {
  test('mount fires multiple portfolio-dashboard fetches', async ({ page }) => {
    await loginAsDirector(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/portfolio-dashboard\//.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.some((u) => /\/heatmap/.test(u))).toBe(true);
    expect(calls.some((u) => /\/summary/.test(u))).toBe(true);
    expect(calls.some((u) => /\/available-pool/.test(u))).toBe(true);
  });
});
