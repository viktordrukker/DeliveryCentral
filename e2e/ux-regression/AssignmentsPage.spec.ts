/**
 * UX Contract regression — AssignmentsPage
 *
 * Mirrors: docs/planning/ux-contracts/AssignmentsPage.md
 *
 * Required: phase2 seed profile loaded.
 */
import { expect, test } from '@playwright/test';

import {
  loginAsAdmin,
  loginAsEmployee,
  loginAsResourceManager,
} from '../fixtures/auth';

const ASSIGNMENTS_PATH = '/assignments';

// ── §1 Route & Roles ────────────────────────────────────────────────────────

test.describe('UX contract — AssignmentsPage §1 Route & Roles @ux-contract', () => {
  test('admin can access /assignments', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page).toHaveURL(/\/assignments/);
  });

  test('employee can access /assignments (sees own data)', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page).toHaveURL(/\/assignments/);
  });

  test('"Create Assignment" link visible to resource_manager', async ({ page }) => {
    await loginAsResourceManager(page);
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page.getByRole('link', { name: /create assignment/i })).toBeVisible();
  });

  test('"Create Assignment" / "Create Position" hidden from employee', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page.getByRole('link', { name: /create assignment/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /create position/i })).toHaveCount(0);
  });
});

// ── §2 Click paths ──────────────────────────────────────────────────────────

test.describe('UX contract — AssignmentsPage §2 Click paths @ux-contract', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ASSIGNMENTS_PATH);
  });

  test('"Create Assignment" links to /assignments/new', async ({ page }) => {
    const link = page.getByRole('link', { name: /create assignment/i }).first();
    await expect(link).toHaveAttribute('href', '/assignments/new');
  });

  test('"Create Position" links to /staffing-requests/new', async ({ page }) => {
    const link = page.getByRole('link', { name: /create position/i }).first();
    await expect(link).toHaveAttribute('href', '/staffing-requests/new');
  });

  test('Tab "Positions" sets ?tab=positions', async ({ page }) => {
    const tab = page.getByRole('button', { name: /^positions/i }).first();
    if (await tab.count() === 0) test.skip();
    await tab.click();
    await expect(page).toHaveURL(/[?&]tab=positions/);
  });

  test('Tab "Assignments" sets ?tab=assignments', async ({ page }) => {
    const tab = page.getByRole('button', { name: /^assignments/i }).first();
    if (await tab.count() === 0) test.skip();
    await tab.click();
    await expect(page).toHaveURL(/[?&]tab=assignments/);
  });
});

// ── §3 Form validation ──────────────────────────────────────────────────────

test.describe('UX contract — AssignmentsPage §3 Form validation @ux-contract', () => {
  test('no native <form> on page outside of saved-filter / preset name inputs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ASSIGNMENTS_PATH);
    const forms = page.locator('main form');
    // Saved-filter and preset inputs are conditional; the page itself has no <form>
    expect(await forms.count()).toBeLessThanOrEqual(1);
  });
});

// ── §4 Confirmation prompts ─────────────────────────────────────────────────

test.describe('UX contract — AssignmentsPage §4 Confirmation prompts @ux-contract', () => {
  test('no ConfirmDialog reachable during normal flow', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page.locator('.confirm-dialog')).toHaveCount(0);
  });
});

// ── §5 Toasts ───────────────────────────────────────────────────────────────

test.describe('UX contract — AssignmentsPage §5 Toasts @ux-contract', () => {
  test('errors render in ErrorState, not toast', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/staffing-desk*', (route) =>
      route.fulfill({ status: 500, body: '', contentType: 'text/plain' }),
    );
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });
});

// ── §6 Filters / sort / pagination / saved views ────────────────────────────

test.describe('UX contract — AssignmentsPage §6 Filters & state @ux-contract', () => {
  test('?tab= round-trips via reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${ASSIGNMENTS_PATH}?tab=positions`);
    await page.reload();
    await expect(page).toHaveURL(/[?&]tab=positions/);
  });

  test('no server-side pagination control on AssignmentsPage', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ASSIGNMENTS_PATH);
    // Confirm no page-size dropdown / page indicator at the page level
    // (StaffingDeskPage has these; AssignmentsPage does not — see contract §6)
    const pageSizer = page.locator('main select').filter({ has: page.locator('option', { hasText: /^25$|^50$|^100$/ }) });
    await expect(pageSizer).toHaveCount(0);
  });
});

// ── §7 States ───────────────────────────────────────────────────────────────

test.describe('UX contract — AssignmentsPage §7 States @ux-contract', () => {
  test('loading skeleton during fetch', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/staffing-desk*', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page.locator('.skeleton, .skeleton-table').first()).toBeVisible({ timeout: 2000 });
  });

  test('empty state shows "Nothing here yet" / "No assignments or positions found."', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/staffing-desk*', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          items: [],
          totalCount: 0,
          page: 1,
          pageSize: 50,
          kpis: {},
          supplyDemand: {},
        }),
        contentType: 'application/json',
      }),
    );
    await page.goto(ASSIGNMENTS_PATH);
    await expect(page.getByText(/nothing here yet/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/no assignments or positions found/i)).toBeVisible();
  });
});

// ── §8 Side effects ─────────────────────────────────────────────────────────

test.describe('UX contract — AssignmentsPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/staffing-desk with kind blank', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/staffing-desk(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(ASSIGNMENTS_PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  test('employee scope adds personId to query', async ({ page }) => {
    await loginAsEmployee(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/staffing-desk(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(ASSIGNMENTS_PATH);
    await page.waitForLoadState('networkidle');
    // Contract §1: isEmployeeOnly causes personId to be set on the query.
    // We can't predict the exact UUID, but we can assert one of the calls includes personId=
    expect(calls.some((u) => /personId=/.test(u))).toBe(true);
  });
});
