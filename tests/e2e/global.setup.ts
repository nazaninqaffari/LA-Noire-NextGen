import { test as setup, expect } from '@playwright/test';
import path from 'path';

const ADMIN_AUTH_FILE = path.join(__dirname, '.auth/admin.json');
const REGULAR_AUTH_FILE = path.join(__dirname, '.auth/regular.json');

/**
 * Global setup: authenticate as admin and save storage state.
 * This runs before any test to create reusable auth sessions.
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  
  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Command Dashboard' })).toBeVisible();
  
  // Save storage state
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
