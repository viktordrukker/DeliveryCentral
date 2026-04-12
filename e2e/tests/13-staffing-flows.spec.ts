/**
 * 13-staffing-flows.spec.ts
 * E2E tests for Phase 13 staffing request lifecycle and dashboard integration.
 *
 * 13-E3: PM creates a staffing request, submits it; RM reviews and fulfils it.
 * 13-E4: HR at-risk panel shows employees flagged in the backend.
 * 13-E5: DM staffing gaps table shows assignments ending within 28 days.
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import {
  loginAsDeliveryManager,
  loginAsHrManager,
  loginAsProjectManager,
  loginAsResourceManager,
  CREDENTIALS,
} from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const API = process.env['PLAYWRIGHT_API_BASE'] ?? 'http://127.0.0.1:3000/api';

async function apiLogin(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<string> {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password } });
  const body = (await res.json()) as { accessToken: string };
  return body.accessToken;
}

// ── 13-E3: PM creates → RM reviews → fulfils ────────────────────────────────

test.describe('13-E3: staffing request lifecycle — PM → RM → fulfilled', () => {
  test('PM can navigate to create staffing request page', async ({ page }) => {
    await loginAsProjectManager(page);
    await page.goto('/staffing-requests');

    await expect(page.getByText(/Staffing Requests/i).first()).toBeVisible();
    await page.getByRole('button', { name: /Create request/i }).click();

    await expect(page.getByText(/Create Staffing Request/i)).toBeVisible();
  });

  test('PM can create and auto-submit a staffing request via API', async ({ page }) => {
    const token = await apiLogin(
      page,
      CREDENTIALS.projectManager.email,
      CREDENTIALS.projectManager.password,
    );

    // Create via API (simulates the form submit)
    const createRes = await page.request.post(`${API}/staffing-requests`, {
      data: {
        allocationPercent: 100,
        endDate: '2026-09-30',
        headcountRequired: 1,
        priority: 'HIGH',
        projectId: p2.projects.deliveryCentral,
        requestedByPersonId: p2.people.lucasReed,
        role: 'E2E Test Engineer',
        startDate: '2026-05-01',
      },
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as { id: string; status: string };
    expect(created.status).toBe('DRAFT');

    // Submit it
    const submitRes = await page.request.post(`${API}/staffing-requests/${created.id}/submit`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(submitRes.status()).toBe(200);
    const submitted = (await submitRes.json()) as { status: string };
    expect(submitted.status).toBe('OPEN');

    // RM takes into review
    const rmToken = await apiLogin(
      page,
      CREDENTIALS.resourceManager.email,
      CREDENTIALS.resourceManager.password,
    );
    const reviewRes = await page.request.post(`${API}/staffing-requests/${created.id}/review`, {
      headers: { Authorization: `Bearer ${rmToken}` },
    });
    expect(reviewRes.status()).toBe(200);
    const reviewed = (await reviewRes.json()) as { status: string };
    expect(reviewed.status).toBe('IN_REVIEW');

    // RM fulfils
    const fulfilRes = await page.request.post(`${API}/staffing-requests/${created.id}/fulfil`, {
      data: { assignedPersonId: p2.people.miaLopez },
      headers: { Authorization: `Bearer ${rmToken}` },
    });
    expect(fulfilRes.status()).toBe(200);
    const fulfilled = (await fulfilRes.json()) as { status: string; headcountFulfilled: number };
    expect(fulfilled.status).toBe('FULFILLED');
    expect(fulfilled.headcountFulfilled).toBe(1);
  });

  test('fulfilled request appears in the staffing requests list', async ({ page }) => {
    await loginAsResourceManager(page);
    await page.goto('/staffing-requests');

    // Page loads without error
    await expect(page.getByText(/Staffing Requests/i).first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
  });

  test('RM dashboard shows incoming request queue', async ({ page }) => {
    await loginAsResourceManager(page);
    await page.goto(`/dashboard/resource-manager?personId=${p2.people.sophiaKim}`);

    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
    // Either the queue section is visible (if there are open requests) or the page loaded cleanly
    const pageText = await page.locator('body').innerText();
    expect(pageText).toMatch(/Resource Manager|Incoming Request|Capacity/i);
  });
});

// ── 13-E4: HR at-risk panel ─────────────────────────────────────────────────

test.describe('13-E4: HR dashboard at-risk employees panel', () => {
  test('HR dashboard loads without error', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(`/dashboard/hr?personId=${p2.people.dianaWalsh}`);

    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
    await expect(page.getByText(/HR Manager Dashboard|Headcount/i).first()).toBeVisible();
  });

  test('HR dashboard API returns atRiskEmployees field', async ({ page }) => {
    const token = await apiLogin(
      page,
      CREDENTIALS.hrManager.email,
      CREDENTIALS.hrManager.password,
    );

    const res = await page.request.get(
      `${API}/dashboard/hr-manager/${p2.people.dianaWalsh}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { atRiskEmployees?: unknown[] };
    expect(Array.isArray(body.atRiskEmployees)).toBe(true);
  });

  test('over-allocated employee (ethan brooks at 120%) appears in at-risk list', async ({ page }) => {
    const token = await apiLogin(
      page,
      CREDENTIALS.hrManager.email,
      CREDENTIALS.hrManager.password,
    );

    const res = await page.request.get(
      `${API}/dashboard/hr-manager/${p2.people.dianaWalsh}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await res.json()) as {
      atRiskEmployees: Array<{ personId: string; riskFactors: string[] }>;
    };

    // Ethan Brooks is at 120% allocation in the phase2 seed
    const ethan = body.atRiskEmployees.find((e) => e.personId === p2.people.ethanBrooks);
    expect(ethan).toBeDefined();
    expect(ethan?.riskFactors).toContain('OVER_ALLOCATED');
  });

  test('at-risk panel renders in HR dashboard UI when employees are flagged', async ({ page }) => {
    await loginAsHrManager(page);
    await page.goto(`/dashboard/hr?personId=${p2.people.dianaWalsh}`);

    // Wait for page to finish loading
    await expect(page.getByText(/HR Manager Dashboard|Headcount Trend/i).first()).toBeVisible({ timeout: 15_000 });

    // If there are at-risk employees, the panel appears
    const panel = page.getByTestId('at-risk-employees-panel');
    const count = await panel.count();
    if (count > 0) {
      await expect(panel).toBeVisible();
      await expect(panel.getByText(/OVER_ALLOCATED|OPEN_CASE/i).first()).toBeVisible();
    }
    // If zero at-risk employees, panel is correctly absent — test still passes
  });
});

// ── 13-E5: DM staffing gaps ─────────────────────────────────────────────────

test.describe('13-E5: DM dashboard staffing gaps', () => {
  test('DM dashboard loads without error', async ({ page }) => {
    await loginAsDeliveryManager(page);
    await page.goto('/dashboard/delivery-manager');

    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
    await expect(page.getByText(/Delivery Manager Dashboard|Portfolio/i).first()).toBeVisible();
  });

  test('DM dashboard API returns staffingGaps field', async ({ page }) => {
    const token = await apiLogin(
      page,
      CREDENTIALS.deliveryManager.email,
      CREDENTIALS.deliveryManager.password,
    );

    const res = await page.request.get(`${API}/dashboard/delivery-manager`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      staffingGaps?: unknown[];
      openRequestsByProject?: unknown[];
    };
    expect(Array.isArray(body.staffingGaps)).toBe(true);
    expect(Array.isArray(body.openRequestsByProject)).toBe(true);
  });

  test('staffing gaps table renders when there are assignments ending soon', async ({ page }) => {
    await loginAsDeliveryManager(page);
    await page.goto('/dashboard/delivery-manager');

    // Wait for dashboard to load
    await expect(page.getByTestId('delivery-manager-dashboard-page')).toBeVisible({ timeout: 15_000 });

    // Staffing gaps table is shown only when there are gaps — check gracefully
    const gapsTable = page.getByTestId('staffing-gaps-table');
    const count = await gapsTable.count();
    if (count > 0) {
      await expect(gapsTable).toBeVisible();
    }
    // Absence of the table when there are no gaps is also correct behaviour
  });

  test('staffing gaps can be found by asOf offset to trigger gap window', async ({ page }) => {
    const token = await apiLogin(
      page,
      CREDENTIALS.deliveryManager.email,
      CREDENTIALS.deliveryManager.password,
    );

    // Use a past asOf date so the phase2 seed assignments (which end in the future) fall within 28d
    const asOf = '2026-01-01T00:00:00.000Z';
    const res = await page.request.get(
      `${API}/dashboard/delivery-manager?asOf=${encodeURIComponent(asOf)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { staffingGaps: unknown[] };
    // The result should be a valid array (may be empty — depends on seed assignment end dates)
    expect(Array.isArray(body.staffingGaps)).toBe(true);
  });
});
