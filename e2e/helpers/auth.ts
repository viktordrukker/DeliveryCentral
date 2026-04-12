import { type Page } from '@playwright/test';

const API_BASE = 'http://127.0.0.1:3000/api';
const TOKEN_STORAGE_KEY = 'deliverycentral.authToken';

export async function loginAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
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
