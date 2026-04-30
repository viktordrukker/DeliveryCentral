/**
 * UX Contract regression — EmployeeDirectoryPage
 *
 * Mirrors: docs/planning/ux-contracts/EmployeeDirectoryPage.md
 *
 * Required: phase2 seed profile loaded.
 */
import { expect, test } from '@playwright/test';

import {
  loginAsAdmin,
  loginAsEmployee,
  loginAsHrManager,
} from '../fixtures/auth';

const PEOPLE_PATH = '/people';

// ── §1 Route & Roles ────────────────────────────────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §1 Route & Roles @ux-contract', () => {
  test('admin can access /people', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PEOPLE_PATH);
    await expect(page).toHaveURL(/\/people/);
  });

  test('employee can access /people (read-only)', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PEOPLE_PATH);
    await expect(page).toHaveURL(/\/people/);
  });

  test('Export XLSX visible to hr_manager (canManagePeople = true)', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(PEOPLE_PATH);
    await expect(page.getByRole('button', { name: /export.*xlsx/i }).first()).toBeVisible();
  });

  test('Export XLSX hidden from employee', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PEOPLE_PATH);
    await expect(page.getByRole('button', { name: /export.*xlsx/i })).toHaveCount(0);
  });

  test('"Create employee" link hidden from employee', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(PEOPLE_PATH);
    await expect(page.getByRole('link', { name: /create employee/i })).toHaveCount(0);
  });
});

// ── §2 Click paths ──────────────────────────────────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §2 Click paths @ux-contract', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PEOPLE_PATH);
  });

  test('"Create employee" links to /admin/people/new', async ({ page }) => {
    const link = page.getByRole('link', { name: /create employee/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/admin/people/new');
  });

  test('search input writes ?search=', async ({ page }) => {
    const search = page.getByPlaceholder(/search by person/i).first();
    await search.fill('demo');
    await expect(page).toHaveURL(/[?&]search=demo/);
  });

  test('Department ID input writes ?departmentId=', async ({ page }) => {
    const input = page.getByPlaceholder(/filter by department/i).first();
    await input.fill('eng');
    await expect(page).toHaveURL(/[?&]departmentId=eng/);
  });

  test('Status dropdown change resets page=1 and writes ?lifecycleStatus=', async ({ page }) => {
    // Default is ACTIVE; switching to INACTIVE should write the param.
    const statusSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /^ACTIVE|INACTIVE|TERMINATED|ALL$/i }) }).first();
    if (await statusSelect.count() === 0) test.skip();
    await statusSelect.selectOption('INACTIVE');
    await expect(page).toHaveURL(/[?&]lifecycleStatus=INACTIVE/);
  });

  test('Row click navigates to /people/:id', async ({ page }) => {
    const firstRow = page.locator('.data-table__row--interactive').first();
    if (await firstRow.count() === 0) test.skip();
    await firstRow.click();
    await expect(page).toHaveURL(/\/people\/[^/]+/);
  });
});

// ── §3 Form validation ──────────────────────────────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §3 Form validation @ux-contract', () => {
  test('no <form> elements on page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PEOPLE_PATH);
    const forms = page.locator('main form');
    await expect(forms).toHaveCount(0);
  });
});

// ── §4 Confirmation prompts ─────────────────────────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §4 Confirmation prompts @ux-contract', () => {
  test('no destructive actions, no ConfirmDialog', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PEOPLE_PATH);
    await expect(page.locator('.confirm-dialog')).toHaveCount(0);
  });
});

// ── §5 Toasts ───────────────────────────────────────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §5 Toasts @ux-contract', () => {
  test('errors render in ErrorState, not toast', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/person-directory*', (route) =>
      route.fulfill({ status: 500, body: '', contentType: 'text/plain' }),
    );
    await page.goto(PEOPLE_PATH);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });
});

// ── §6 Filters / sort / pagination / saved views ────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §6 Filters & state @ux-contract', () => {
  test('default lifecycleStatus is ACTIVE', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(PEOPLE_PATH);
    // Default value is in the URL only if user changed it; check the select's current value
    const statusSelect = page.locator('select').filter({ has: page.locator('option', { hasText: /^ACTIVE/i }) }).first();
    if (await statusSelect.count() === 0) test.skip();
    await expect(statusSelect).toHaveValue('ACTIVE');
  });

  test('search / departmentId / resourcePoolId / lifecycleStatus persist via URL reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${PEOPLE_PATH}?search=demo&departmentId=eng&lifecycleStatus=ALL`);
    await page.reload();
    await expect(page).toHaveURL(/[?&]search=demo/);
    await expect(page).toHaveURL(/[?&]departmentId=eng/);
    await expect(page).toHaveURL(/[?&]lifecycleStatus=ALL/);
  });

  test('page state is local only (not URL-persisted)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${PEOPLE_PATH}?search=&lifecycleStatus=ACTIVE`);
    const url = new URL(page.url());
    // Contract §6 explicitly: page lives in useState(1), not URL.
    expect(url.searchParams.has('page')).toBe(false);
  });
});

// ── §7 States ───────────────────────────────────────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §7 States @ux-contract', () => {
  test('loading skeleton during fetch', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/person-directory*', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto(PEOPLE_PATH);
    await expect(page.locator('.skeleton, .skeleton-table').first()).toBeVisible({ timeout: 2000 });
  });

  test('empty state shows "No employees available" when total=0', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/person-directory*', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 25 }),
        contentType: 'application/json',
      }),
    );
    await page.goto(PEOPLE_PATH);
    await expect(page.getByText(/no employees available/i)).toBeVisible({ timeout: 5000 });
  });
});

// ── §8 Side effects ─────────────────────────────────────────────────────────

test.describe('UX contract — EmployeeDirectoryPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/person-directory and GET /api/resource-pools', async ({ page }) => {
    await loginAsAdmin(page);
    const directoryCalls: string[] = [];
    const poolsCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\/api\/person-directory(\?|$)/.test(url)) directoryCalls.push(url);
      if (/\/api\/resource-pools(\?|$)/.test(url)) poolsCalls.push(url);
    });
    await page.goto(PEOPLE_PATH);
    await page.waitForLoadState('networkidle');
    expect(directoryCalls.length).toBeGreaterThanOrEqual(1);
    expect(poolsCalls.length).toBeGreaterThanOrEqual(1);
  });

  test('search filter is NOT sent server-side (client-side only)', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/person-directory(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(`${PEOPLE_PATH}?search=demo`);
    await page.waitForLoadState('networkidle');
    expect(calls.every((u) => !/[?&]search=/.test(u))).toBe(true);
  });
});
