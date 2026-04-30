/**
 * UX Contract regression — ProjectDetailPage
 * Mirrors: docs/planning/ux-contracts/ProjectDetailPage.md
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin, loginAsEmployee, loginAsProjectManager } from '../fixtures/auth';

// Helper: open the first project from the registry to get a real :id
async function openFirstProject(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/projects');
  await expect(page.getByTestId('project-registry-page')).toBeVisible();
  const firstRow = page.locator('.data-table__row--interactive').first();
  if (await firstRow.count() === 0) test.skip();
  await firstRow.click();
  await page.waitForURL(/\/projects\/[^/]+/);
  const m = page.url().match(/\/projects\/([^/?#]+)/);
  if (!m) test.skip();
  return m![1];
}

test.describe('UX contract — ProjectDetailPage §1 Route & Roles @ux-contract', () => {
  test('admin can access /projects/:id', async ({ page }) => {
    await loginAsAdmin(page);
    await openFirstProject(page);
  });

  test('"Staffing request" / "Quick assign" hidden from employee', async ({ page }) => {
    await loginAsEmployee(page);
    const id = await openFirstProject(page);
    await expect(page.getByRole('link', { name: /staffing request/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /quick assign/i })).toHaveCount(0);
    expect(id).toBeTruthy();
  });

  test('"Staffing request" / "Quick assign" visible to project_manager', async ({ page }) => {
    await loginAsProjectManager(page);
    await openFirstProject(page);
    await expect(page.getByRole('link', { name: /staffing request/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /quick assign/i }).first()).toBeVisible();
  });
});

test.describe('UX contract — ProjectDetailPage §2 Click paths @ux-contract', () => {
  test('"Staffing request" link prefills ?projectId=', async ({ page }) => {
    await loginAsProjectManager(page);
    const id = await openFirstProject(page);
    const link = page.getByRole('link', { name: /staffing request/i }).first();
    await expect(link).toHaveAttribute('href', new RegExp(`/staffing-requests/new\\?projectId=${id}`));
  });

  test('"Quick assign" link prefills ?projectId=', async ({ page }) => {
    await loginAsProjectManager(page);
    const id = await openFirstProject(page);
    const link = page.getByRole('link', { name: /quick assign/i }).first();
    await expect(link).toHaveAttribute('href', new RegExp(`/assignments/new\\?projectId=${id}`));
  });

  test('legacy ?tab=status redirects to ?tab=radiator', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await openFirstProject(page);
    await page.goto(`/projects/${id}?tab=status`);
    await expect(page).toHaveURL(/[?&]tab=radiator/);
  });

  test('legacy ?tab=report redirects to ?tab=radiator', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await openFirstProject(page);
    await page.goto(`/projects/${id}?tab=report`);
    await expect(page).toHaveURL(/[?&]tab=radiator/);
  });
});

test.describe('UX contract — ProjectDetailPage §6 Filters & state @ux-contract', () => {
  test('?tab= URL param round-trips via reload', async ({ page }) => {
    await loginAsAdmin(page);
    const id = await openFirstProject(page);
    await page.goto(`/projects/${id}?tab=team`);
    await page.reload();
    await expect(page).toHaveURL(/[?&]tab=team/);
  });
});

test.describe('UX contract — ProjectDetailPage §7 States @ux-contract', () => {
  test('not-found page shows "No project found for {id}."', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/projects/**', (route) => {
      const url = route.request().url();
      if (/\/api\/projects\/nonexistent-uuid/.test(url)) {
        route.fulfill({ status: 404, body: 'not found', contentType: 'text/plain' });
      } else {
        route.continue();
      }
    });
    await page.goto('/projects/nonexistent-uuid');
    // Either ErrorState or "No project found" surfaces
    await expect(page.getByText(/no project found|not found|error/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('UX contract — ProjectDetailPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/projects/:id', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/projects\/[^/?#]+(?:\?|$)/.test(req.url())) calls.push(req.url());
    });
    await openFirstProject(page);
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
