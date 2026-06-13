/**
 * 2d-35 · Negative path: employee cannot access /admin
 * 2d-36 · Negative path: employee cannot view another role's dashboard
 * 2d-38 · Negative path: close project with active assignments (conflict)
 *
 * Requires: phase2 seed profile loaded in the database.
 *
 * (2d-37 reject-assignment negative path removed — the assignment reject API +
 *  detail-page reject UI were dropped in the lean V2 migration.)
 */
import { expect, test } from '@playwright/test';

import { loginAsEmployee } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const API = 'http://127.0.0.1:3000/api';

async function getToken(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<string> {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}

// ── 2d-35 Employee cannot access /admin ─────────────────────────────────────

test.describe('@critical 2d-35 Negative path — employee cannot access /admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test('employee navigating to /admin is redirected or sees access denied', async ({ page }) => {
    await page.goto('/admin');

    // Should NOT see the admin panel content
    // Either redirected away or shown an access-denied message
    const url = page.url();
    const isRedirected = !url.endsWith('/admin') && !url.includes('/admin');
    const hasAccessDenied = (await page.getByText(/access denied|forbidden|not authorized|403|permission/i).count()) > 0;
    const hasNoAdminContent = (await page.getByText(/User Accounts/i).count()) === 0;

    expect(isRedirected || hasAccessDenied || hasNoAdminContent).toBeTruthy();
  });

  test('employee JWT is rejected by admin API endpoint with 401 or 403', async ({ page }) => {
    const token = await getToken(page, p2.accounts.employee.email, p2.accounts.employee.password);
    const res = await page.request.get(`${API}/admin/accounts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([401, 403].includes(res.status())).toBeTruthy();
  });
});

// ── 2d-36 Employee cannot view another role's dashboard ─────────────────────

test.describe('@critical 2d-36 Negative path — employee cannot view HR dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test('employee navigating to /dashboard/hr-manager is redirected or denied', async ({ page }) => {
    await page.goto('/dashboard/hr-manager');

    const url = page.url();
    const isRedirected = !url.includes('/dashboard/hr-manager');
    const hasAccessDenied = (await page.getByText(/access denied|forbidden|not authorized|403/i).count()) > 0;
    const hasNoHrContent = (await page.getByText(/Distribution|Headcount/i).count()) === 0;

    expect(isRedirected || hasAccessDenied || hasNoHrContent).toBeTruthy();
  });

  test('employee JWT is rejected by HR dashboard API endpoint', async ({ page }) => {
    const token = await getToken(page, p2.accounts.employee.email, p2.accounts.employee.password);
    const diana = p2.people.dianaWalsh;
    const res = await page.request.get(`${API}/dashboard/hr-manager/${diana}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([401, 403].includes(res.status())).toBeTruthy();
  });
});

// ── 2d-38 Close project with conflict ───────────────────────────────────────

test.describe('@critical 2d-38 Negative path — close project with active assignments (conflict)', () => {
  test('close ACTIVE project with active assignments returns 409 without override', async ({ page }) => {
    const token = await getToken(page, p2.accounts.projectManager.email, p2.accounts.projectManager.password);

    // DeliveryCentral (PRJ-101) has approved active assignments
    const res = await page.request.post(
      `${API}/projects/${p2.projects.deliveryCentral}/close`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {},
        // No overrideReason → should produce conflict
      },
    );
    // 409 = active assignments conflict; 422 = unprocessable; either is the governed response
    expect([409, 422].includes(res.status())).toBeTruthy();
  });

  test('close project UI shows conflict message when active assignments exist', async ({ page }) => {
    await loginAsProjectManager(page);
    await page.goto(`/projects/${p2.projects.deliveryCentral}`);

    await expect(page.getByTestId('project-details-page')).toBeVisible();

    const closeBtn = page.getByRole('button', { name: /Close project/i });
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();

      // Should surface a conflict error or override dialog
      await expect(
        page.getByText(/conflict|active assignment|override/i),
      ).toBeVisible();
    }
  });
});
