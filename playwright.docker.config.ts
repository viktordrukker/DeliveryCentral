/**
 * Playwright config for running E2E tests against the Docker stack.
 * Use: node node_modules/playwright/cli.js test --config playwright.docker.config.ts <spec>
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://frontend:5173',
    headless: true,
    trace: 'retain-on-failure',
  },
});
