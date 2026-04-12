/**
 * 2d-02 · Employee — own dashboard
 * 2d-03 · Employee — log work evidence entry
 * 2d-04 · Employee — view case status
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsEmployee } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const ethan = p2.people.ethanBrooks;

// ── 2d-02 Employee dashboard ─────────────────────────────────────────────────

test.describe('2d-02 Employee — own dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test('employee dashboard renders with name and allocation info', async ({ page }) => {
    await page.goto(`/dashboard/employee?personId=${ethan}`);

    // Dashboard heading is visible
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();

    // Ethan's name appears
    await expect(page.getByText(/Ethan Brooks/i)).toBeVisible();
  });

  test('employee sees overallocation warning (120% allocated)', async ({ page }) => {
    await page.goto(`/dashboard/employee?personId=${ethan}`);

    // 80% + 40% = 120% — overallocation indicator present
    await expect(page.getByText(/120\s*%/)).toBeVisible();
  });

  test('employee sees current assignments section', async ({ page }) => {
    await page.goto(`/dashboard/employee?personId=${ethan}`);

    // Lead Engineer assignment on DeliveryCentral project
    await expect(page.getByText(/Lead Engineer/i)).toBeVisible();
  });
});

// ── 2d-03 Employee — log work evidence ──────────────────────────────────────

test.describe('2d-03 Employee — log work evidence entry', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test('work evidence page is reachable and form renders', async ({ page }) => {
    await page.goto('/work-evidence');

    await expect(page.getByTestId('work-evidence-page')).toBeVisible();
    const form = page.getByTestId('create-work-evidence-form');
    await expect(form).toBeVisible();
  });

  test('submitting work evidence form records an entry', async ({ page }) => {
    await page.goto('/work-evidence');

    const form = page.getByTestId('create-work-evidence-form');

    await form.getByLabel('Person').selectOption(ethan);
    await form.getByLabel('Project').selectOption(p2.projects.deliveryCentral);
    await form.getByLabel('Source Type').fill('MANUAL');
    await form.getByLabel('Source Record Key').fill(`E2E-ETHAN-${Date.now()}`);
    await form.getByLabel('Recorded At').fill('2026-03-01T09:00');
    await form.getByLabel('Effort Hours').fill('3');
    await form.getByLabel('Summary').fill('E2E test work evidence entry for Ethan.');
    await form.getByRole('button', { name: /Record work evidence/i }).click();

    await expect(page.getByTestId('work-evidence-success')).toContainText('Work evidence recorded');
  });
});

// ── 2d-04 Employee — view case status ───────────────────────────────────────

test.describe('2d-04 Employee — view case status', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page);
  });

  test('cases page renders without error', async ({ page }) => {
    await page.goto('/cases');

    await expect(page.getByTestId('cases-page')).toBeVisible();
  });

  test('cases list renders (empty state or rows — no JS error)', async ({ page }) => {
    await page.goto('/cases');

    // Either a table row exists or an empty-state message appears
    const hasRows = await page.locator('table tbody tr').count();
    const hasEmpty = await page.getByText(/no cases|no results|empty/i).count();
    expect(hasRows + hasEmpty).toBeGreaterThan(0);
  });
});
