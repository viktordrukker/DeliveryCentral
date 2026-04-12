/**
 * 2d-25 · Admin — create local account
 * 2d-26 · Admin — enable/disable account
 * 2d-27 · Admin — trigger integration sync
 * 2d-28 · Admin — view business audit log
 * 2d-29 · Admin — manage metadata dictionary entries
 * 2d-30 · Admin — view exception queue
 * 2d-31 · Admin — send test notification
 *
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAsAdmin } from '../fixtures/auth';
import { p2 } from '../fixtures/phase2-identifiers';

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
});

// ── 2d-25 Create local account ───────────────────────────────────────────────

test.describe('2d-25 Admin — create local account', () => {
  test('admin panel renders User Accounts section with Create Account form', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByText(/User Accounts/i).first()).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });

  test('POST /admin/accounts creates a new account', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);
    const unique = Date.now();
    const res = await page.request.post('http://127.0.0.1:3000/api/admin/accounts', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        personId: p2.people.rajKapoor,
        email: `raj.kapoor.e2e.${unique}@example.com`,
        password: 'TestPass1!E2E',
        roles: ['employee'],
      },
    });
    // 200 created, or 409 if this person already has an account from a prior run
    expect([200, 201, 409].includes(res.status())).toBeTruthy();
    if (res.ok()) {
      const body = await res.json() as { personId: string };
      expect(body.personId).toBe(p2.people.rajKapoor);
    }
  });
});

// ── 2d-26 Enable/disable account ─────────────────────────────────────────────

test.describe('2d-26 Admin — enable/disable account', () => {
  test('admin panel shows account list with enabled status', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByText(/User Accounts/i).first()).toBeVisible();
    // At least one account row with enabled indicator
    await expect(page.locator('table').or(page.getByText(/employee|admin|director/i)).first()).toBeVisible();
  });

  test('PATCH account toggles enabled flag', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);

    // Get list of accounts to find one to toggle
    const listRes = await page.request.get('http://127.0.0.1:3000/api/admin/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const accountsBody = await listRes.json() as { items: Array<{ id: string; email: string; isEnabled: boolean }> };
    const accounts = accountsBody.items ?? accountsBody;
    // Find a non-admin account to toggle safely
    const target = Array.isArray(accounts) ? accounts.find(a => a.email !== p2.accounts.admin.email) : undefined;
    if (!target) {
      test.skip();
      return;
    }

    const patchRes = await page.request.patch(
      `http://127.0.0.1:3000/api/admin/accounts/${target.id}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { isEnabled: !target.isEnabled },
      },
    );
    expect(patchRes.ok()).toBeTruthy();
    const updated = await patchRes.json() as { isEnabled: boolean };
    expect(updated.isEnabled).toBe(!target.isEnabled);

    // Restore original state
    await page.request.patch(
      `http://127.0.0.1:3000/api/admin/accounts/${target.id}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { isEnabled: target.isEnabled },
      },
    );
  });
});

// ── 2d-27 Trigger integration sync ──────────────────────────────────────────

test.describe('2d-27 Admin — trigger integration sync', () => {
  test('integrations admin page is reachable', async ({ page }) => {
    await page.goto('/admin/integrations');

    // Page renders without critical error
    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
    await expect(page.getByText(/Integration|Sync|Provider/i).first()).toBeVisible();
  });

  test('integrations API returns list of configured integrations', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);
    const res = await page.request.get('http://127.0.0.1:3000/api/admin/integrations', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as unknown;
    expect(body !== null).toBeTruthy();
  });
});

// ── 2d-28 View business audit log ───────────────────────────────────────────

test.describe('2d-28 Admin — view business audit log', () => {
  test('business audit page renders with filter controls', async ({ page }) => {
    await page.goto('/admin/audit');

    await expect(page.getByText('Business Audit')).toBeVisible();
    await expect(page.getByLabel('Occurred After')).toBeVisible();
    await expect(page.getByLabel('Occurred Before')).toBeVisible();
  });

  test('audit log table renders rows or shows empty state', async ({ page }) => {
    await page.goto('/admin/audit');

    await expect(page.getByText(/records total|page|no records/i)).toBeVisible();
  });

  test('audit API returns paginated response', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/audit/business?page=1&pageSize=10',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { totalCount: number; page: number; pageSize: number; items: unknown[] };
    expect(typeof body.totalCount).toBe('number');
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
  });
});

// ── 2d-29 Manage metadata dictionary entries ─────────────────────────────────

test.describe('2d-29 Admin — manage metadata dictionary entries', () => {
  test('metadata admin page renders dictionary list', async ({ page }) => {
    await page.goto('/admin/metadata');

    await expect(page.getByText(/Dictionar/i).first()).toBeVisible();
  });

  test('dictionaries API returns list with entries', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);
    const res = await page.request.get('http://127.0.0.1:3000/api/metadata/dictionaries', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as Array<{ id: string }>;
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(0);
  });

  test('PATCH dictionary entry toggles isEnabled', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);

    const listRes = await page.request.get('http://127.0.0.1:3000/api/metadata/dictionaries', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const dictionaries = await listRes.json() as Array<{ id: string; entries: Array<{ id: string; isEnabled: boolean }> }>;
    const firstEntry = dictionaries[0]?.entries?.[0];

    if (!firstEntry) {
      test.skip();
      return;
    }

    const patchRes = await page.request.patch(
      `http://127.0.0.1:3000/api/metadata/dictionaries/entries/${firstEntry.id}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { isEnabled: !firstEntry.isEnabled },
      },
    );
    expect(patchRes.ok()).toBeTruthy();
    const updated = await patchRes.json() as { isEnabled: boolean };
    expect(updated.isEnabled).toBe(!firstEntry.isEnabled);

    // Restore
    await page.request.patch(
      `http://127.0.0.1:3000/api/metadata/dictionaries/entries/${firstEntry.id}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { isEnabled: firstEntry.isEnabled },
      },
    );
  });
});

// ── 2d-30 View exception queue ───────────────────────────────────────────────

test.describe('2d-30 Admin — view exception queue', () => {
  test('exceptions page renders without error', async ({ page }) => {
    await page.goto('/exceptions');

    await expect(page.locator('body')).not.toContainText(/500|Internal Server Error/);
    await expect(page.getByText(/Exception|Queue|exception/i).first()).toBeVisible();
  });

  test('exceptions API returns paginated response', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/exceptions?page=1&pageSize=25',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { total: number; items: unknown[] };
    expect(typeof body.total).toBe('number');
    expect(Array.isArray(body.items)).toBeTruthy();
  });
});

// ── 2d-31 Send test notification ─────────────────────────────────────────────

test.describe('2d-31 Admin — send test notification', () => {
  test('notifications admin page renders Queue section', async ({ page }) => {
    await page.goto('/admin/notifications');

    await expect(page.getByText(/Notification Queue/i).first()).toBeVisible();
  });

  test('test-send API enqueues a notification successfully', async ({ page }) => {
    const token = await getToken(page, p2.accounts.admin.email, p2.accounts.admin.password);

    // Fetch templates to get a valid key
    const tplRes = await page.request.get('http://127.0.0.1:3000/api/notifications/templates', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(tplRes.ok()).toBeTruthy();
    const templates = await tplRes.json() as Array<{ templateKey: string; channelKey: string }>;
    const tpl = templates[0];

    if (!tpl) {
      test.skip();
      return;
    }

    const sendRes = await page.request.post('http://127.0.0.1:3000/api/notifications/test-send', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        templateKey: tpl.templateKey,
        channelKey: tpl.channelKey,
        recipient: 'e2e-admin-test@example.com',
        payload: {},
      },
    });
    expect(sendRes.ok()).toBeTruthy();
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
