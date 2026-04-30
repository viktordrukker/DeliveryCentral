/**
 * UX Contract regression — EmployeeDetailsPlaceholderPage
 * Mirrors: docs/planning/ux-contracts/EmployeeDetailsPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin, loginAsEmployee, loginAsHrManager } from '../fixtures/auth';

async function openFirstPerson(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/people');
  const firstRow = page.locator('.data-table__row--interactive').first();
  if (await firstRow.count() === 0) test.skip();
  await firstRow.click();
  await page.waitForURL(/\/people\/[^/]+/);
  const m = page.url().match(/\/people\/([^/?#]+)/);
  if (!m) test.skip();
  return m![1];
}

test.describe('UX contract — EmployeeDetailsPage §1 Route & Roles @ux-contract', () => {
  test('admin can open a person detail page', async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstPerson(page);
  });

  test('Deactivate / Terminate hidden from employee', async ({ page }) => {
    await loginAsEmployee(page);
    await openFirstPerson(page);
    await expect(page.getByRole('button', { name: /deactivate employee/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /terminate employee/i })).toHaveCount(0);
  });

  test('Deactivate / Terminate visible to hr_manager', async ({ page }) => {
    await loginAsHrManager(page);
    await openFirstPerson(page);
    await expect(page.getByRole('button', { name: /deactivate employee/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /terminate employee/i }).first()).toBeVisible();
  });
});

test.describe('UX contract — EmployeeDetailsPage §2 Click paths / §6 Filters @ux-contract', () => {
  test('?tab= URL param round-trips via reload', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await openFirstPerson(page);
    await page.goto(`/people/${id}?tab=skills`);
    await page.reload();
    await expect(page).toHaveURL(/[?&]tab=skills/);
  });
});

test.describe('UX contract — EmployeeDetailsPage §4 Confirmation prompts @ux-contract', () => {
  test('"Deactivate" opens ConfirmDialog with expected copy', async ({ page }) => {
    await loginAsHrManager(page);
    await openFirstPerson(page);
    const btn = page.getByRole('button', { name: /deactivate employee/i }).first();
    if (await btn.isDisabled()) test.skip();
    await btn.click();
    await expect(page.getByText(/will lose access to the system but their history is preserved/i)).toBeVisible();
    // Cancel out without taking action
    await page.getByRole('button', { name: /cancel/i }).first().click();
  });

  test('"Terminate" opens ConfirmDialog with expected copy', async ({ page }) => {
    await loginAsHrManager(page);
    await openFirstPerson(page);
    const btn = page.getByRole('button', { name: /terminate employee/i }).first();
    if (await btn.isDisabled()) test.skip();
    await btn.click();
    await expect(page.getByText(/permanent and cannot be reversed/i)).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).first().click();
  });
});

test.describe('UX contract — EmployeeDetailsPage §5 Toasts @ux-contract', () => {
  test('page does not emit toasts on mount', async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstPerson(page);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });
});
