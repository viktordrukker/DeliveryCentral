/**
 * UX Contract regression — CasesPage
 * Mirrors: docs/planning/ux-contracts/CasesPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin } from '../fixtures/auth';

const PATH = '/cases';

test.describe('UX contract — CasesPage §6 Filters & state @ux-contract', () => {
  test('filter URL params round-trip via reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${PATH}?caseTypeKey=conduct`);
    await page.reload();
    await expect(page).toHaveURL(/[?&]caseTypeKey=conduct/);
  });
});

test.describe('UX contract — CasesPage §7 States @ux-contract', () => {
  test('empty state shows "No cases open" with Create Case action', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/cases*', (route) =>
      route.fulfill({ status: 200, body: '[]', contentType: 'application/json' }),
    );
    await page.goto(PATH);
    await expect(page.getByText(/no cases open/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /create case/i })).toHaveAttribute('href', '/cases/new');
  });
});

test.describe('UX contract — CasesPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/cases', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/cases(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
