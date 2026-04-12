import { defineConfig } from '@playwright/test';

const backendPort = 3000;
const frontendPort = 4173;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run start:dev',
      port: backendPort,
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${backendPort}/health`,
    },
    {
      command: 'npm --prefix frontend run dev -- --host 127.0.0.1 --port 4173',
      env: {
        VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}`,
      },
      port: frontendPort,
      reuseExistingServer: false,
      timeout: 120_000,
      url: `http://127.0.0.1:${frontendPort}`,
    },
  ],
});
