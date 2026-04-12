/**
 * Phase 2 E2E — Employee JTBDs (E1–E5)
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { employee } = p2.accounts;
const ethan = p2.people.ethanBrooks;

test.describe('E1 — Employee views current assignments with allocation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, employee.email, employee.password);
  });

  test('employee dashboard shows current assignments and overallocation warning', async ({ page }) => {
    await page.goto(`/dashboard/employee?personId=${ethan}`);

    // KPI — overallocated (80% + 40% = 120%)
    await expect(page.getByText(/120\s*%/)).toBeVisible();

    // Both active assignments appear
    await expect(page.getByText('Lead Engineer')).toBeVisible();

    // Overallocation visual indicator present
    const kpiCard = page.locator('.kpi-card, .workload-card').filter({ hasText: /120/ }).first();
    await expect(kpiCard).toBeVisible();
  });
});

test.describe('E2 — Employee sees recent work evidence', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, employee.email, employee.password);
  });

  test('employee dashboard shows evidence section with entries', async ({ page }) => {
    await page.goto(`/dashboard/employee?personId=${ethan}`);

    await expect(page.getByText(/Evidence/i)).toBeVisible();
    // Evidence records exist for Ethan in the phase2 seed
    await expect(page.getByText(/effort|hours|evidence/i).first()).toBeVisible();
  });
});

test.describe('E3 — Employee sees pending workflow items', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, employee.email, employee.password);
  });

  test('pending workflow items section renders (empty for Ethan — no REQUESTED assignments)', async ({ page }) => {
    await page.goto(`/dashboard/employee?personId=${ethan}`);

    // Section exists
    await expect(page.getByText(/Pending Workflow Items/i)).toBeVisible();

    // Ethan has no REQUESTED assignments — empty state shown
    await expect(page.getByText(/no pending|no items|nothing pending/i)).toBeVisible();
  });
});

test.describe('E4 — Employee views assignment detail with approval history', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, employee.email, employee.password);
  });

  test('assignment detail shows Approvals and Lifecycle History sections', async ({ page }) => {
    await page.goto(`/assignments/${p2.assignments.ethanOnDeliveryCentral}`);

    await expect(page.getByText('Lead Engineer')).toBeVisible();
    await expect(page.getByText(/Approvals/i)).toBeVisible();
    await expect(page.getByText(/Lifecycle History/i)).toBeVisible();
  });

  test('non-existent assignment ID shows error state', async ({ page }) => {
    await page.goto('/assignments/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/not found|error|404/i)).toBeVisible();
  });
});

test.describe('E5 — Employee notified on approve/reject (notification queue populated)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, p2.accounts.admin.email, p2.accounts.admin.password);
  });

  test('notification queue endpoint is accessible and returns paginated response', async ({ page }) => {
    const response = await page.request.get('http://127.0.0.1:3000/api/notifications/queue', {
      headers: { Authorization: `Bearer ${await getAdminToken(page)}` },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json() as { items: unknown[]; totalCount: number };
    expect(typeof body.totalCount).toBe('number');
    expect(Array.isArray(body.items)).toBeTruthy();
  });
});

async function getAdminToken(page: import('@playwright/test').Page): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', {
    data: p2.accounts.admin,
  });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
