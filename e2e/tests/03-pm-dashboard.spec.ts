/**
 * 2d-05 · PM — view project list and dashboard
 * 2d-08 · PM — view PM dashboard, nearing-closure section
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsProjectManager } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const lucas = p2.people.lucasReed;

test.beforeEach(async ({ page }) => {
  await loginAsProjectManager(page);
});

// ── 2d-05 Project list ───────────────────────────────────────────────────────

test.describe('2d-05 PM — view project list', () => {
  test('projects page renders with a list of projects', async ({ page }) => {
    await page.goto('/projects');

    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    // Seed projects include PRJ-101 to PRJ-111
    await expect(page.getByText(/PRJ-10/)).toBeVisible();
  });

  test('clicking a project navigates to project detail page', async ({ page }) => {
    await page.goto('/projects');

    // Click the first project row
    await page.getByRole('row').nth(1).click();

    await expect(page.getByTestId('project-details-page')).toBeVisible();
  });

  test('project detail page shows tabs', async ({ page }) => {
    await page.goto(`/projects/${p2.projects.deliveryCentral}`);

    await expect(page.getByTestId('project-details-page')).toBeVisible();
    // Tabs: Overview, Assignments, Evidence, etc.
    await expect(page.getByRole('tab').first()).toBeVisible();
  });
});

// ── 2d-08 PM dashboard ───────────────────────────────────────────────────────

test.describe('2d-08 PM — PM dashboard with nearing-closure section', () => {
  test('PM dashboard page renders managed projects section', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    await expect(page.getByText(/managed projects|my projects/i)).toBeVisible();
    // Lucas manages multiple seed projects
    await expect(page.getByText(/PRJ-10/)).toBeVisible();
  });

  test('PM dashboard shows attention / nearing-closure section', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    await expect(page.getByText(/Attention Projects|Nearing Closure/i)).toBeVisible();
  });

  test('PM dashboard shows staffing gaps section (Jupiter has gap)', async ({ page }) => {
    await page.goto(`/dashboard/project-manager?personId=${lucas}`);

    await expect(page.getByText(/Staffing Gap/i)).toBeVisible();
    await expect(page.getByText(/Jupiter Client Portal/i)).toBeVisible();
  });

  test('PM dashboard API returns expected shape', async ({ page }) => {
    const token = await getToken(page, p2.accounts.projectManager.email, p2.accounts.projectManager.password);
    const res = await page.request.get(
      `http://127.0.0.1:3000/api/dashboard/project-manager/${lucas}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as {
      managedProjects: unknown[];
      staffingGaps: unknown[];
    };
    expect(Array.isArray(body.managedProjects)).toBeTruthy();
    expect(Array.isArray(body.staffingGaps)).toBeTruthy();
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
