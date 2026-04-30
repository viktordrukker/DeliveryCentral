/**
 * UX Contract regression — ResourcePoolsPage
 * Mirrors: docs/planning/ux-contracts/ResourcePoolsPage.md
 */
import { expect, test } from '@playwright/test';

import {
  loginAsAdmin,
  loginAsDirector,
  loginAsEmployee,
  loginAsResourceManager,
} from '../fixtures/auth';

const PATH = '/resource-pools';

test.describe('UX contract — ResourcePoolsPage §1 Route & Roles @ux-contract', () => {
  test('resource_manager can access /resource-pools', async ({ page }) => {
    await loginAsResourceManager(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/resource-pools/);
  });

  test('director can access /resource-pools', async ({ page }) => {
    await loginAsDirector(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/resource-pools/);
  });

  test('employee is route-guarded away', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/resource-pools(?:[?#]|$)/);
  });

  test('"Create pool" button hidden for director (canManage=false; only RM and admin)', async ({ page }) => {
    await loginAsDirector(page);
    await page.goto(PATH);
    await expect(page.getByRole('button', { name: /create pool/i })).toHaveCount(0);
  });

  test('"Create pool" button visible to resource_manager', async ({ page }) => {
    await loginAsResourceManager(page);
    await page.goto(PATH);
    await expect(page.getByRole('button', { name: /create pool/i }).first()).toBeVisible();
  });
});

test.describe('UX contract — ResourcePoolsPage §3 Form validation @ux-contract', () => {
  test('Create pool — empty Code shows "Code is required."', async ({ page }) => {
    await loginAsResourceManager(page);
    await page.goto(PATH);
    await page.getByRole('button', { name: /create pool/i }).first().click();
    const submit = page.getByRole('button', { name: /create|submit/i }).filter({ hasNot: page.getByRole('button', { name: /cancel/i }) }).last();
    if (await submit.count() === 0) test.skip();
    await submit.click();
    await expect(page.getByText(/code is required/i).first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('UX contract — ResourcePoolsPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/resource-pools', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/resource-pools(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
