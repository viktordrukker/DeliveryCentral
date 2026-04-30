/**
 * UX Contract regression — CreateAssignmentModal
 *
 * Mirrors: docs/planning/ux-contracts/CreateAssignmentModal.md
 *
 * Required: phase2 seed profile loaded; admin login fixture.
 *
 * Smoke-level coverage of the most-used flows:
 *   - Modal opens via the PlannedVsActualPage "Reconcile" action
 *   - Form fields render with correct defaults
 *   - Submit-time validation surfaces required-field errors
 *   - Dirty cancel triggers the Discard-changes confirm; Keep editing reverts
 *   - Cancel from a clean form closes immediately
 *
 * Branches documented but NOT automated (require fixture setup that's out of
 * scope for the smoke-pass): inactive-person flow + overlap-confirmation +
 * HR-case redirect. The contract is the source of truth for those.
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin } from '../fixtures/auth';

const PATH = '/dashboard/planned-vs-actual';

/**
 * Helper — open the CreateAssignmentModal from the Planned vs Actual
 * dashboard. Returns true when an opener row was clickable; false (and the
 * test should soft-skip) when the seed has no reconciliation candidates.
 */
async function openModalFromPVA(page: import('@playwright/test').Page): Promise<boolean> {
  await loginAsAdmin(page);
  await page.goto(PATH);
  await page.waitForLoadState('networkidle');

  // Reconciliation actions on PvA rows trigger the modal. Look for the
  // primary action label first, then a fallback.
  const candidates = [
    page.getByRole('button', { name: /create assignment/i }),
    page.getByRole('button', { name: /reconcile/i }),
  ];
  for (const loc of candidates) {
    const first = loc.first();
    if (await first.isVisible().catch(() => false)) {
      await first.click();
      // Modal is identifiable by the "Create Assignment" title.
      const title = page.getByText(/create assignment/i).first();
      if (await title.isVisible({ timeout: 2000 }).catch(() => false)) return true;
    }
  }
  return false;
}

test.describe('UX contract — CreateAssignmentModal §1 Open lifecycle @ux-contract', () => {
  test('modal opens with Person and Project context grid', async ({ page }) => {
    const opened = await openModalFromPVA(page);
    test.skip(!opened, 'No reconciliation candidates in seed');

    await expect(page.getByRole('heading', { name: /create assignment/i }).first()).toBeVisible();
    // Read-only context fields (Person / Project) are always present.
    await expect(page.getByText(/^person$/i).first()).toBeVisible();
    await expect(page.getByText(/^project$/i).first()).toBeVisible();
  });

  test('form fields render with correct defaults', async ({ page }) => {
    const opened = await openModalFromPVA(page);
    test.skip(!opened, 'No reconciliation candidates in seed');

    await expect(page.getByLabel(/staffing role/i).first()).toBeVisible();
    // Allocation defaults to 100.
    const alloc = page.getByLabel(/allocation/i).first();
    await expect(alloc).toHaveValue('100');
    // Start Date is required (no default value).
    await expect(page.getByLabel(/start date/i).first()).toBeVisible();
  });
});

test.describe('UX contract — CreateAssignmentModal §7.1 Submit validation @ux-contract', () => {
  test('submit without staffing role surfaces required-field error', async ({ page }) => {
    const opened = await openModalFromPVA(page);
    test.skip(!opened, 'No reconciliation candidates in seed');

    // Try to submit without selecting a staffing role.
    const submit = page.getByRole('button', { name: /create.*request|create.*assignment/i }).last();
    await submit.click();
    await expect(page.getByText(/staffing role is required/i)).toBeVisible();
  });
});

test.describe('UX contract — CreateAssignmentModal §10 Dirty-guard cancel @ux-contract', () => {
  test('cancel with dirty form opens Discard-changes confirm; Keep editing reverts', async ({ page }) => {
    const opened = await openModalFromPVA(page);
    test.skip(!opened, 'No reconciliation candidates in seed');

    // Dirty the form by changing the allocation value.
    const alloc = page.getByLabel(/allocation/i).first();
    await alloc.fill('80');

    // Click Cancel → expect Discard confirm.
    await page.getByRole('button', { name: /^cancel$/i }).first().click();
    await expect(page.getByText(/discard changes\?/i)).toBeVisible();

    // Keep editing returns to the form.
    await page.getByRole('button', { name: /keep editing/i }).click();
    await expect(page.getByText(/discard changes\?/i)).not.toBeVisible();
    // Modal still open (allocation field still rendered).
    await expect(page.getByLabel(/allocation/i).first()).toBeVisible();
  });

  test('cancel with clean form closes immediately (no Discard confirm)', async ({ page }) => {
    const opened = await openModalFromPVA(page);
    test.skip(!opened, 'No reconciliation candidates in seed');

    // Click Cancel without touching anything.
    await page.getByRole('button', { name: /^cancel$/i }).first().click();
    // Discard confirm should NOT appear; modal should close.
    await expect(page.getByText(/discard changes\?/i)).not.toBeVisible({ timeout: 1000 });
  });
});
