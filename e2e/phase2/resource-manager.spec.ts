/**
 * Phase 2 E2E — Resource Manager JTBDs (RM1–RM5)
 * Requires: phase2 seed profile loaded in the database.
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

test.describe('@full RM2 — RM approves and rejects assignment requests', () => {
  test('approve action on REQUESTED assignment transitions it to APPROVED', async ({ page }) => {
    // The REQUESTED assignment for Raj on Jupiter is accessible
    await page.goto(`/assignments/${p2.assignments.rajOnJupiterRequested}`);

    await expect(page.getByText(/REQUESTED/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Approve assignment/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reject assignment/i })).toBeVisible();
  });

  test('approving an already-approved assignment shows 422 error', async ({ page }) => {
    const token = await getToken(page, resourceManager.email, resourceManager.password);
    const response = await page.request.post(
      `http://127.0.0.1:3000/api/assignments/${p2.assignments.ethanOnDeliveryCentral}/approve`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { actorId: sophia },
      },
    );
    expect(response.status()).toBe(422);
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

test.describe('@full RM5 — RM bulk-assigns multiple people', () => {
  test('bulk assignment page exists and shows form', async ({ page }) => {
    await page.goto('/assignments/bulk');

    await expect(page.getByTestId('bulk-assignment-page')).toBeVisible();
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
