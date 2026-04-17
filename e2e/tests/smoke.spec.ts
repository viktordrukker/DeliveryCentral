import { test, expect } from '@playwright/test';

test.describe('@smoke Smoke tests', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Delivery Central')).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('admin can login and see dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@deliverycentral.local');
    await page.getByLabel(/password/i).fill('DeliveryCentral@Admin1');
    await page.getByRole('button', { name: /sign in|log in|submit/i }).click();
    await page.waitForURL('**/');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('employee can login and see employee dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('ethan.brooks@example.com');
    await page.getByLabel(/password/i).fill('EmployeePass1!');
    await page.getByRole('button', { name: /sign in|log in|submit/i }).click();
    await page.waitForURL('**/dashboard/employee');
    await expect(page.getByText('Ethan Brooks')).toBeVisible();
  });
});
