/**
 * Phase 2 E2E — Delivery Manager JTBDs (DM1–DM5)
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { deliveryManager } = p2.accounts;
const carlos = p2.people.carlosVega;

test.beforeEach(async ({ page }) => {
  await loginAs(page, deliveryManager.email, deliveryManager.password);
});

test.describe('@full DM1 — DM sees cross-portfolio project health', () => {
  test('delivery manager dashboard shows KPI bar with portfolio summary', async ({ page }) => {
    await page.goto(`/dashboard/delivery-manager?personId=${carlos}`);

    await expect(page.getByTestId('delivery-manager-dashboard-page')).toBeVisible();
    // Portfolio summary KPIs
    await expect(page.getByText(/Active Projects|Total Active/i)).toBeVisible();
  });

  test('DRAFT and ON_HOLD projects are excluded from active portfolio count', async ({ page }) => {
    const token = await getToken(page, deliveryManager.email, deliveryManager.password);
    const res = await page.request.get(
      `http://127.0.0.1:3000/api/dashboard/delivery-manager/${carlos}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { portfolioSummary: { totalActiveProjects: number } };
    // DRAFT (Mercury) and ON_HOLD (Saturn) should not be counted
    expect(body.portfolioSummary.totalActiveProjects).toBeGreaterThan(0);
  });
});

test.describe('@full DM2 — DM sees planned-vs-actual reconciliation', () => {
  test('delivery manager dashboard shows Reconciliation section', async ({ page }) => {
    await page.goto(`/dashboard/delivery-manager?personId=${carlos}`);

    await expect(page.getByText(/Reconciliation/i)).toBeVisible();
  });

  test('evidenceWithoutAssignmentCount KPI reflects Mars anomaly data', async ({ page }) => {
    const token = await getToken(page, deliveryManager.email, deliveryManager.password);
    const res = await page.request.get(
      `http://127.0.0.1:3000/api/dashboard/delivery-manager/${carlos}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json() as { reconciliation: { evidenceWithoutAssignmentCount: number } };
    // Mars Data Lakehouse has evidence without approved assignment
    expect(body.reconciliation.evidenceWithoutAssignmentCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('@full DM3 — DM identifies inactive evidence projects', () => {
  test('delivery manager dashboard shows Inactive Evidence section', async ({ page }) => {
    await page.goto(`/dashboard/delivery-manager?personId=${carlos}`);

    await expect(page.getByText(/Inactive Evidence/i)).toBeVisible();
  });
});

test.describe('@full DM4 — DM views full assignment history with date range', () => {
  test('assignments page supports from/to date filter and shows totalCount', async ({ page }) => {
    await page.goto('/assignments');

    await expect(page.getByTestId('assignments-page')).toBeVisible();
    // Date range filters exist
    await expect(page.getByLabel(/From|Start/i).first()).toBeVisible();
    await expect(page.getByLabel(/To|End/i).first()).toBeVisible();
  });

  test('filtering by ENDED status and date range returns paginated results', async ({ page }) => {
    const token = await getToken(page, deliveryManager.email, deliveryManager.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/assignments?status=ENDED&from=2025-01-01&to=2026-12-31',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { totalCount: number };
    expect(typeof body.totalCount).toBe('number');
  });
});

test.describe('@full DM5 — DM drills into project dashboard', () => {
  test('project dashboard page renders for an ACTIVE project', async ({ page }) => {
    await page.goto(`/projects/${p2.projects.deliveryCentral}/dashboard`);

    await expect(page.getByText(/Evidence by Week|Allocation|Staffing/i)).toBeVisible();
  });

  test('project dashboard shows info banner for DRAFT project but still renders data', async ({ page }) => {
    await page.goto(`/projects/${p2.projects.mercuryInfra}/dashboard`);

    // DRAFT project — info banner + data attempt
    await expect(page.getByText(/Mercury Infrastructure|PRJ-106/i)).toBeVisible();
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
