import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Delivery Central')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('admin can login and see dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@deliverycentral.local');
    await page.fill('input[type="password"]', 'DeliveryCentral@Admin1');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('employee can login and see employee dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'ethan.brooks@example.com');
    await page.fill('input[type="password"]', 'EmployeePass1!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/employee');
    await expect(page.locator('text=Ethan Brooks')).toBeVisible();
  });
});
