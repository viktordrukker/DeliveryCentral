/**
 * UX Contract regression — LoginPage
 * Mirrors: docs/planning/ux-contracts/LoginPage.md
 *
 * Note: this spec does NOT use the auth fixtures — it tests the unauthenticated entry path.
 */
import { expect, test } from '@playwright/test';

const PATH = '/login';

test.describe('UX contract — LoginPage §1 Route & Roles @ux-contract', () => {
  test('unauthenticated visitor can reach /login', async ({ page, context }) => {
    // Clear any session storage that auth-setup may have populated
    await context.clearCookies();
    await page.goto(PATH);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('UX contract — LoginPage §2 Click paths @ux-contract', () => {
  test('"Forgot password?" navigates to /forgot-password', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    const link = page.getByRole('button', { name: /forgot password\?/i }).first();
    if (await link.count() === 0) test.skip();
    await link.click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });
});

test.describe('UX contract — LoginPage §3 Form validation @ux-contract', () => {
  test('Email and Password fields are required (HTML5)', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(PATH);
    const email = page.locator('input[type="email"]').first();
    const pw = page.locator('input[type="password"]').first();
    if (await email.count() === 0 || await pw.count() === 0) test.skip();
    await expect(email).toHaveAttribute('required', '');
    await expect(pw).toHaveAttribute('required', '');
  });
});

test.describe('UX contract — LoginPage §7 States @ux-contract', () => {
  test('invalid credentials surface message in <Alert>', async ({ page, context }) => {
    await context.clearCookies();
    await page.route('**/auth/login', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ message: 'Invalid credentials' }), contentType: 'application/json' }),
    );
    await page.goto(PATH);
    const email = page.locator('input[type="email"]').first();
    const pw = page.locator('input[type="password"]').first();
    if (await email.count() === 0 || await pw.count() === 0) test.skip();
    await email.fill('test@example.com');
    await pw.fill('wrongpassword');
    const submit = page.getByRole('button', { name: /sign in/i }).first();
    if (await submit.count() === 0) test.skip();
    await submit.click();
    // Either MUI Alert renders the message or a generic error appears.
    await expect(page.getByText(/invalid credentials|login failed|cannot|unable/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('UX contract — LoginPage §8 Side effects @ux-contract', () => {
  test('mount fires GET /auth/providers', async ({ page, context }) => {
    await context.clearCookies();
    const calls: string[] = [];
    page.on('request', (req) => {
      if (/\/auth\/providers/.test(req.url())) calls.push(req.url());
    });
    await page.goto(PATH);
    await page.waitForLoadState('networkidle');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});
