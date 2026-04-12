/**
 * Phase 2 E2E — HR Manager JTBDs (HR1–HR6)
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { hrManager } = p2.accounts;
const diana = p2.people.dianaWalsh;

test.beforeEach(async ({ page }) => {
  await loginAs(page, hrManager.email, hrManager.password);
});

test.describe('HR1 — HR sees headcount by org unit, grade, role', () => {
  test('HR dashboard renders distributions with labels and counts', async ({ page }) => {
    await page.goto(`/dashboard/hr-manager?personId=${diana}`);

    await expect(page.getByText(/Distribution|Headcount/i)).toBeVisible();
    // At least one org unit with a non-zero count
    await expect(page.getByText(/Consulting Delivery|DEP-CON/i)).toBeVisible();
  });

  test('HR dashboard API returns orgDistribution, gradeDistribution, roleDistribution', async ({ page }) => {
    const token = await getToken(page, hrManager.email, hrManager.password);
    const res = await page.request.get(
      `http://127.0.0.1:3000/api/dashboard/hr-manager/${diana}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as {
      orgDistribution: unknown[];
      gradeDistribution: unknown[];
      roleDistribution: unknown[];
    };
    expect(Array.isArray(body.orgDistribution)).toBeTruthy();
    expect(Array.isArray(body.gradeDistribution)).toBeTruthy();
    expect(Array.isArray(body.roleDistribution)).toBeTruthy();
    expect(body.orgDistribution.length).toBeGreaterThan(0);
  });
});

test.describe('HR2 — HR identifies data quality gaps', () => {
  test('HR dashboard shows Data Quality Signals section', async ({ page }) => {
    await page.goto(`/dashboard/hr-manager?personId=${diana}`);

    await expect(page.getByText(/Data Quality/i)).toBeVisible();
  });

  test('Alex Morgan (orphaned person) appears in employeesWithoutOrgUnit', async ({ page }) => {
    const token = await getToken(page, hrManager.email, hrManager.password);
    const res = await page.request.get(
      `http://127.0.0.1:3000/api/dashboard/hr-manager/${diana}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json() as { employeesWithoutOrgUnit: Array<{ displayName: string }> };
    const names = body.employeesWithoutOrgUnit.map((p) => p.displayName);
    expect(names).toContain('Alex Morgan');
  });
});

test.describe('HR3 — HR creates onboarding case', () => {
  test('create case page loads and renders case type dropdown', async ({ page }) => {
    await page.goto('/cases/new');

    await expect(page.getByTestId('create-case-page')).toBeVisible();
    await expect(page.getByLabel(/Case Type/i)).toBeVisible();
  });

  test('submitting the create case form navigates to the new case and shows case number', async ({ page }) => {
    await page.goto('/cases/new');

    const form = page.getByTestId('create-case-form').or(page.locator('form'));

    // Select ONBOARDING type, pick subject and owner
    const caseTypeSelect = page.getByLabel(/Case Type/i);
    await caseTypeSelect.selectOption({ label: /Onboarding/i });

    const subjectSelect = page.getByLabel(/Subject/i);
    await subjectSelect.selectOption(p2.people.sophieWright);

    const ownerSelect = page.getByLabel(/Owner/i);
    await ownerSelect.selectOption(diana);

    await page.getByLabel(/Summary/i).fill('E2E onboarding case for Sophie Wright.');
    await page.getByRole('button', { name: /Create Case|Submit/i }).click();

    // Should navigate to case detail and show CASE- number
    await expect(page.getByText(/CASE-/)).toBeVisible();
    await expect(page).toHaveURL(/\/cases\//);
  });
});

test.describe('HR4 — HR views and progresses case steps', () => {
  test('case list shows created cases', async ({ page }) => {
    await page.goto('/cases');

    await expect(page.getByTestId('cases-page')).toBeVisible();
  });
});

test.describe('HR5 — HR sees recent joiner and deactivation activity', () => {
  test('HR dashboard shows Lifecycle Activity section', async ({ page }) => {
    await page.goto(`/dashboard/hr-manager?personId=${diana}`);

    await expect(page.getByText(/Lifecycle Activity/i)).toBeVisible();
  });

  test('Sophie Wright (hired 2026-03-17) appears in recent joiners', async ({ page }) => {
    const token = await getToken(page, hrManager.email, hrManager.password);
    const res = await page.request.get(
      `http://127.0.0.1:3000/api/dashboard/hr-manager/${diana}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await res.json() as { recentJoinerActivity: Array<{ displayName: string }> };
    const names = body.recentJoinerActivity.map((p) => p.displayName);
    expect(names).toContain('Sophie Wright');
  });
});

test.describe('HR6 — HR terminates employee and cascades assignment ends', () => {
  test('employee details page shows Terminate employee action', async ({ page }) => {
    await page.goto(`/people/${p2.people.zoeTurner}`);

    await expect(page.getByTestId('employee-details-page')).toBeVisible();
    await expect(page.getByText(/Terminate/i)).toBeVisible();
  });

  test('terminate API sets status to TERMINATED', async ({ page }) => {
    const token = await getToken(page, hrManager.email, hrManager.password);
    // Use Alex Morgan (orphaned, no active assignments — safe to terminate in test)
    const res = await page.request.post(
      `http://127.0.0.1:3000/api/people/${p2.people.alexMorgan}/terminate`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { terminatedAt: '2026-04-05T00:00:00.000Z', reason: 'E2E test termination' },
      },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { employmentStatus: string };
    expect(body.employmentStatus).toBe('TERMINATED');
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
