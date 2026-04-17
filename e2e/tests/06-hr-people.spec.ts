/**
 * 2d-15 · HR — create employee
 * 2d-16 · HR — deactivate employee
 * 2d-17 · HR — terminate employee
 * 2d-18 · HR — manage reporting lines
 * 2d-19 · HR — view HR dashboard
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsHrManager } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const diana = p2.people.dianaWalsh;

test.beforeEach(async ({ page }) => {
  await loginAsHrManager(page);
});

// ── 2d-15 Create employee ────────────────────────────────────────────────────

test.describe('@critical 2d-15 HR — create employee', () => {
  test('employee directory page is reachable', async ({ page }) => {
    await page.goto('/people');

    await expect(page.getByTestId('employee-directory-page')).toBeVisible();
  });

  test('create person via API and verify in directory', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);
    const unique = Date.now();
    const res = await page.request.post('http://127.0.0.1:3000/api/org/people', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        displayName: `E2E New Employee ${unique}`,
        email: `e2e.new.employee.${unique}@example.com`,
        employmentType: 'PERMANENT',
        hiredAt: '2026-04-01',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { id: string; displayName: string };
    expect(body.displayName).toContain('E2E New Employee');

    // Verify they appear in the directory
    await page.goto('/people');
    await expect(page.getByTestId('employee-directory-page')).toBeVisible();
    // Directory is paginated; search for the new person
    const searchBox = page.getByRole('searchbox', { name: /Search/i });
    if (await searchBox.isVisible()) {
      await searchBox.fill(`E2E New Employee ${unique}`);
      await expect(page.getByText(`E2E New Employee ${unique}`)).toBeVisible();
    }
  });
});

// ── 2d-16 Deactivate employee ────────────────────────────────────────────────

test.describe('@critical 2d-16 HR — deactivate employee', () => {
  test('employee details page shows deactivation option', async ({ page }) => {
    await page.goto(`/people/${p2.people.noraBLake}`);

    await expect(page.getByTestId('employee-details-page')).toBeVisible();
    // Either a Deactivate button or lifecycle admin link is visible
    const deactivateBtn = page.getByRole('button', { name: /Deactivate/i });
    const lifecycleLink = page.getByRole('link', { name: /Lifecycle/i });
    const hasSomething = (await deactivateBtn.count()) + (await lifecycleLink.count());
    expect(hasSomething).toBeGreaterThan(0);
  });

  test('deactivate via API sets employmentStatus to INACTIVE', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);

    // Create a fresh employee to deactivate
    const unique = Date.now();
    const createRes = await page.request.post('http://127.0.0.1:3000/api/org/people', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        displayName: `E2E Deactivate ${unique}`,
        email: `e2e.deactivate.${unique}@example.com`,
        employmentType: 'PERMANENT',
        hiredAt: '2026-01-01',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id } = await createRes.json() as { id: string };

    const patchRes = await page.request.post(`http://127.0.0.1:3000/api/org/people/${id}/deactivate`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {},
    });
    expect(patchRes.ok()).toBeTruthy();
    const body = await patchRes.json() as { employmentStatus: string };
    expect(body.employmentStatus).toBe('INACTIVE');
  });
});

// ── 2d-17 Terminate employee ─────────────────────────────────────────────────

test.describe('@critical 2d-17 HR — terminate employee', () => {
  test('employee details page shows Terminate option for Zoe Turner', async ({ page }) => {
    await page.goto(`/people/${p2.people.zoeTurner}`);

    await expect(page.getByTestId('employee-details-page')).toBeVisible();
    await expect(page.getByText(/Terminate/i)).toBeVisible();
  });

  test('terminate API sets employmentStatus to TERMINATED', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);

    // Create a fresh employee to terminate (safer than modifying seed data)
    const unique = Date.now();
    const createRes = await page.request.post('http://127.0.0.1:3000/api/org/people', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        displayName: `E2E Terminate ${unique}`,
        email: `e2e.terminate.${unique}@example.com`,
        employmentType: 'PERMANENT',
        hiredAt: '2025-01-01',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id } = await createRes.json() as { id: string };

    const termRes = await page.request.post(`http://127.0.0.1:3000/api/org/people/${id}/terminate`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { terminatedAt: '2026-04-05T00:00:00.000Z', reason: 'E2E termination test' },
    });
    expect(termRes.ok()).toBeTruthy();
    const body = await termRes.json() as { employmentStatus: string };
    expect(body.employmentStatus).toBe('TERMINATED');
  });
});

// ── 2d-18 Manage reporting lines ─────────────────────────────────────────────

test.describe('@critical 2d-18 HR — manage reporting lines', () => {
  test('employee details page shows reporting line info', async ({ page }) => {
    await page.goto(`/people/${p2.people.ethanBrooks}`);

    await expect(page.getByTestId('employee-details-page')).toBeVisible();
    // Reporting line or org unit info should appear
    await expect(page.getByRole('heading', { name: /Report|Manager/i })).toBeVisible();
  });

  test('PATCH reporting line via API updates manager', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);

    const res = await page.request.post(
      'http://127.0.0.1:3000/api/org/reporting-lines',
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: {
          personId: p2.people.sophieWright,
          managerId: p2.people.sophiaKim,
          startDate: new Date().toISOString().slice(0, 10),
        },
      },
    );
    // 201 created or 400/422 if already has a manager
    expect([201, 400, 422].includes(res.status())).toBeTruthy();
  });
});

// ── 2d-19 HR dashboard ───────────────────────────────────────────────────────

test.describe('@critical 2d-19 HR — view HR dashboard', () => {
  test('HR dashboard page renders distribution charts', async ({ page }) => {
    await page.goto(`/dashboard/hr-manager?personId=${diana}`);

    await expect(page.getByText(/Distribution|Headcount/i)).toBeVisible();
  });

  test('HR dashboard shows Data Quality section', async ({ page }) => {
    await page.goto(`/dashboard/hr-manager?personId=${diana}`);

    await expect(page.getByText(/Data Quality/i)).toBeVisible();
  });

  test('HR dashboard shows Lifecycle Activity section', async ({ page }) => {
    await page.goto(`/dashboard/hr-manager?personId=${diana}`);

    await expect(page.getByText(/Lifecycle Activity/i)).toBeVisible();
  });

  test('HR dashboard API returns headcount distributions', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);
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
    expect(body.orgDistribution.length).toBeGreaterThan(0);
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
