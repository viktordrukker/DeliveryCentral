import { defineConfig, devices } from '@playwright/test';

const backendPort = 3000;
const frontendPort = Number(process.env['PLAYWRIGHT_FRONTEND_PORT'] ?? 4173);
const backendHealthPath = process.env['PLAYWRIGHT_BACKEND_HEALTH_PATH'] ?? '/health';
const smokeOnly = process.env['PLAYWRIGHT_SMOKE_ONLY'] === 'true';
const configuredWorkers = process.env['PLAYWRIGHT_WORKERS'];
// V2-staging baseline support: when V2_STAGING_BASE_URL is set, the v2-baseline
// project targets that origin and does NOT spin up a local webServer.
const v2StagingBaseUrl = process.env['V2_STAGING_BASE_URL'];
const isV2Baseline = process.env['PLAYWRIGHT_V2_BASELINE'] === 'true';

export default defineConfig({
  testDir: './e2e',
  testIgnore: smokeOnly ? ['**/auth.setup.ts'] : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: process.env['PLAYWRIGHT_FULLY_PARALLEL'] !== 'false',
  grep: process.env['PLAYWRIGHT_GREP'] ? new RegExp(process.env['PLAYWRIGHT_GREP']) : undefined,
  grepInvert: process.env['PLAYWRIGHT_GREP_INVERT']
    ? new RegExp(process.env['PLAYWRIGHT_GREP_INVERT'])
    : undefined,
  outputDir: 'test-results/playwright',
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  retries: process.env['CI'] ? 2 : 0,
  workers: configuredWorkers ?? (process.env['CI'] ? '50%' : '75%'),
  // PLAYWRIGHT_SKIP_WEB_SERVER=1 (axe baseline workflow) or isV2Baseline
  // (v2-playwright-baseline workflow) both target remote staging URLs and
  // skip the local backend+frontend boot.
  webServer: isV2Baseline || process.env['PLAYWRIGHT_SKIP_WEB_SERVER'] === '1'
    ? undefined
    : [
        {
          command: 'npm run start:dev',
          reuseExistingServer: !process.env['CI'],
          timeout: 120_000,
          url: `http://127.0.0.1:${backendPort}${backendHealthPath}`,
        },
        {
          command: 'npm --prefix frontend run dev -- --host 127.0.0.1 --port 4173',
          env: {
            VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}`,
          },
          reuseExistingServer: !process.env['CI'],
          timeout: 120_000,
          url: `http://127.0.0.1:${frontendPort}`,
        },
      ],
  use: {
    baseURL:
      v2StagingBaseUrl ?? process.env['PLAYWRIGHT_BASE_URL'] ?? `http://127.0.0.1:${frontendPort}`,
    headless: process.env['PLAYWRIGHT_HEADLESS'] !== 'false',
    screenshot: 'only-on-failure',
    trace: process.env['CI'] ? 'retain-on-failure' : 'on-first-retry',
    video: process.env['CI'] ? 'retain-on-failure' : 'off',
  },
  snapshotPathTemplate: '{testDir}/v2/snapshots/{arg}{ext}',
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['auth-setup'],
      // The position-lifecycle journey (PR-19) self-authenticates via the auth
      // API per-test, so it deliberately does NOT depend on auth-setup — it
      // runs under its own `position-lifecycle` project below. Ignore it here
      // to avoid double-running it (and coupling it to the auth-setup fixtures).
      testIgnore: /(auth\.setup\.ts|v2\/baseline\.spec\.ts|v2\/position-lifecycle\.spec\.ts)/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // PR-19 — the one true position-lifecycle journey. Self-contained
      // (logs in via the auth API in-spec), so it needs no auth-setup
      // dependency and runs identically locally (webServer) and against
      // V2_STAGING_BASE_URL. Tagged @smoke so `--grep @smoke` (the e2e-smoke
      // merge gate) picks it up.
      name: 'position-lifecycle',
      testMatch: /v2\/position-lifecycle\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'v2-baseline',
      testMatch: /v2\/baseline\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
