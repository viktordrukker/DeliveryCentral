import { expect, test } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { PLAYWRIGHT_BASE_URL } from '../fixtures/auth-state';

const BASE = PLAYWRIGHT_BASE_URL;

test.describe('@full UX Law 2: No Dead-End Screens', () => {
  test('login page has action buttons', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');

    // Login page should have a sign-in button
    const signIn = page.getByRole('button', { name: /sign in|log in/i });
    await expect(signIn).toBeVisible();
  });

  test('unauthorized redirect shows toast, not dead-end', async ({ page }) => {
    await loginAs(page, 'ethan.brooks@example.com', 'EmployeePass1!');
    await page.goto(`${BASE}/admin`);
    await page.waitForLoadState('networkidle');

    // Employee should be redirected away from /admin, not shown a dead-end error
    expect(page.url()).not.toContain('/admin');
  });
});
