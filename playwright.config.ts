import { defineConfig, devices } from '@playwright/test';

const backendPort = 3000;
const frontendPort = Number(process.env['PLAYWRIGHT_FRONTEND_PORT'] ?? 4173);
const backendHealthPath = process.env['PLAYWRIGHT_BACKEND_HEALTH_PATH'] ?? '/health';
const smokeOnly = process.env['PLAYWRIGHT_SMOKE_ONLY'] === 'true';
const configuredWorkers = process.env['PLAYWRIGHT_WORKERS'];

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
  webServer: [
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
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? `http://127.0.0.1:${frontendPort}`,
    headless: process.env['PLAYWRIGHT_HEADLESS'] !== 'false',
    screenshot: 'only-on-failure',
    trace: process.env['CI'] ? 'retain-on-failure' : 'on-first-retry',
    video: process.env['CI'] ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['auth-setup'],
      testIgnore: /auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
