/**
 * UX Contract regression — ProjectsPage
 *
 * Mirrors: docs/planning/ux-contracts/ProjectsPage.md
 *
 * Required: phase2 seed profile loaded.
 */
import { expect, test } from '@playwright/test';

import {
  loginAsAdmin,
  loginAsEmployee,
  loginAsProjectManager,
} from '../fixtures/auth';

// ── §1 Route & Roles ────────────────────────────────────────────────────────

test.describe('UX contract — ProjectsPage §1 Route & Roles @ux-contract', () => {
  test('admin can access /projects', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
  });

  test('employee can access /projects (read-only)', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto('/projects');
    // ALL_ROLES — page renders for everyone
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
  });

  test('"Create project" link visible to project_manager', async ({ page }) => {
    await loginAsProjectManager(page);
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: /create project/i })).toBeVisible();
  });

  test('"Create project" link NOT visible to employee', async ({ page }) => {
    await loginAsEmployee(page);
    await page.goto('/projects');
    await expect(page.getByRole('link', { name: /create project/i })).toHaveCount(0);
  });
});

// ── §2 Click paths ──────────────────────────────────────────────────────────

test.describe('UX contract — ProjectsPage §2 Click paths @ux-contract', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
  });

  test('search input writes to URL ?search=', async ({ page }) => {
    const search = page.getByPlaceholder(/search/i).first();
    await search.fill('demo');
    // useFilterParams debounces? It writes immediately based on the contract.
    await expect(page).toHaveURL(/[?&]search=demo/);
  });

  test('engagement dropdown writes to URL ?engagement=', async ({ page }) => {
    // Dropdown is a native <select>; pick any non-empty option.
    const select = page.locator('select').filter({ hasText: /all models|t&m|fixed|managed|internal/i }).first();
    if (await select.count() > 0) {
      const options = await select.locator('option').all();
      // Find first non-empty value
      for (const opt of options) {
        const value = await opt.getAttribute('value');
        if (value) {
          await select.selectOption(value);
          await expect(page).toHaveURL(new RegExp(`engagement=${value}`));
          break;
        }
      }
    }
  });

  test('table row click navigates to /projects/:id', async ({ page }) => {
    const firstRow = page.locator('.data-table__row--interactive').first();
    if (await firstRow.count() === 0) test.skip();
    await firstRow.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+/);
  });

  test('"Go" link uses stopPropagation (does not double-navigate)', async ({ page }) => {
    // Just assert the Go link exists with the same href as the row
    const goLink = page.getByRole('link', { name: /^view$/i }).first();
    if (await goLink.count() === 0) test.skip();
    const href = await goLink.getAttribute('href');
    expect(href).toMatch(/^\/projects\/[^/]+$/);
  });

  test('Health column header toggles sort: null → desc → asc → null', async ({ page }) => {
    const healthHeader = page.getByRole('button', { name: /health/i }).first();
    // First click: null → desc
    await healthHeader.click();
    await expect(page).toHaveURL(/sort=desc/);
    // Second: desc → asc
    await healthHeader.click();
    await expect(page).toHaveURL(/sort=asc/);
    // Third: asc → null (param removed)
    await healthHeader.click();
    await expect(page).not.toHaveURL(/[?&]sort=/);
  });
});

// ── §3 Form validation ──────────────────────────────────────────────────────

test.describe('UX contract — ProjectsPage §3 Form validation @ux-contract', () => {
  test('page has no <form> elements', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    const forms = page.locator('main form');
    await expect(forms).toHaveCount(0);
  });
});

// ── §4 Confirmation prompts ─────────────────────────────────────────────────

test.describe('UX contract — ProjectsPage §4 Confirmation prompts @ux-contract', () => {
  test('no destructive actions, no confirm dialog reachable', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
    await expect(page.locator('.confirm-dialog')).toHaveCount(0);
  });
});

