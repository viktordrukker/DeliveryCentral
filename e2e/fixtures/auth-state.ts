import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { Page } from '@playwright/test';

export const TOKEN_STORAGE_KEY = 'deliverycentral.authToken';
export const PLAYWRIGHT_API_BASE = process.env['PLAYWRIGHT_API_BASE'] ?? 'http://127.0.0.1:3000/api';
export const PLAYWRIGHT_BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:4173';
export const STORAGE_STATE_DIR = path.resolve(process.cwd(), 'playwright/.auth');

export const ROLE_CREDENTIALS = {
  admin: { email: 'admin@deliverycentral.local', password: 'DeliveryCentral@Admin1' },
  director: { email: 'noah.bennett@example.com', password: 'DirectorPass1!' },
  hrManager: { email: 'diana.walsh@example.com', password: 'HrManagerPass1!' },
  resourceManager: { email: 'sophia.kim@example.com', password: 'ResourceMgrPass1!' },
  projectManager: { email: 'lucas.reed@example.com', password: 'ProjectMgrPass1!' },
  deliveryManager: { email: 'carlos.vega@example.com', password: 'DeliveryMgrPass1!' },
  employee: { email: 'ethan.brooks@example.com', password: 'EmployeePass1!' },
} as const;

export type AuthRole = keyof typeof ROLE_CREDENTIALS;

type PlaywrightStorageState = {
  origins?: Array<{
    localStorage?: Array<{ name: string; value: string }>;
    origin: string;
  }>;
};

mkdirSync(STORAGE_STATE_DIR, { recursive: true });

export function storageStatePath(role: AuthRole): string {
  return path.join(STORAGE_STATE_DIR, `${role}.json`);
}

export function lookupRoleByCredentials(email: string, password: string): AuthRole | undefined {
  return (Object.entries(ROLE_CREDENTIALS) as Array<[AuthRole, (typeof ROLE_CREDENTIALS)[AuthRole]]>).find(
    ([, credentials]) => credentials.email === email && credentials.password === password,
  )?.[0];
}

export function readStorageState(role: AuthRole): PlaywrightStorageState {
  return JSON.parse(readFileSync(storageStatePath(role), 'utf8')) as PlaywrightStorageState;
}

export async function applyStoredAuthState(page: Page, role: AuthRole): Promise<void> {
  const state = readStorageState(role);
  const targetOrigin = new URL(PLAYWRIGHT_BASE_URL).origin;
  const originState =
    state.origins?.find((entry) => entry.origin === targetOrigin) ??
    state.origins?.find((entry) =>
      entry.localStorage?.some((item) => item.name === TOKEN_STORAGE_KEY),
    );

  if (!originState?.localStorage?.length) {
    throw new Error(`No localStorage auth state found for role "${role}" at ${storageStatePath(role)}`);
  }

  await page.addInitScript((items: Array<{ name: string; value: string }>) => {
    for (const item of items) {
      localStorage.setItem(item.name, item.value);
    }
  }, originState.localStorage);
}
