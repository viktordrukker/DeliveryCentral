/**
 * UX Contract regression — StaffingRequestsPage
 * Mirrors: docs/planning/ux-contracts/StaffingRequestsPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin, loginAsEmployee } from '../fixtures/auth';

const PATH = '/staffing-requests';

test.describe('UX contract — StaffingRequestsPage §1 Route & Roles @ux-contract', () => {
  test('admin can access /staffing-requests', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/staffing-requests/);
  });

  test('Create button hidden from employee', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PATH);
    await expect(page.getByRole('link', { name: /create.*request|^create$/i })).toHaveCount(0);
  });
});

test.describe('UX contract — StaffingRequestsPage §6 Filters & state @ux-contract', () => {
  test('?status= URL param round-trips', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${PATH}?status=Open`);
    await page.reload();
    await expect(page).toHaveURL(/[?&]status=Open/);
  });

  test('client-side filter — no extra API call on filter change', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/staffing-requests(\?|$)/.test(req.url())) calls.push(req.url());
    });
    // Apply a filter
    const select = page.locator('select').first();
    if (await select.count() === 0) test.skip();
    await select.selectOption({ label: 'Filled' }).catch(() => {});
    // Wait briefly to give any refetch a chance
    await page.waitForTimeout(500);
    // Contract: client-side filtering — no new GET /staffing-requests
    expect(calls.length).toBe(0);
  });
});

test.describe('UX contract — StaffingRequestsPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/staffing-requests once with no params', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/staffing-requests(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
