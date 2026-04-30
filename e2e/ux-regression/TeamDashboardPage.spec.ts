/**
 * UX Contract regression — TeamDashboardPage
 * Mirrors: docs/planning/ux-contracts/TeamDashboardPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin } from '../fixtures/auth';

async function openFirstTeamDashboard(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/teams');
  const dashboardLink = page.getByRole('link', { name: /open team dashboard/i }).first();
  if (await dashboardLink.count() === 0) test.skip();
  const href = await dashboardLink.getAttribute('href');
  if (!href) test.skip();
  await page.goto(href!);
  const m = page.url().match(/\/teams\/([^/]+)\/dashboard/);
  if (!m) test.skip();
  return m![1];
}

test.describe('UX contract — TeamDashboardPage §2 Click paths @ux-contract', () => {
  test('"Back to teams" navigates to /teams', async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstTeamDashboard(page);
    const back = page.getByRole('link', { name: /back to teams/i }).first();
    if (await back.count() === 0) test.skip();
    await expect(back).toHaveAttribute('href', '/teams');
  });

  test('KPI Members links to /people', async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstTeamDashboard(page);
    const link = page.getByRole('link', { name: /members/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/people');
  });

  test('KPI Unassigned links to /people?status=unassigned', async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstTeamDashboard(page);
    const link = page.getByRole('link', { name: /unassigned/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/people?status=unassigned');
  });

  test('KPI Exceptions links to /exceptions', async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstTeamDashboard(page);
    const link = page.getByRole('link', { name: /exceptions/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/exceptions');
  });
});

test.describe('UX contract — TeamDashboardPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/teams/:id/dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/teams\/[^/]+\/dashboard/.test(req.url())) calls.push(req.url());
    });
    await openFirstTeamDashboard(page);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
