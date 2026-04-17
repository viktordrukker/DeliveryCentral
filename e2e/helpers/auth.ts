import { type Page } from '@playwright/test';

import {
  PLAYWRIGHT_API_BASE as API_BASE,
  TOKEN_STORAGE_KEY,
  applyStoredAuthState,
  lookupRoleByCredentials,
} from '../fixtures/auth-state';

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  const cachedRole = lookupRoleByCredentials(email, password);
  if (cachedRole) {
    try {
      await applyStoredAuthState(page, cachedRole);
      return;
    } catch {
      // Fall back to live login for ad hoc local runs before auth setup has executed.
    }
  }

  const response = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${await response.text()}`);
  }

  const body = (await response.json()) as { accessToken?: string };

  if (!body.accessToken) {
    throw new Error(`No accessToken in login response for ${email}`);
  }

  await page.addInitScript(
    ({ key, token }: { key: string; token: string }) => {
      localStorage.setItem(key, token);
    },
    { key: TOKEN_STORAGE_KEY, token: body.accessToken },
  );
}
