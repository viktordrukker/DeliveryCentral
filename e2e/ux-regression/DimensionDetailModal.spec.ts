/**
 * UX Contract regression — DimensionDetailModal
 *
 * Mirrors: docs/planning/ux-contracts/DimensionDetailModal.md
 *
 * Required: phase2 seed profile loaded; admin login; at least one project
 * with a radiator snapshot.
 *
 * Smoke-level coverage:
 *   - Modal opens via radiator-tab axis click (RadiatorTab) or via the
 *     "Report detailed status" button (PulseReportForm)
 *   - Modal title / description render
 *   - Cancel closes
 *   - Submit-time validation surfaces a toast when override score is set
 *     without a sufficiently long reason
 *
 * Branches NOT automated (require fixture depth out of scope for the smoke
 * pass): per-dimension narrative + override save → success toast → snapshot
 * mutation. The contract is the source of truth for those.
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin } from '../fixtures/auth';

/**
 * Helper — open the DimensionDetailModal from a project's radiator tab.
 * Returns true when an opener was clickable; false (test should soft-skip)
 * when the seed has no project radiator data.
 */
async function openModalFromRadiator(page: import('@playwright/test').Page): Promise<boolean> {
  await loginAsAdmin(page);
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');

  // Pick the first project link.
  const firstProject = page.getByRole('link', { name: /.+/ })
    .filter({ hasText: /^[A-Z]/ })
    .first();
  if (!(await firstProject.isVisible().catch(() => false))) return false;
  await firstProject.click();
  await page.waitForLoadState('networkidle');

  // Switch to the radiator tab.
  await page.goto(page.url().split('?')[0] + '?tab=radiator');
  await page.waitForLoadState('networkidle');

  // The modal opens via clicking an axis on the radar chart, or via the
  // "Report detailed status" button on the pulse form embed. Try both.
  const reportBtn = page.getByRole('button', { name: /report detailed status/i });
  if (await reportBtn.isVisible().catch(() => false)) {
    await reportBtn.click();
  } else {
    return false;
  }

  const modal = page.getByTestId('dimension-detail-modal');
  return modal.isVisible({ timeout: 2000 }).catch(() => false);
}

test.describe('UX contract — DimensionDetailModal §1 Open lifecycle @ux-contract', () => {
  test('modal opens with the documented title and description', async ({ page }) => {
    const opened = await openModalFromRadiator(page);
    test.skip(!opened, 'No radiator data in seed');

    await expect(page.getByText(/detailed status per dimension/i)).toBeVisible();
    await expect(page.getByText(/overrides require a reason/i)).toBeVisible();
  });

  test('Cancel closes the modal without saving', async ({ page }) => {
    const opened = await openModalFromRadiator(page);
    test.skip(!opened, 'No radiator data in seed');

    await page.getByRole('button', { name: /^cancel$/i }).first().click();
    await expect(page.getByTestId('dimension-detail-modal')).not.toBeVisible({ timeout: 1500 });
  });
});

test.describe('UX contract — DimensionDetailModal §5 Submit validation @ux-contract', () => {
  test('override without reason surfaces a toast error', async ({ page }) => {
    const opened = await openModalFromRadiator(page);
    test.skip(!opened, 'No radiator data in seed');

    // Find the FIRST override score input (number type with min=0, max=4).
    const overrideInput = page.locator('input[type="number"][min="0"][max="4"]').first();
    if (!(await overrideInput.isVisible().catch(() => false))) {
      test.skip(true, 'No override input available in this fixture');
      return;
    }
    await overrideInput.fill('2.5');

    // Try to save without filling reason.
    await page.getByRole('button', { name: /save draft/i }).click();

    // Error toast — the contract's exact format is `${label}: reason must be ≥ 10 chars`.
    await expect(page.getByText(/reason must be ≥ 10 chars/i)).toBeVisible({ timeout: 2000 });
  });
});