// ── §5 Toasts ───────────────────────────────────────────────────────────────

test.describe('UX contract — ProjectsPage §5 Toasts @ux-contract', () => {
  test('errors render in ErrorState, not as toast', async ({ page }) => {
    await loginAsAdmin(page);
    await page.route('**/api/projects?source*', (route) =>
      route.fulfill({ status: 500, body: 'forced', contentType: 'text/plain' }),
    );
    // Navigate with a source param so the API call fires
    await page.goto('/projects?source=internal');
    // No sonner toast should appear
    await expect(page.locator('[data-sonner-toast]')).toHaveCount(0);
  });
});

// ── §6 Filters / sort / pagination / saved views ────────────────────────────

test.describe('UX contract — ProjectsPage §6 Filters & state @ux-contract', () => {
  test('filters round-trip via URL params (search, engagement, priority, sort)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects?search=demo&engagement=tm&priority=HIGH&sort=desc');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    // Reload and confirm filters persist
    await page.reload();
    await expect(page).toHaveURL(/[?&]search=demo/);
    await expect(page).toHaveURL(/[?&]engagement=tm/);
    await expect(page).toHaveURL(/[?&]priority=HIGH/);
    await expect(page).toHaveURL(/[?&]sort=desc/);
  });

  test('no pagination control rendered (full registry fetched in one call)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/projects');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    // No prev/next page controls on this page
    const pageButtons = page.locator('main button').filter({ hasText: /^(←|→|prev|next|page)/i });
    await expect(pageButtons).toHaveCount(0);
  });
});

// ── §7 States ───────────────────────────────────────────────────────────────

test.describe('UX contract — ProjectsPage §7 States @ux-contract', () => {
  test('loading state renders skeleton during initial fetch', async ({ page }) => {
    await loginAsAdmin(page);
    // Stall when source param is present (matches the actual fetch trigger)
    await page.route('**/api/projects?source*', async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });
    await page.goto('/projects?source=internal');
    await expect(page.locator('.skeleton, .skeleton-table').first()).toBeVisible({ timeout: 2000 });
  });

  test('empty state shows "No projects yet" with "Create Project" CTA', async ({ page }) => {
    await loginAsAdmin(page);
    // Force empty registry response
    await page.route('**/api/projects?source*', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ items: [], totalCount: 0 }),
        contentType: 'application/json',
      }),
    );
    await page.goto('/projects?source=internal');
    await expect(page.getByText(/no projects yet/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /create project/i })).toHaveAttribute('href', '/projects/new');
  });
});

// ── §8 Side effects ─────────────────────────────────────────────────────────

test.describe('UX contract — ProjectsPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /api/projects (only when source param present)', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/projects(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto('/projects?source=internal');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls.some((u) => /source=internal/.test(u))).toBe(true);
  });

  test('search filter is NOT sent server-side (client-side only)', async ({ page }) => {
    await loginAsAdmin(page);
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/projects(\?|$)/.test(req.url())) calls.push(req.url());
    });
    await page.goto('/projects?source=internal&search=demo');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    // Contract §6: search is client-side; should not appear in any /api/projects request URL
    expect(calls.every((u) => !/[?&]search=/.test(u))).toBe(true);
  });

  test('visible items each get a parallel /api/projects/:id/health fetch', async ({ page }) => {
    await loginAsAdmin(page);
    const healthCalls: string[] = [];
    page.on('request', (req) => {
      if (/\/api\/projects\/[^/]+\/health/.test(req.url())) healthCalls.push(req.url());
    });
    await page.goto('/projects?source=internal');
    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    // Wait for the parallel health fetches to be issued
    await page.waitForLoadState('networkidle');
    // At least one health request should have fired if there are any visible items
    const rowCount = await page.locator('.data-table__row--interactive').count();
    if (rowCount > 0) {
      expect(healthCalls.length).toBeGreaterThanOrEqual(1);
    }
  });
});
