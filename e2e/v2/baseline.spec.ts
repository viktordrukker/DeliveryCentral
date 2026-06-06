import { readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import {
  applyStoredAuthState,
  PLAYWRIGHT_API_BASE,
  ROLE_CREDENTIALS,
  TOKEN_STORAGE_KEY,
  type AuthRole,
} from '../fixtures/auth-state';

type RouteSpec = {
  id: string;
  path: string;
  role: AuthRole | 'unauthenticated';
  waitFor?: string;
};

type Viewport = {
  name: string;
  width: number;
  height: number;
};

type RoutesManifest = {
  viewports: Viewport[];
  routes: RouteSpec[];
};

const manifestPath = path.resolve(__dirname, 'routes.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as RoutesManifest;

const SAMPLE_PERSON_ID = process.env['V2_BASELINE_PERSON_ID'] ?? '';
const SAMPLE_PROJECT_ID = process.env['V2_BASELINE_PROJECT_ID'] ?? '';
const SAMPLE_POSITION_ID = process.env['V2_BASELINE_POSITION_ID'] ?? '';

function resolvePath(pathTemplate: string): string {
  return pathTemplate
    .replace('{personId}', SAMPLE_PERSON_ID)
    .replace('{projectId}', SAMPLE_PROJECT_ID)
    .replace('{positionId}', SAMPLE_POSITION_ID);
}

async function loginViaApi(page: Page, role: AuthRole): Promise<void> {
  const credentials = ROLE_CREDENTIALS[role];
  const response = await page.request.post(`${PLAYWRIGHT_API_BASE}/auth/login`, {
    data: credentials,
  });
  if (!response.ok()) {
    throw new Error(`Login failed for role ${role}: ${response.status()}`);
  }
  const body = (await response.json()) as { accessToken?: string };
  if (!body.accessToken) {
    throw new Error(`No access token for role ${role}`);
  }
  await page.addInitScript(
    ({ key, token }) => {
      localStorage.setItem(key, token);
    },
    { key: TOKEN_STORAGE_KEY, token: body.accessToken },
  );
}

test.describe('@v2-baseline V2 visual-regression baseline', () => {
  test.describe.configure({ mode: 'serial' });

  for (const viewport of manifest.viewports) {
    test.describe(`viewport=${viewport.name}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const route of manifest.routes) {
        test(`${route.id}`, async ({ page }) => {
          if (route.path.includes('{') && !resolvePath(route.path).match(/\/[a-z0-9-]+\?|\/[a-z0-9-]+$/i)) {
            test.skip(true, `sample id missing for route ${route.id}`);
          }

          if (route.role !== 'unauthenticated') {
            try {
              await applyStoredAuthState(page, route.role);
            } catch {
              await loginViaApi(page, route.role);
            }
          }

          const targetPath = resolvePath(route.path);
          await page.goto(targetPath, { waitUntil: 'networkidle' });

          if (route.waitFor) {
            await page.waitForSelector(route.waitFor, { timeout: 15_000 }).catch(() => undefined);
          }

          await page.waitForLoadState('networkidle').catch(() => undefined);
          await page.waitForTimeout(500);

          await expect(page).toHaveScreenshot(`${route.id}-${viewport.name}.png`, {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.02,
          });
        });
      }
    });
  }
});
