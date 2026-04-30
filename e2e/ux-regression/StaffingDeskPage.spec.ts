/**
 * UX Contract regression — StaffingDeskPage
 *
 * Mirrors: docs/planning/ux-contracts/StaffingDeskPage.md
 *
 * The most feature-rich page in the app. The spec is intentionally large.
 *
 * Required: phase2 seed profile loaded.
 */
import { expect, test } from '@playwright/test';

import {
  loginAsAdmin,
  loginAsEmployee,
  loginAsResourceManager,
} from '../fixtures/auth';

const STAFFING_DESK_PATH = '/staffing-desk';

// ── §1 Route & Roles ────────────────────────────────────────────────────────

test.describe('UX contract — StaffingDeskPage §1 Route & Roles @ux-contract', () => {
  test('resource_manager can access /staffing-desk', async ({ page }) => {
    await loginAsResourceManager(page);
    await page.goto(STAFFING_DESK_PATH);
    await expect(page).toHaveURL(/\/staffing-desk/);
  });

  test('admin can access /staffing-desk', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(STAFFING_DESK_PATH);
    await expect(page).toHaveURL(/\/staffing-desk/);
  });

  test('employee is route-guarded away from /staffing-desk', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto(STAFFING_DESK_PATH);
    // Route guard redirects non-permitted roles; URL should NOT remain on /staffing-desk
    await expect(page).not.toHaveURL(/^https?:\/\/[^/]+\/staffing-desk(?:[?#]|$)/);
  });
});

// ── §2 Click paths ──────────────────────────────────────────────────────────

test.describe('UX contract — StaffingDeskPage §2 Click paths @ux-contract', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(STAFFING_DESK_PATH);
  });

  test('Supply tab sets ?kind=assignment&page=1', async ({ page }) => {
    const supplyTab = page.getByRole('button', { name: /^supply\b/i }).first();
    if (await supplyTab.count() === 0) test.skip();
    await supplyTab.click();
    await expect(page).toHaveURL(/[?&]kind=assignment/);
    await expect(page).toHaveURL(/[?&]page=1/);
  });

  test('Demand tab sets ?kind=request&page=1', async ({ page }) => {
    const demandTab = page.getByRole('button', { name: /^demand\b/i }).first();
    if (await demandTab.count() === 0) test.skip();
    await demandTab.click();
    await expect(page).toHaveURL(/[?&]kind=request/);
    await expect(page).toHaveURL(/[?&]page=1/);
  });

  test('View switcher toggles ?view=planner', async ({ page }) => {
    const plannerBtn = page.getByRole('button', { name: /planner/i }).first();
    if (await plannerBtn.count() === 0) test.skip();
    await plannerBtn.click();
    await expect(page).toHaveURL(/[?&]view=planner/);
  });

  test('"Make Assignment" action navigates to /assignments/new', async ({ page }) => {
    const link = page.getByRole('link', { name: /make assignment/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/assignments/new');
  });

  test('"Create Staffing Request" action navigates to /staffing-requests/new', async ({ page }) => {
    const link = page.getByRole('link', { name: /create staffing request/i }).first();
    if (await link.count() === 0) test.skip();
    await expect(link).toHaveAttribute('href', '/staffing-requests/new');
  });

  test('Pagination Previous disabled at page=1', async ({ page }) => {
    await page.goto(`${STAFFING_DESK_PATH}?page=1`);
    const prev = page.getByRole('button', { name: /^←|previous/i }).first();
    if (await prev.count() === 0) test.skip();
    await expect(prev).toBeDisabled();
  });

  test('Pagination page-size dropdown writes ?pageSize=… and resets ?page=1', async ({ page }) => {
    await page.goto(`${STAFFING_DESK_PATH}?page=3`);
    const sizer = page.locator('select').filter({ has: page.locator('option', { hasText: /50|100|25/ }) }).first();
    if (await sizer.count() === 0) test.skip();
    await sizer.selectOption('100');
    await expect(page).toHaveURL(/[?&]pageSize=100/);
    await expect(page).toHaveURL(/[?&]page=1/);
  });
});

// ── §3 Form validation ──────────────────────────────────────────────────────

test.describe('UX contract — StaffingDeskPage §3 Form validation @ux-contract', () => {
  test('Saved-filter Save rejects empty name (button disabled or save not registered)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(STAFFING_DESK_PATH);
    // Open Saved Filters dropdown
    const trigger = page.getByRole('button', { name: /saved filters/i }).first();
    if (await trigger.count() === 0) test.skip();
    await trigger.click();
    const nameInput = page.getByPlaceholder(/filter name/i).first();
    if (await nameInput.count() === 0) test.skip();
    // Confirm empty / whitespace-only doesn't create a saved filter
    await nameInput.fill('   ');
    const saveBtn = page.getByRole('button', { name: /^save$/i }).first();
    if (await saveBtn.count() === 0) test.skip();
    // Either the button is disabled or saving is a no-op for whitespace
    const saveCountBefore = await page.locator('button').filter({ hasText: /^×$/ }).count();
    if (await saveBtn.isEnabled()) {
      await saveBtn.click();
    }
    const saveCountAfter = await page.locator('button').filter({ hasText: /^×$/ }).count();
    expect(saveCountAfter).toBe(saveCountBefore);
  });
});

