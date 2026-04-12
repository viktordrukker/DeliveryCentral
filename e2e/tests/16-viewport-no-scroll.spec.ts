/**
 * Phase 16-03 / 16-04 — Viewport No-Scroll Tests
 *
 * Visits key pages at four viewport resolutions and asserts that
 * the page body does not require vertical scroll (Phase 15 acceptance criterion).
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { test } from '@playwright/test';

import { loginAsAdmin, loginAsEmployee } from '../fixtures/auth';
import { assertNoBodyScroll, VIEWPORT_SIZES } from '../helpers/viewport';

// Pages to test keyed by role
const ADMIN_PAGES = ['/admin', '/admin/dictionaries', '/admin/monitoring', '/admin/audit'];
const ELEVATED_PAGES = ['/', '/projects', '/assignments', '/people', '/workload'];
const EMPLOYEE_PAGES = ['/dashboard/employee'];

test.describe('16-03 Viewport no-scroll — admin pages', () => {
  for (const { width, height, label } of VIEWPORT_SIZES) {
    test(`${label}: admin pages have no body scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await loginAsAdmin(page);

      for (const path of ADMIN_PAGES) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await assertNoBodyScroll(page, `${label} ${path}`);
      }
    });
  }
});

test.describe('16-03 Viewport no-scroll — elevated role pages', () => {
  for (const { width, height, label } of VIEWPORT_SIZES) {
    test(`${label}: elevated pages have no body scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await loginAsAdmin(page);

      for (const path of ELEVATED_PAGES) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await assertNoBodyScroll(page, `${label} ${path}`);
      }
    });
  }
});

test.describe('16-03 Viewport no-scroll — employee dashboard', () => {
  for (const { width, height, label } of VIEWPORT_SIZES) {
    test(`${label}: employee dashboard has no body scroll`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await loginAsEmployee(page);

      for (const path of EMPLOYEE_PAGES) {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        await assertNoBodyScroll(page, `${label} ${path}`);
      }
    });
  }
});
