/**
 * 2d-09 · RM — create assignment
 * 2d-10 · RM — approve assignment
 * 2d-11 · RM — reject assignment
 * 2d-12 · RM — end assignment
 * 2d-13 · RM — bulk assign team
 * 2d-14 · RM — view RM dashboard
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsResourceManager } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const sophia = p2.people.sophiaKim;
const lucas = p2.people.lucasReed;

test.beforeEach(async ({ page }) => {
  await loginAsResourceManager(page);
});

// ── 2d-09 Create assignment ──────────────────────────────────────────────────

test.describe('@critical 2d-09 RM — create assignment', () => {
  test('create assignment page renders the form', async ({ page }) => {
    await page.goto('/assignments/new');

    await expect(page.getByTestId('create-assignment-page')).toBeVisible();
    await expect(page.getByTestId('create-assignment-form')).toBeVisible();
  });

  test('submitting create assignment form shows success toast', async ({ page }) => {
    await page.goto('/assignments/new');

    const form = page.getByTestId('create-assignment-form');

    await form.getByLabel('Requested By').selectOption(sophia);
    await form.getByLabel('Person').selectOption(p2.people.zoeTurner);
    await form.getByLabel('Project').selectOption(p2.projects.atlasERP);
    await form.getByLabel('Staffing Role').fill('E2E RM Test Role');
    await form.getByLabel('Allocation Percent').fill('20');
    await form.getByLabel('Start Date').fill('2026-06-01');
    await form.getByRole('button', { name: 'Create Assignment' }).click();

    await expect(page.getByRole('status')).toContainText(/Assignment created/i);
  });
});

// ── 2d-10 Approve assignment ─────────────────────────────────────────────────

test.describe('@critical 2d-10 RM — approve assignment', () => {
  test('REQUESTED assignment detail shows Approve button', async ({ page }) => {
    await page.goto(`/assignments/${p2.assignments.rajOnJupiterRequested}`);

    await expect(page.getByText(/REQUESTED/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Approve assignment/i })).toBeVisible();
  });

  test('approve assignment via API transitions to APPROVED', async ({ page }) => {
    const token = await getToken(page, p2.accounts.resourceManager.email, p2.accounts.resourceManager.password);
    const res = await page.request.post(
      `http://127.0.0.1:3000/api/assignments/${p2.assignments.rajOnMercuryRequested}/approve`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { actorId: sophia, comment: 'E2E approve test' },
      },
    );
    // 200 = approved, 422 = already in final state (idempotent across runs)
    expect([200, 422].includes(res.status())).toBeTruthy();
    if (res.status() === 200) {
      const body = await res.json() as { status: string };
      expect(body.status).toBe('APPROVED');
    }
  });
});

// ── 2d-11 Reject assignment ──────────────────────────────────────────────────

test.describe('@critical 2d-11 RM — reject assignment', () => {
  test('REQUESTED assignment detail shows Reject button', async ({ page }) => {
    await page.goto(`/assignments/${p2.assignments.rajOnJupiterRequested}`);

    await expect(page.getByRole('button', { name: /Reject assignment/i })).toBeVisible();
  });

  test('reject assignment via API (with actor) transitions to REJECTED', async ({ page }) => {
    const token = await getToken(page, p2.accounts.resourceManager.email, p2.accounts.resourceManager.password);

    // First create a new REQUESTED assignment to reject (so we don't deplete seed data)
    const createRes = await page.request.post('http://127.0.0.1:3000/api/assignments', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        requestedById: sophia,
        personId: p2.people.harperAli,
        projectId: p2.projects.atlasERP,
        staffingRole: 'E2E Reject Test',
        allocationPct: 10,
        startDate: '2026-07-01',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json() as { id: string };

    const rejectRes = await page.request.post(
      `http://127.0.0.1:3000/api/assignments/${created.id}/reject`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { actorId: sophia, comment: 'E2E reject test' },
      },
    );
    expect(rejectRes.ok()).toBeTruthy();
    const body = await rejectRes.json() as { status: string };
    expect(body.status).toBe('REJECTED');
  });
});

// ── 2d-12 End assignment ─────────────────────────────────────────────────────

test.describe('@critical 2d-12 RM — end assignment', () => {
  test('APPROVED assignment shows End assignment button', async ({ page }) => {
    await page.goto(`/assignments/${p2.assignments.ethanOnDeliveryCentral}`);

    await expect(page.getByTestId('assignment-details-page')).toBeVisible();
    await expect(page.getByRole('button', { name: /End assignment/i })).toBeVisible();
  });

  test('end assignment via API transitions to ENDED', async ({ page }) => {
    const token = await getToken(page, p2.accounts.resourceManager.email, p2.accounts.resourceManager.password);

    // Create then approve then end a fresh assignment
    const createRes = await page.request.post('http://127.0.0.1:3000/api/assignments', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        requestedById: sophia,
        personId: p2.people.miaLopez,
        projectId: p2.projects.beaconMobile,
        staffingRole: 'E2E End Test',
        allocationPct: 5,
        startDate: '2026-05-01',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id } = await createRes.json() as { id: string };

    // Approve it
    await page.request.post(`http://127.0.0.1:3000/api/assignments/${id}/approve`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { actorId: sophia },
    });

    // End it
    const endRes = await page.request.post(`http://127.0.0.1:3000/api/assignments/${id}/end`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { actorId: sophia, endDate: '2026-05-31', endReason: 'E2E end test' },
    });
    expect(endRes.ok()).toBeTruthy();
    const body = await endRes.json() as { status: string };
    expect(body.status).toBe('ENDED');
  });
});

// ── 2d-13 Bulk assign team ───────────────────────────────────────────────────

test.describe('@critical 2d-13 RM — bulk assign team', () => {
  test('bulk assignment page renders with form', async ({ page }) => {
    await page.goto('/assignments/bulk');

    await expect(page.getByTestId('bulk-assignment-page')).toBeVisible();
  });

  test('bulk assignment page has project selector', async ({ page }) => {
    await page.goto('/assignments/bulk');

    await expect(page.getByLabel(/Project/i)).toBeVisible();
  });
});

// ── 2d-14 RM dashboard ───────────────────────────────────────────────────────

test.describe('@critical 2d-14 RM — view RM dashboard', () => {
  test('RM dashboard renders allocation indicators', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByText(/Allocation Indicator/i)).toBeVisible();
  });

  test('RM dashboard shows Ethan Brooks as OVERALLOCATED', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByText(/Ethan Brooks/)).toBeVisible();
    await expect(page.getByText(/OVERALLOCATED/i)).toBeVisible();
  });

  test('RM dashboard shows Capacity section', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByRole('heading', { name: /Capacity/i })).toBeVisible();
  });

  test('RM dashboard shows Pipeline / Future section', async ({ page }) => {
    await page.goto(`/dashboard/resource-manager?personId=${sophia}`);

    await expect(page.getByRole('heading', { name: /Pipeline|Future/i })).toBeVisible();
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
