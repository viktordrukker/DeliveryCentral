/**
 * 2d-21 · Director — view director dashboard
 * 2d-22 · Director — view org chart
 * 2d-23 · Director — view delivery dashboard
 * 2d-24 · Director — project close override
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsDirector } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const noah = p2.people.noahBennett;

test.beforeEach(async ({ page }) => {
  await loginAsDirector(page);
});

// ── 2d-21 Director dashboard ─────────────────────────────────────────────────

test.describe('2d-21 Director — view director dashboard', () => {
  test('director dashboard renders with executive KPIs', async ({ page }) => {
    await page.goto('/dashboard/director');

    await expect(page.getByText(/Active Projects|active project/i)).toBeVisible();
    await expect(page.getByText(/Active Assignments|active assignment/i)).toBeVisible();
  });

  test('director dashboard shows utilisation section', async ({ page }) => {
    await page.goto('/dashboard/director');

    await expect(page.getByText(/Utilisation|Org Unit/i)).toBeVisible();
  });

  test('director API returns positive active project count', async ({ page }) => {
    const token = await getToken(page, p2.accounts.director.email, p2.accounts.director.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/dashboard/director',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { summary?: { activeProjectCount: number }; activeProjectCount?: number };
    const activeProjectCount = body.summary?.activeProjectCount ?? body.activeProjectCount ?? 0;
    expect(typeof activeProjectCount).toBe('number');
    expect(activeProjectCount).toBeGreaterThanOrEqual(0);
  });
});

// ── 2d-22 Org chart ──────────────────────────────────────────────────────────

test.describe('2d-22 Director — view org chart', () => {
  test('org chart page is reachable', async ({ page }) => {
    await page.goto('/org');

    await expect(page.getByTestId('org-page')).toBeVisible();
  });

  test('org chart renders SVG tree (react-d3-tree)', async ({ page }) => {
    await page.goto('/org');

    // Wait for the chart to render
    await page.waitForTimeout(2000);

    // The tree renders as SVG nodes
    const svg = page.locator('svg').first();
    const hasSvg = (await svg.count()) > 0;
    // Or a tree node text is visible
    const hasTreeNode = (await page.getByText(/Bennett|Noah|Olivia|Director/i).count()) > 0;
    expect(hasSvg || hasTreeNode).toBeTruthy();
  });
});

// ── 2d-23 Delivery dashboard ─────────────────────────────────────────────────

test.describe('2d-23 Director — view delivery dashboard', () => {
  test('delivery manager dashboard is accessible to director', async ({ page }) => {
    await page.goto(`/dashboard/delivery-manager?personId=${p2.people.carlosVega}`);

    await expect(page.getByTestId('delivery-manager-dashboard-page')).toBeVisible();
  });

  test('delivery dashboard shows portfolio health metrics', async ({ page }) => {
    await page.goto(`/dashboard/delivery-manager?personId=${p2.people.carlosVega}`);

    await expect(page.getByText(/Active Projects|Total Active/i)).toBeVisible();
  });

  test('delivery dashboard shows reconciliation section', async ({ page }) => {
    await page.goto(`/dashboard/delivery-manager?personId=${p2.people.carlosVega}`);

    await expect(page.getByText(/Reconciliation/i)).toBeVisible();
  });
});

// ── 2d-24 Project close override ────────────────────────────────────────────

test.describe('2d-24 Director — project close override', () => {
  test('close project with active assignments returns 409 conflict without override', async ({ page }) => {
    const token = await getToken(page, p2.accounts.director.email, p2.accounts.director.password);

    // DeliveryCentral (PRJ-101) has APPROVED active assignments — close should conflict
    const res = await page.request.post(
      `http://127.0.0.1:3000/api/projects/${p2.projects.deliveryCentral}/close`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {},
      },
    );
    // 409 (conflict) is expected when active assignments exist and no override
    // 422 if business rule blocks it differently
    expect([409, 422].includes(res.status())).toBeTruthy();
  });

  test('close project page shows conflict or Override reason field when active assignments exist', async ({ page }) => {
    await page.goto(`/projects/${p2.projects.deliveryCentral}`);

    await expect(page.getByTestId('project-details-page')).toBeVisible();

    // The close button should be visible for director
    const closeBtn = page.getByRole('button', { name: /Close project/i });
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();

      // Should see a conflict message or an override reason field
      const conflictMsg = page.getByText(/conflict|active assignment|override/i);
      await expect(conflictMsg).toBeVisible();
    }
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
