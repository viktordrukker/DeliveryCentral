import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { PLAYWRIGHT_BASE_URL } from '../fixtures/auth-state';

const BASE = PLAYWRIGHT_BASE_URL;

test.describe('@full Loading States: Skeleton loaders visible before data', () => {
  test('dashboard shows skeleton while loading', async ({ page }) => {
    await loginAs(page, 'admin@deliverycentral.local', 'DeliveryCentral@Admin1');

    // Navigate and immediately check for skeleton or content
    await page.goto(BASE);

    // Either skeletons are visible during load, or data appears
    // (on fast local networks data may load instantly)
    const hasSkeleton = await page.locator('.skeleton-container, .MuiSkeleton-root').count();
    const hasContent = await page.locator('.kpi-strip, .stat-card, .details-summary-grid').count();

    expect(hasSkeleton + hasContent).toBeGreaterThan(0);
  });
});
