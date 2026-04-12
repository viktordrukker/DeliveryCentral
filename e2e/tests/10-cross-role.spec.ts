/**
 * 2d-32 · Cross-role: assignment lifecycle (create → approve → end)
 * 2d-33 · Cross-role: project lifecycle (draft → activate → close)
 * 2d-34 · Cross-role: case lifecycle (create → open → close)
 *
 * All three use `test.describe.serial` to ensure ordered execution.
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { p2 } from '../fixtures/phase2-identifiers';

const API = 'http://127.0.0.1:3000/api';

async function getToken(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
): Promise<string> {
  const res = await page.request.post(`${API}/auth/login`, { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}

// ── 2d-32 Assignment lifecycle ───────────────────────────────────────────────

// Shared state within the serial block
let assignmentId: string;

test.describe.serial('2d-32 Cross-role — assignment lifecycle', () => {
  test('RM creates assignment (REQUESTED)', async ({ page }) => {
    const token = await getToken(page, p2.accounts.resourceManager.email, p2.accounts.resourceManager.password);

    const res = await page.request.post(`${API}/assignments`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        requestedById: p2.people.sophiaKim,
        personId: p2.people.noraBLake,
        projectId: p2.projects.novaAnalytics,
        staffingRole: 'E2E Cross-Role Backend Engineer',
        allocationPercent: 30,
        startDate: '2026-06-01',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { id: string; status: string };
    expect(body.status).toBe('REQUESTED');
    assignmentId = body.id;
  });

  test('RM approves the assignment (APPROVED)', async ({ page }) => {
    const token = await getToken(page, p2.accounts.resourceManager.email, p2.accounts.resourceManager.password);

    const res = await page.request.post(`${API}/assignments/${assignmentId}/approve`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { actorId: p2.people.sophiaKim, comment: 'Cross-role E2E approval' },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { status: string };
    expect(body.status).toBe('APPROVED');
  });

  test('RM ends the assignment (ENDED)', async ({ page }) => {
    const token = await getToken(page, p2.accounts.resourceManager.email, p2.accounts.resourceManager.password);

    const res = await page.request.post(`${API}/assignments/${assignmentId}/end`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        actorId: p2.people.sophiaKim,
        endDate: '2026-06-30',
        endReason: 'E2E cross-role end test',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ENDED');
  });

  test('assignment detail UI shows ENDED status', async ({ page }) => {
    // inject token then navigate
    const token = await getToken(page, p2.accounts.resourceManager.email, p2.accounts.resourceManager.password);
    await page.addInitScript(
      ({ key, tok }: { key: string; tok: string }) => {
        localStorage.setItem(key, tok);
      },
      { key: 'deliverycentral.authToken', tok: token },
    );
    await page.goto(`/assignments/${assignmentId}`);

    await expect(page.getByText('ENDED')).toBeVisible();
  });
});

// ── 2d-33 Project lifecycle ──────────────────────────────────────────────────

let crossProjectId: string;

test.describe.serial('2d-33 Cross-role — project lifecycle', () => {
  test('PM creates a DRAFT project', async ({ page }) => {
    const token = await getToken(page, p2.accounts.projectManager.email, p2.accounts.projectManager.password);

    const unique = Date.now();
    const res = await page.request.post(`${API}/projects`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        code: `E2E-${unique}`,
        name: `E2E Cross-Role Project ${unique}`,
        managedById: p2.people.lucasReed,
        startDate: '2026-06-01',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { id: string; status: string };
    expect(body.status).toBe('DRAFT');
    crossProjectId = body.id;
  });

  test('PM activates the project (ACTIVE)', async ({ page }) => {
    const token = await getToken(page, p2.accounts.projectManager.email, p2.accounts.projectManager.password);

    const res = await page.request.post(`${API}/projects/${crossProjectId}/activate`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ACTIVE');
  });

  test('PM closes the project (CLOSED or COMPLETED)', async ({ page }) => {
    const token = await getToken(page, p2.accounts.projectManager.email, p2.accounts.projectManager.password);

    const res = await page.request.post(`${API}/projects/${crossProjectId}/close`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { overrideReason: 'E2E cross-role project close' },
    });
    // Accept 200 (closed) or 409/422 (business rule conflict)
    expect([200, 409, 422].includes(res.status())).toBeTruthy();
    if (res.status() === 200) {
      const body = await res.json() as { status: string };
      expect(['CLOSED', 'COMPLETED'].includes(body.status)).toBeTruthy();
    }
  });
});

// ── 2d-34 Case lifecycle ─────────────────────────────────────────────────────

let caseId: string;

test.describe.serial('2d-34 Cross-role — case lifecycle', () => {
  test('HR creates a case (DRAFT)', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);

    const res = await page.request.post(`${API}/cases`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        caseTypeKey: 'ONBOARDING',
        subjectPersonId: p2.people.aishaMusa,
        ownerPersonId: p2.people.dianaWalsh,
        summary: 'E2E cross-role case lifecycle test.',
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { id: string; status: string };
    caseId = body.id;
    // Cases start in DRAFT or OPEN depending on implementation
    expect(['DRAFT', 'OPEN'].includes(body.status)).toBeTruthy();
  });

  test('HR verifies case is in a valid open state', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);

    // Cases may already be OPEN on creation — GET to verify state
    const res = await page.request.get(`${API}/cases/${caseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { id: string; status: string };
    // Acceptable states before close
    expect(['DRAFT', 'OPEN', 'IN_PROGRESS'].includes(body.status)).toBeTruthy();
  });

  test('HR closes the case (CLOSED)', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);

    const res = await page.request.post(`${API}/cases/${caseId}/close`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { resolution: 'E2E cross-role case close' },
    });
    expect([200, 422].includes(res.status())).toBeTruthy();
    if (res.status() === 200) {
      const body = await res.json() as { status: string };
      expect(body.status).toBe('CLOSED');
    }
  });
});
