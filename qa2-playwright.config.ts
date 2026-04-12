import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '/tmp',
  testMatch: 'qa-deep-pass2.spec.ts',
  outputDir: '/home/drukker/qa-pw-results',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
