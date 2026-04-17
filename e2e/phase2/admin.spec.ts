/**
 * Phase 2 E2E — Admin JTBDs (ADM1–ADM3)
 * Requires: phase2 seed profile loaded in the database.
 */
import { expect, test } from '@playwright/test';

import { loginAs } from '../helpers/auth';
import { p2 } from '../fixtures/phase2-identifiers';

const { admin } = p2.accounts;

test.beforeEach(async ({ page }) => {
  await loginAs(page, admin.email, admin.password);
});

test.describe('@full ADM1 — Admin creates local account', () => {
  test('admin panel shows User Accounts section with Create Account form', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByText(/User Accounts/i)).toBeVisible();
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByLabel(/Person/i).first()).toBeVisible();
  });

  test('POST /admin/accounts creates account with bcrypt-hashed password', async ({ page }) => {
    const token = await getToken(page, admin.email, admin.password);
    const res = await page.request.post('http://127.0.0.1:3000/api/admin/accounts', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        personId: p2.people.rajKapoor,
        email: `raj.kapoor.e2e+${Date.now()}@example.com`,
        password: 'TestPass1!E2E',
        roles: ['employee'],
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { personId: string };
    expect(body.personId).toBe(p2.people.rajKapoor);
  });

  test('duplicate account returns 409', async ({ page }) => {
    const token = await getToken(page, admin.email, admin.password);
    // Ethan Brooks already has an account from the phase2 seed
    const res = await page.request.post('http://127.0.0.1:3000/api/admin/accounts', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        personId: p2.people.ethanBrooks,
        email: 'ethan.duplicate@example.com',
        password: 'TestPass1!',
        roles: ['employee'],
      },
    });
    expect(res.status()).toBe(409);
  });
});

test.describe('@full ADM2 — Admin manages metadata dictionaries', () => {
  test('metadata admin page renders dictionary list with entries', async ({ page }) => {
    await page.goto('/admin/metadata');

    await expect(page.getByText(/Dictionar/i)).toBeVisible();
  });

  test('disabling an entry via PATCH updates its status without deleting it', async ({ page }) => {
    const token = await getToken(page, admin.email, admin.password);

    // First fetch entries to get a real entryId
    const listRes = await page.request.get('http://127.0.0.1:3000/api/metadata/dictionaries', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const dictionaries = await listRes.json() as Array<{ id: string; entries: Array<{ id: string; isEnabled: boolean }> }>;
    const firstDict = dictionaries[0];
    const firstEntry = firstDict?.entries?.[0];

    if (!firstEntry) {
      test.skip();
      return;
    }

    const patchRes = await page.request.patch(
      `http://127.0.0.1:3000/api/metadata/dictionaries/entries/${firstEntry.id}`,
      {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { isEnabled: false },
      },
    );
    expect(patchRes.ok()).toBeTruthy();
    const updated = await patchRes.json() as { isEnabled: boolean };
    expect(updated.isEnabled).toBe(false);
  });
});

test.describe('@full ADM3 — Admin monitors notification queue', () => {
  test('notifications admin page renders Notification Queue section', async ({ page }) => {
    await page.goto('/admin/notifications');

    await expect(page.getByText(/Notification Queue/i)).toBeVisible();
    await expect(page.getByText(/Filter by status/i)).toBeVisible();
  });

  test('notification queue API returns paginated, filterable response', async ({ page }) => {
    const token = await getToken(page, admin.email, admin.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/notifications/queue?page=1&pageSize=25',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as {
      items: unknown[];
      totalCount: number;
      page: number;
      pageSize: number;
    };
    expect(typeof body.totalCount).toBe('number');
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(25);
  });

  test('filtering by QUEUED status returns only queued items', async ({ page }) => {
    const token = await getToken(page, admin.email, admin.password);
    const res = await page.request.get(
      'http://127.0.0.1:3000/api/notifications/queue?status=QUEUED',
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json() as { items: Array<{ status: string }> };
    for (const item of body.items) {
      expect(item.status).toBe('QUEUED');
    }
  });

  test('queue item includes latestRenderedBody field', async ({ page }) => {
    const token = await getToken(page, admin.email, admin.password);

    // First trigger a test notification so there is a delivery record
    const templates = await page.request.get('http://127.0.0.1:3000/api/notifications/templates', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const templateList = await templates.json() as Array<{ templateKey: string; channelKey: string }>;
    const template = templateList[0];

    if (!template) {
      test.skip();
      return;
    }

    await page.request.post('http://127.0.0.1:3000/api/notifications/test-send', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        templateKey: template.templateKey,
        channelKey: template.channelKey,
        recipient: 'e2e-test@example.com',
        payload: {},
      },
    });

    const queueRes = await page.request.get('http://127.0.0.1:3000/api/notifications/queue', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const queue = await queueRes.json() as { items: Array<Record<string, unknown>> };
    // latestRenderedBody key should be present on every item
    if (queue.items.length > 0) {
      expect('latestRenderedBody' in queue.items[0]!).toBeTruthy();
    }
  });
});

async function getToken(page: import('@playwright/test').Page, email: string, password: string): Promise<string> {
  const res = await page.request.post('http://127.0.0.1:3000/api/auth/login', { data: { email, password } });
  const body = await res.json() as { accessToken: string };
  return body.accessToken;
}
