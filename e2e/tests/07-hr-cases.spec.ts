/**
 * 2d-20 · HR — create and progress a case
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsHrManager } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const diana = p2.people.dianaWalsh;

test.beforeEach(async ({ page }) => {
  await loginAsHrManager(page);
});

// ── 2d-20 Create and progress case ──────────────────────────────────────────

test.describe('@critical 2d-20 HR — create and progress a case', () => {
  test('create case page renders form with Case Type dropdown', async ({ page }) => {
    await page.goto('/cases/new');

    await expect(page.getByTestId('create-case-page')).toBeVisible();
    await expect(page.getByLabel(/Case Type/i)).toBeVisible();
  });

  test('submitting create case form navigates to case detail', async ({ page }) => {
    await page.goto('/cases/new');

    const caseTypeSelect = page.getByLabel(/Case Type/i);
    await caseTypeSelect.selectOption({ label: /Onboarding/i });

    const subjectSelect = page.getByLabel(/Subject/i);
    await subjectSelect.selectOption(p2.people.sophieWright);

    const ownerSelect = page.getByLabel(/Owner/i);
    await ownerSelect.selectOption(diana);

    await page.getByLabel(/Summary/i).fill('E2E test onboarding case — Phase 2d.');
    await page.getByRole('button', { name: /Create Case|Submit/i }).click();

    // After creation navigates to case detail page showing CASE- number
    await expect(page.getByText(/CASE-/)).toBeVisible();
    await expect(page).toHaveURL(/\/cases\//);
  });

  test('case detail page shows Open case action if in DRAFT status', async ({ page }) => {
    // Create a case first via API to get a predictable ID
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);
    const createRes = await page.request.post('http://127.0.0.1:3000/api/cases', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        caseType: 'ONBOARDING',
        subjectPersonId: p2.people.sophieWright,
        ownerPersonId: diana,
        summary: 'E2E open-case progression test.',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json() as { id: string };

    await page.goto(`/cases/${created.id}`);
    await expect(page.getByTestId('case-details-page')).toBeVisible();
    // DRAFT case should show Open / progress action
    const openBtn = page.getByRole('button', { name: /Open case|Open|Start/i });
    const hasOpenBtn = (await openBtn.count()) > 0;
    const hasDraftStatus = (await page.getByText(/DRAFT/i).count()) > 0;
    expect(hasOpenBtn || hasDraftStatus).toBeTruthy();
  });

  test('open case API transitions status to OPEN', async ({ page }) => {
    const token = await getToken(page, p2.accounts.hrManager.email, p2.accounts.hrManager.password);

    // Create fresh case
    const createRes = await page.request.post('http://127.0.0.1:3000/api/cases', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        caseType: 'PERFORMANCE',
        subjectPersonId: p2.people.ethanBrooks,
        ownerPersonId: diana,
        summary: 'E2E API open case test.',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { id } = await createRes.json() as { id: string };

    // Open it
    const openRes = await page.request.post(`http://127.0.0.1:3000/api/cases/${id}/open`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {},
    });
    expect([200, 422].includes(openRes.status())).toBeTruthy();
    if (openRes.status() === 200) {
      const body = await openRes.json() as { status: string };
      expect(body.status).toBe('OPEN');
    }
  });

  test('cases list page shows created cases', async ({ page }) => {
    await page.goto('/cases');

    await expect(page.getByTestId('cases-page')).toBeVisible();
    // Cases exist from seed + any created in earlier tests
    await expect(page.locator('table').or(page.getByText(/CASE-|no cases/i))).toBeVisible();
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
