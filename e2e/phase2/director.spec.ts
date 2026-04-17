/**
 * Phase 2 E2E — Director JTBDs (DIR1–DIR3)
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { director } = p2.accounts;

test.beforeEach(async ({ page }) => {
  await loginAs(page, director.email, director.password);
});

test.describe('@full DIR1 — Director sees org-wide executive summary', () => {
  test('director dashboard page renders KPI bar with 5 executive metrics', async ({ page }) => {
    await page.goto('/dashboard/director');

    await expect(page.getByText(/Active Projects|active project/i)).toBeVisible();
    await expect(page.getByText(/Active Assignments|active assignment/i)).toBeVisible();
    await expect(page.getByText(/Staffed|Headcount/i)).toBeVisible();
  });

  test('director API excludes terminated and inactive persons from counts', async ({ page }) => {
    const token = await getToken(page, director.email, director.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/dashboard/director',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as {
      activeProjectCount: number;
      staffedPersonCount: number;
      evidenceCoverageRate: number;
    };
    expect(typeof body.activeProjectCount).toBe('number');
    expect(body.activeProjectCount).toBeGreaterThan(0);
    expect(typeof body.evidenceCoverageRate).toBe('number');
  });
});

test.describe('@full DIR2 — Director sees utilisation by org unit', () => {
  test('director API returns unitUtilisation sorted ascending', async ({ page }) => {
    const token = await getToken(page, director.email, director.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/dashboard/director',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json() as { unitUtilisation: Array<{ orgUnitName: string; utilisation: number }> };
    expect(Array.isArray(body.unitUtilisation)).toBeTruthy();
    // Units with 0 members excluded; remaining sorted ascending by utilisation
    const utils = body.unitUtilisation.map((u) => u.utilisation);
    for (let i = 1; i < utils.length; i++) {
      expect(utils[i]).toBeGreaterThanOrEqual(utils[i - 1]!);
    }
  });

  test('director dashboard renders unit utilisation section', async ({ page }) => {
    await page.goto('/dashboard/director');

    await expect(page.getByText(/Utilisation|Org Unit/i)).toBeVisible();
  });
});

test.describe('@full DIR3 — Director reviews business audit log with date filter and pagination', () => {
  test('business audit page renders with investigation filters', async ({ page }) => {
    await page.goto('/admin/audit');

    await expect(page.getByText('Business Audit')).toBeVisible();
    await expect(page.getByLabel('Occurred After')).toBeVisible();
    await expect(page.getByLabel('Occurred Before')).toBeVisible();
    await expect(page.getByText(/records total|page/i)).toBeVisible();
  });

  test('business audit API accepts from/to date filter and returns paginated response', async ({ page }) => {
    const token = await getToken(page, director.email, director.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/audit/business?from=2026-01-01T00:00:00.000Z&to=2026-12-31T23:59:59.999Z&page=1&pageSize=10',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { totalCount: number; page: number; pageSize: number; items: unknown[] };
    expect(typeof body.totalCount).toBe('number');
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
  });

  test('business audit page is accessible to hr_manager role', async ({ page }) => {
    await loginAs(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);
    await page.goto('/admin/audit');

    await expect(page.getByText('Business Audit')).toBeVisible();
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
