import { test as setup, expect } from '@playwright/test';

import {
  PLAYWRIGHT_API_BASE,
  ROLE_CREDENTIALS,
  TOKEN_STORAGE_KEY,
  type AuthRole,
  storageStatePath,
} from './fixtures/auth-state';

for (const [role, credentials] of Object.entries(ROLE_CREDENTIALS) as Array<
  [AuthRole, (typeof ROLE_CREDENTIALS)[AuthRole]]
>) {
  setup(`authenticate ${role}`, async ({ page }) => {
    const response = await page.request.post(`${PLAYWRIGHT_API_BASE}/auth/login`, {
      data: credentials,
    });

    expect(response.ok(), `Login should succeed for ${role}`).toBeTruthy();

    const body = (await response.json()) as { accessToken?: string };

    if (!body.accessToken) {
      throw new Error(`No access token returned for ${role}`);
    }

    await page.goto('/login');
    await page.evaluate(
      ({ key, token }) => {
        localStorage.setItem(key, token);
      },
      { key: TOKEN_STORAGE_KEY, token: body.accessToken },
    );

    await page.context().storageState({ path: storageStatePath(role) });
  });
}

