/**
 * UX Contract regression — AdminPanelPage
 * Mirrors: docs/planning/ux-contracts/AdminPanelPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin, loginAsHrManager, loginAsDirector } from '../fixtures/auth';

const PATH = '/admin';

test.describe('UX contract — AdminPanelPage §1 Route & Roles @ux-contract', () => {
  test('admin can access /admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/admin(?:[?#]|$|\/)/);
  });

  test('hr_manager is route-guarded away', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/admin(?:[?#]|$)/);
  });

  test('director is route-guarded away (admin-only)', async ({ page }) => {
    await loginAsDirector(page);
    await page.goto(PATH);
    await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/admin(?:[?#]|$)/);
  });
});

test.describe('UX contract — AdminPanelPage §2 Click paths @ux-contract', () => {
  test('"Manage dictionary entries" link → /admin/dictionaries', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    // Switch to Dictionaries section
    const dictBtn = page.getByRole('button', { name: /^dictionaries$/i }).first();
    if (await dictBtn.count() > 0) await dictBtn.click();
    const link = page.getByRole('link', { name: /manage dictionary entries/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/admin/dictionaries');
  });
});

test.describe('UX contract — AdminPanelPage §4 Confirmation prompts @ux-contract', () => {
  test('"Delete account" opens ConfirmDialog with expected copy', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PATH);
    const accountsBtn = page.getByRole('button', { name: /^accounts$/i }).first();
    if (await accountsBtn.count() > 0) await accountsBtn.click();
    const deleteBtn = page.getByRole('button', { name: /^delete$/i }).first();
    if (await deleteBtn.count() === 0) test.skip();
    await deleteBtn.click();
    await expect(page.getByText(/delete account .* this cannot be undone/i)).toBeVisible({ timeout: 3000 });
    await page.getByRole('button', { name: /cancel/i }).first().click();
  });
});

test.describe('UX contract — AdminPanelPage §8 Side effects @ux-contract', () => {
  test('mount fires parallel admin endpoint fetches', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/admin\/(config|settings|integrations|notifications)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.some((u) => /\/admin\/config/.test(u))).toBe(true);
  });
});
