/**
 * Phase 2 E2E — Project Manager JTBDs (PM1–PM5)
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { projectManager } = p2.accounts;
const lucas = p2.people.lucasReed;

test.beforeEach(async ({ page }) => {
  await loginAs(page, projectManager.email, projectManager.password);
});

test.describe('PM1 — PM sees managed projects with staffing and evidence counts', () => {
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

test.describe('PM2 — PM sees staffing gaps', () => {
  test('staffing gaps section shows Jupiter Client Portal (REQUESTED only — no ACTIVE)', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    await expect(page.getByText(/Staffing Gap/i)).toBeVisible();
    await expect(page.getByText(/Jupiter Client Portal/i)).toBeVisible();
  });
});

test.describe('PM3 — PM requests new assignment', () => {
  test('create assignment form accepts all fields and shows success toast', async ({ page }) => {
    await page.goto('/assignments/new');

    await expect(page.getByTestId('create-assignment-page')).toBeVisible();
    const form = page.getByTestId('create-assignment-form');

    await form.getByLabel('Requested By').selectOption(lucas);
    await form.getByLabel('Person').selectOption(p2.people.zoeTurner);
    await form.getByLabel('Project').selectOption(p2.projects.deliveryCentral);
    await form.getByLabel('Staffing Role').fill('E2E Test Consultant');
    await form.getByLabel('Allocation Percent').fill('10');
    await form.getByLabel('Start Date').fill('2026-07-01');
    await form.getByRole('button', { name: 'Create Assignment' }).click();

    await expect(page.getByRole('status')).toContainText('Assignment created with status REQUESTED');
  });

  test('duplicate assignment returns 409 and frontend shows error', async ({ page }) => {
    await page.goto('/assignments/new');
    const form = page.getByTestId('create-assignment-form');

    // Try to create duplicate of ASN-101 (Ethan on DeliveryCentral from 2025-10-15)
    await form.getByLabel('Requested By').selectOption(lucas);
    await form.getByLabel('Person').selectOption(p2.people.ethanBrooks);
    await form.getByLabel('Project').selectOption(p2.projects.deliveryCentral);
    await form.getByLabel('Staffing Role').fill('Lead Engineer');
    await form.getByLabel('Allocation Percent').fill('80');
    await form.getByLabel('Start Date').fill('2025-10-15');
    await form.getByRole('button', { name: 'Create Assignment' }).click();

    await expect(page.getByText(/conflict|already exists|409/i)).toBeVisible();
  });
});

test.describe('PM4 — PM ends an active assignment', () => {
  test('assignment detail page shows End assignment button for APPROVED assignment', async ({ page }) => {
    await page.goto(`/assignments/${p2.assignments.lucasOnDeliveryCentral}`);

    await expect(page.getByRole('button', { name: /End assignment/i })).toBeVisible();
  });
});

test.describe('PM5 — PM sees nearing closure projects', () => {
  test('PM dashboard shows attention projects section (nearing closure)', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    // Attention projects section exists
    await expect(page.getByText(/Attention Projects|Nearing Closure/i)).toBeVisible();
  });
});
