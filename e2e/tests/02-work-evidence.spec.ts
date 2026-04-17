/**
 * 2d-03 (extended) · Work evidence — additional scenarios
 *
 * Validates the work evidence page behaviour across different users.
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsDeliveryManager, loginAsProjectManager } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const lucas = p2.people.lucasReed;
const carlos = p2.people.carlosVega;

test.describe('@critical Work evidence — delivery manager view', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDeliveryManager(page);
  });

  test('work-evidence page loads for delivery manager', async ({ page }) => {
    await page.goto('/work-evidence');

    await expect(page.getByTestId('work-evidence-page')).toBeVisible();
  });

  test('observed work section renders existing entries', async ({ page }) => {
    await page.goto('/work-evidence');

    // Phase2 seed has evidence records — section should appear
    await expect(page.getByRole('heading', { name: /Observed Work|Work Evidence/i })).toBeVisible();
  });
});

test.describe('@critical Work evidence — project manager records evidence', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsProjectManager(page);
  });

  test('PM can navigate to work evidence page', async ({ page }) => {
    await page.goto('/work-evidence');

    await expect(page.getByTestId('work-evidence-page')).toBeVisible();
    await expect(page.getByTestId('create-work-evidence-form')).toBeVisible();
  });

  test('PM can submit a work evidence entry', async ({ page }) => {
    await page.goto('/work-evidence');

    const form = page.getByTestId('create-work-evidence-form');

    await form.getByLabel('Person').selectOption(lucas);
    await form.getByLabel('Project').selectOption(p2.projects.deliveryCentral);
    await form.getByLabel('Source Type').fill('MANUAL');
    await form.getByLabel('Source Record Key').fill(`E2E-LUCAS-WE-${Date.now()}`);
    await form.getByLabel('Recorded At').fill('2026-03-15T10:00');
    await form.getByLabel('Effort Hours').fill('2');
    await form.getByLabel('Summary').fill('E2E PM work evidence entry.');
    await form.getByRole('button', { name: /Record work evidence/i }).click();

    await expect(page.getByTestId('work-evidence-success')).toContainText('Work evidence recorded');
  });
});

test.describe('@critical Work evidence — planned vs actual page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDeliveryManager(page);
  });

  test('planned vs actual page is reachable', async ({ page }) => {
    await page.goto('/dashboard/planned-vs-actual');

    await expect(page.getByTestId('planned-vs-actual-page')).toBeVisible();
  });
});
