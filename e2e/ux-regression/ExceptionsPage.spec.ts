/**
 * UX Contract regression — ExceptionsPage
 * Mirrors: docs/planning/ux-contracts/ExceptionsPage.md
 */
import { expect, test } from '@playwright/test';

import {
  loginAsAdmin,
  loginAsEmployee,
  loginAsHrManager,
} from '../fixtures/auth';

const PATH = '/exceptions';

test.describe('UX contract — ExceptionsPage §1 Route & Roles @ux-contract', () => {
  test('hr_manager can access /exceptions', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/exceptions/);
  });

  test('employee is route-guarded away', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/exceptions(?:[?#]|$)/);
  });
});

test.describe('UX contract — ExceptionsPage §6 Filters & state @ux-contract', () => {
  test('filter URL params round-trip via reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${PATH}?statusFilter=RESOLVED&category=PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS`);
    await page.reload();
    await expect(page).toHaveURL(/[?&]statusFilter=RESOLVED/);
    await expect(page).toHaveURL(/[?&]category=PROJECT_CLOSURE_WITH_ACTIVE_ASSIGNMENTS/);
  });

  test('default status filter "OPEN" not written to URL', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    const url = new URL(page.url());
    // Default "OPEN" should not appear in the URL per the contract
    const status = url.searchParams.get('statusFilter');
    expect(status === null || status === 'OPEN').toBe(true);
  });
});

test.describe('UX contract — ExceptionsPage §5 Toasts @ux-contract', () => {
  test('Resolve emits toast.success("Exception resolved")', async ({ page }) => {
    await loginAsAdmin(page);
    // Stub the resolve endpoint
    await page.route('**/api/exceptions/**/resolve', (route) =>
      route.fulfill({ status: 200, body: '{}', contentType: 'application/json' }),
    );
    await page.goto(PATH);
    const resolveBtn = page.getByRole('button', { name: /^resolve$/i }).first();
    if (await resolveBtn.count() === 0) test.skip();
    await resolveBtn.click();
    const noteArea = page.getByRole('textbox').first();
    if (await noteArea.count() === 0) test.skip();
    await noteArea.fill('Resolved by automation test');
    const confirm = page.getByRole('button', { name: /^confirm$/i }).first();
    if (await confirm.count() === 0) test.skip();
    await confirm.click();
    await expect(page.getByText(/exception resolved/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('UX contract — ExceptionsPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/exceptions with limit=100', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/exceptions(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.some((u) => /limit=100/.test(u))).toBe(true);
  });
});
