import { defineConfig } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e',
  testMatch: /live\.prod\.spec\.mjs$/,
  timeout: 180000,
  expect: {
    timeout: 20000,
  },
  fullyParallel: false,
  reporter: [
    ['list'],
    ['json', { outputFile: path.join('artifacts', 'prod-readiness', 'playwright-results.json') }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:1',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
