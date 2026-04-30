/**
 * UX Contract regression — PlannedVsActualPage
 * Mirrors: docs/planning/ux-contracts/PlannedVsActualPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsEmployee, loginAsAdmin } from '../fixtures/auth';

const PATH = '/dashboard/planned-vs-actual';

test.describe('UX contract — PlannedVsActualPage §1 Route & Roles @ux-contract', () => {
  test('admin can access /dashboard/planned-vs-actual', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/dashboard\/planned-vs-actual/);
  });

  test('employee is route-guarded away', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/\/dashboard\/planned-vs-actual/);
  });
});

test.describe('UX contract — PlannedVsActualPage §8 Side effects @ux-contract', () => {
  test('mount fires POST /api/planned-vs-actual and GET /api/overtime-summary', async ({ page }) => {
    await loginAsAdmin(page);
    const pvaCalls: string[] = [];
    const overtimeCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/planned-vs-actual/.test(url)) pvaCalls.push(url);
      if (/\/api\/overtime-summary/.test(url)) overtimeCalls.push(url);
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(pvaCalls.length).toBeGreaterThanOrEqual(1);
    expect(overtimeCalls.length).toBeGreaterThanOrEqual(1);
  });

  test('overtime fetch includes weeks param', async ({ page }) => {
    await loginAsAdmin(page);
    const overtimeCalls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/overtime-summary/.test(req.url())) overtimeCalls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(overtimeCalls.some((u) => /weeks=/.test(u))).toBe(true);
  });
});