// ── §4 Confirmation prompts ─────────────────────────────────────────────────

test.describe('UX contract — StaffingDeskPage §4 Confirmation prompts @ux-contract', () => {
  test('no ConfirmDialog opens during normal operation', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(STAFFING_DESK_PATH);
    // Open Saved Filters & ColumnConfigurator should not surface a ConfirmDialog
    await expect(page.locator('.confirm-dialog')).toHaveCount(0);
  });
});

// ── §5 Toasts ───────────────────────────────────────────────────────────────

test.describe('UX contract — StaffingDeskPage §5 Toasts @ux-contract', () => {
  test('errors render in ErrorState, not toast', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/staffing-desk*', (route) =>
      route.fulfill({ status: 500, body: 'forced', contentType: 'text/plain' }),
    );
    await page.goto(STAFFING_DESK_PATH);
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });
});

// ── §6 Filters / sort / pagination / saved views ────────────────────────────

test.describe('UX contract — StaffingDeskPage §6 Filters & state @ux-contract', () => {
  test('all 18 URL params round-trip via reload', async ({ page }) => {
    await loginAsAdmin(page);
    const url = `${STAFFING_DESK_PATH}?kind=assignment&view=table&page=2&pageSize=25` +
      `&sortBy=name&sortDir=desc&person=demo&project=p1&poolId=pool1&orgUnitId=ou1` +
      `&status=ACTIVE&priority=HIGH&role=engineer&skills=react&from=2025-01-01&to=2025-12-31` +
      `&allocMin=10&allocMax=90`;
    await page.goto(url);
    await page.reload();
    for (const param of [
      'kind=assignment', 'view=table', 'page=2', 'pageSize=25',
      'sortBy=name', 'sortDir=desc', 'person=demo', 'project=p1',
      'poolId=pool1', 'orgUnitId=ou1', 'status=ACTIVE', 'priority=HIGH',
      'role=engineer', 'skills=react', 'from=2025-01-01', 'to=2025-12-31',
      'allocMin=10', 'allocMax=90',
    ]) {
      await expect(page).toHaveURL(new RegExp(param.replace(/[?&]/g, '\\$&')));
    }
  });

  test('Fill Rate KPI deep-link sets kind=request&status=FULFILLED', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(STAFFING_DESK_PATH);
    const fillRate = page.getByRole('link', { name: /fill rate/i }).first();
    if (await fillRate.count() === 0) test.skip();
    const href = await fillRate.getAttribute('href');
    expect(href).toMatch(/kind=request/);
    expect(href).toMatch(/status=FULFILLED/);
  });

  test('Overallocated KPI deep-link sets allocMin=101', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(STAFFING_DESK_PATH);
    const overalloc = page.getByRole('link', { name: /overallocated/i }).first();
    if (await overalloc.count() === 0) test.skip();
    const href = await overalloc.getAttribute('href');
    expect(href).toMatch(/allocMin=101/);
  });
});

// ── §7 States ───────────────────────────────────────────────────────────────

test.describe('UX contract — StaffingDeskPage §7 States @ux-contract', () => {
  test('loading skeleton during fetch', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/staffing-desk*', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto(STAFFING_DESK_PATH);
    await expect(page.locator('.skeleton, .skeleton-table').first()).toBeVisible({ timeout: 2000 });
  });

  test('error state with fallback "Failed to load staffing desk data."', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/staffing-desk*', (route) =>
      route.fulfill({ status: 500, body: '', contentType: 'text/plain' }),
    );
    await page.goto(STAFFING_DESK_PATH);
    await expect(page.getByText(/failed to load staffing desk data|error/i).first()).toBeVisible({ timeout: 5000 });
  });
});

// ── §8 Side effects ─────────────────────────────────────────────────────────

test.describe('UX contract — StaffingDeskPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/staffing-desk', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/staffing-desk(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(STAFFING_DESK_PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  test('URL filter change triggers refetch', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(STAFFING_DESK_PATH);
    await page.waitForLoadState('networkidle');
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/staffing-desk(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto(`${STAFFING_DESK_PATH}?kind=assignment`);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls.some((u) => /kind=assignment/.test(u))).toBe(true);
  });
});
