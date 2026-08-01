import { defineConfig, devices } from '@playwright/test';

/**
 * OMEGA ERA 7.2.3 - Playwright Configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential for stability in smoke tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid port/state conflicts during smoke testing
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3035',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev -- -p 3035',
    url: 'http://localhost:3035',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
