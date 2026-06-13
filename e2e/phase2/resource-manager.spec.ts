/**
 * Phase 2 E2E — Resource Manager JTBDs (RM1, RM3, RM4)
 * Requires: phase2 seed profile loaded in the database.
 *
 * (RM2 approve/reject + RM5 bulk-assign removed — the ProjectAssignment lifecycle
 *  API and the /assignments/bulk page were dropped in the lean V2 migration.)
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { resourceManager } = p2.accounts;
const sophia = p2.people.sophiaKim;

test.beforeEach(async ({ page }) => {
  await loginAs(page, resourceManager.email, resourceManager.password);
});

test.describe('@full RM1 — RM sees allocation indicators for pool members', () => {
  test('RM dashboard shows Allocation Indicators section with OVERALLOCATED for Ethan', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByText(/Allocation Indicator/i)).toBeVisible();
    // Ethan is in Sophia's pool and overallocated at 120%
    await expect(page.getByText(/Ethan Brooks/)).toBeVisible();
    await expect(page.getByText(/OVERALLOCATED/i)).toBeVisible();
  });

  test('employee on LEAVE (Isabel Ferreira) appears in indicators', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByText(/Isabel Ferreira/)).toBeVisible();
  });
});

test.describe('@full RM3 — RM sees future assignment pipeline', () => {
  test('RM dashboard shows Pipeline section with future assignments', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByText(/Pipeline|Future/i)).toBeVisible();
  });
});

test.describe('@full RM4 — RM views team capacity by resource pool', () => {
  test('RM dashboard shows Capacity section with pool-level counts', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByText(/Capacity/i)).toBeVisible();
  });
});

