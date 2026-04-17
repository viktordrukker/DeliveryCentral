import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { PLAYWRIGHT_BASE_URL } from '../fixtures/auth-state';

const BASE = PLAYWRIGHT_BASE_URL;

test.describe('@full UX Law 9: Every KPI is a Clickable Drilldown', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'lucas.reed@example.com', 'ProjectMgrPass1!');
    await page.goto(`${BASE}/dashboard/project-manager`);
    await page.waitForLoadState('networkidle');
  });

  test('PM dashboard stat cards are clickable links', async ({ page }) => {
    // StatCards render inside MUI CardActionArea which is an anchor
    const statCards = page.locator('.stat-card a, .details-summary-grid a');
    const count = await statCards.count();

    // Expect at least some KPI cards
    expect(count).toBeGreaterThan(0);

    // Each should have an href attribute
    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await statCards.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});
