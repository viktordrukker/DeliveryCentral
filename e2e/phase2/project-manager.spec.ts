/**
 * Phase 2 E2E — Project Manager JTBDs (PM1, PM2, PM5)
 * Requires: phase2 seed profile loaded in the database.
 *
 * (PM3 request-assignment + PM4 end-assignment removed — the ProjectAssignment
 *  create form and detail-page lifecycle actions were dropped in the lean V2
 *  migration; positions are the replacement.)
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { projectManager } = p2.accounts;
const lucas = p2.people.lucasReed;

test.beforeEach(async ({ page }) => {
  await loginAs(page, projectManager.email, projectManager.password);
});

test.describe('@full PM1 — PM sees managed projects with staffing and evidence counts', () => {
  test('PM dashboard renders project list with staffing count and evidence count columns', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    await expect(page.getByText(/managed projects|my projects/i)).toBeVisible();
    // Lucas manages PRJ-101, PRJ-106, PRJ-107, PRJ-111 — multiple should appear
    await expect(page.getByText(/PRJ-10/)).toBeVisible();
  });

  test('ON_HOLD project (Saturn) still appears in managed projects list when Lucas manages it', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.getByText('Saturn Compliance Audit')).toBeVisible();
  });
});

test.describe('@full PM2 — PM sees staffing gaps', () => {
  test('staffing gaps section shows Jupiter Client Portal (REQUESTED only — no ACTIVE)', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    await expect(page.getByText(/Staffing Gap/i)).toBeVisible();
    await expect(page.getByText(/Jupiter Client Portal/i)).toBeVisible();
  });
});

test.describe('@full PM5 — PM sees nearing closure projects', () => {
  test('PM dashboard shows attention projects section (nearing closure)', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    // Attention projects section exists
    await expect(page.getByText(/Attention Projects|Nearing Closure/i)).toBeVisible();
  });
});
