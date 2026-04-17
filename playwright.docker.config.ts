/**
 * Playwright config for running E2E tests against the Docker stack.
 * Use: node node_modules/playwright/cli.js test --config playwright.docker.config.ts <spec>
 */
import { defineConfig, devices } from '@playwright/test';

const configuredWorkers = process.env['PLAYWRIGHT_WORKERS'];

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/auth.setup.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: process.env['PLAYWRIGHT_FULLY_PARALLEL'] !== 'false',
  grep: process.env['PLAYWRIGHT_GREP'] ? new RegExp(process.env['PLAYWRIGHT_GREP']) : undefined,
  grepInvert: process.env['PLAYWRIGHT_GREP_INVERT']
    ? new RegExp(process.env['PLAYWRIGHT_GREP_INVERT'])
    : undefined,
  outputDir: 'test-results/playwright',
  retries: process.env['CI'] ? 1 : 0,
  workers: configuredWorkers ?? (process.env['CI'] ? '50%' : 1),
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://frontend:5173',
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
