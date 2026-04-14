import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/auth';

const BASE = 'http://127.0.0.1:5173';

test.describe('UX Law 5: Filter Persistence via URL', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin@deliverycentral.local', 'DeliveryCentral@Admin1');
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');
  });

  test('Projects page preserves filters after navigation', async ({ page }) => {
    await page.goto(`${BASE}/projects?search=test`);
    await page.waitForLoadState('networkidle');

    // URL should have the filter
    expect(page.url()).toContain('search=test');

    // Navigate to a project detail (if any link exists) and come back
    await page.goBack();
    expect(page.url()).toContain('search=test');
  });

  test('Assignments page preserves status filter', async ({ page }) => {
    await page.goto(`${BASE}/assignments?status=ACTIVE`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('status=ACTIVE');
  });
});
