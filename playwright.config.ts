import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const ADMIN_AUTH = path.join(__dirname, 'tests/e2e/.auth/admin.json');

/**
 * Playwright Configuration for LA Noire NextGen E2E Tests
 * 
 * Optimized for speed:
 * - 2 parallel workers (stable with dev server)
 * - CSS/font/image blocking (doesn't affect test logic)
 * - Saved auth state to skip redundant logins
 * - Reduced timeouts for faster failure detection
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: [
    ['html', { open: 'never', outputFolder: 'tests/e2e/reports' }],
    ['list'],
  ],
  outputDir: 'tests/e2e/test-results',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 10000,
    navigationTimeout: 20000,
    // Block heavy resources that don't affect test correctness
    launchOptions: {
      args: ['--disable-gpu', '--no-sandbox'],
    },
  },

  projects: [
    // Setup project - creates auth states
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    // Auth tests (login, register) need a clean session - NO storageState
    {
      name: 'auth-tests',
      testMatch: /auth\/.*/,
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      dependencies: ['setup'],
    },
    // All other tests use pre-saved admin session
    {
      name: 'chromium',
      testIgnore: [/auth\/.*/, /.*\.setup\.ts/],
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: ADMIN_AUTH,
      },
      dependencies: ['setup'],
    },
  ],
});
