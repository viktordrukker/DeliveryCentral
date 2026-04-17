import { expect, test } from '@playwright/test';

import { demoIdentifiers } from './fixtures/demo-identifiers';

test.describe('@full Workload platform happy path', () => {
  test('user browses people and projects, creates and approves an assignment, records evidence, and reviews comparison output', async ({
    page,
  }) => {
    await page.goto('/people');

    await expect(page.getByTestId('employee-directory-page')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search' }).fill('Zoe Turner');
    await page.getByRole('row', { name: /Zoe Turner/ }).click();

    await expect(page.getByTestId('employee-details-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: 'Zoe Turner' })).toBeVisible();
    await expect(page.getByText('Consulting Delivery')).toBeVisible();

    await page.goto('/projects');

    await expect(page.getByTestId('project-registry-page')).toBeVisible();
    await page.getByRole('searchbox', { name: 'Search' }).fill('Internal Bench Planning');
    await page.getByRole('row', { name: /Internal Bench Planning/ }).click();

    await expect(page.getByTestId('project-details-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Internal Bench Planning' }),
    ).toBeVisible();
    await expect(page.getByText('No external links')).toBeVisible();

    await page.goto('/assignments/new');

    await expect(page.getByTestId('create-assignment-page')).toBeVisible();
    const assignmentForm = page.getByTestId('create-assignment-form');

    await assignmentForm.getByLabel('Requested By').selectOption(demoIdentifiers.people.liamPatel);
    await assignmentForm.getByLabel('Person').selectOption(demoIdentifiers.people.zoeTurner);
    await assignmentForm
      .getByLabel('Project')
      .selectOption(demoIdentifiers.projects.internalBenchPlanning);
    await assignmentForm.getByLabel('Staffing Role').fill('Consultant');
    await assignmentForm.getByLabel('Allocation Percent').fill('25');
    await assignmentForm.getByLabel('Start Date').fill('2025-03-01');
    await assignmentForm.getByLabel('Note').fill('E2E staffing request for bench planning.');
    await assignmentForm.getByRole('button', { name: 'Create Assignment' }).click();

    await expect(page.getByRole('status')).toContainText(
      'Assignment created with status REQUESTED.',
    );

    await page.goto(`/org/managers/${demoIdentifiers.people.liamPatel}/scope`);

    await expect(page.getByTestId('manager-scope-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Liam Patel Scope' }),
    ).toBeVisible();

    const zoeScopeCard = page.locator('.scope-card', { hasText: 'Zoe Turner' });
    await zoeScopeCard.getByRole('link', { name: 'View assignments' }).click();

    await expect(page.getByTestId('assignments-page')).toBeVisible();
    await page.getByRole('row', { name: /Zoe Turner/ }).click();

    await expect(page.getByTestId('assignment-details-page')).toBeVisible();
    await page.getByLabel('Workflow Actor').fill(demoIdentifiers.people.liamPatel);
    await page.getByLabel('Approval Comment').fill('Approved during E2E validation.');

    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'Approve assignment' }).click();

    await expect(page.getByRole('status')).toContainText('Assignment approved successfully.');
    await expect(page.getByText('APPROVED')).toBeVisible();

    await page.goto('/work-evidence');

    await expect(page.getByTestId('work-evidence-page')).toBeVisible();
    const evidenceForm = page.getByTestId('create-work-evidence-form');

    await evidenceForm.getByLabel('Person').selectOption(demoIdentifiers.people.zoeTurner);
    await evidenceForm
      .getByLabel('Project')
      .selectOption(demoIdentifiers.projects.internalBenchPlanning);
    await evidenceForm.getByLabel('Source Type').fill('MANUAL');
    await evidenceForm.getByLabel('Source Record Key').fill('E2E-ZOE-BENCH-001');
    await evidenceForm.getByLabel('Recorded At').fill('2025-03-10T09:00');
    await evidenceForm.getByLabel('Effort Hours').fill('2');
    await evidenceForm.getByLabel('Summary').fill('Manual validation evidence for the E2E flow.');
    await evidenceForm.getByRole('button', { name: 'Record work evidence' }).click();

    await expect(page.getByTestId('work-evidence-success')).toContainText(
      'Work evidence recorded.',
    );

    const observedWorkSection = page.locator('section', { hasText: 'Observed Work' });
    await expect(observedWorkSection.getByText('Zoe Turner')).toBeVisible();
    await expect(observedWorkSection.getByText('Internal Bench Planning')).toBeVisible();

    await page.goto('/dashboard/planned-vs-actual');

    await expect(page.getByTestId('planned-vs-actual-page')).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Project ID' })
      .fill(demoIdentifiers.projects.internalBenchPlanning);
    await page
      .getByRole('textbox', { name: 'Person ID' })
      .fill(demoIdentifiers.people.zoeTurner);

    const matchedRecordsSection = page.locator('section', { hasText: 'Matched Records' });
    await expect(matchedRecordsSection.getByText('Zoe Turner')).toBeVisible();
    await expect(matchedRecordsSection.getByText('Internal Bench Planning')).toBeVisible();
    await expect(matchedRecordsSection.getByText('Consultant')).toBeVisible();
    await expect(matchedRecordsSection.getByText('2h')).toBeVisible();
    await expect(page.getByText('No assigned contributors are missing evidence for the current selection.')).toBeVisible();
    await expect(page.getByText('All observed work currently maps to an approved assignment for the current selection.')).toBeVisible();
  });
});

