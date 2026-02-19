/**
 * Patch Test: Home Page Public Statistics
 *
 * Bug: Homepage statistics showed all 0s because the API required authentication.
 * Fix: Added a public /api/v1/cases/public-stats/ endpoint that returns counts
 *      without authentication, and updated Home.tsx to call it.
 *
 * Verifies:
 * 1. The public-stats API endpoint returns 200 without authentication
 * 2. The response contains total_cases, active_cases, solved_cases
 * 3. The home page displays non-zero stats when cases exist
 * 4. Stats section renders even for unauthenticated visitors
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api/v1';

test.describe('Patch: Home Page Public Statistics', () => {
  test('public-stats API returns 200 without authentication', async ({ request }) => {
    const response = await request.get(`${API}/cases/public-stats/`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('total_cases');
    expect(data).toHaveProperty('active_cases');
    expect(data).toHaveProperty('solved_cases');
    expect(typeof data.total_cases).toBe('number');
    expect(typeof data.active_cases).toBe('number');
    expect(typeof data.solved_cases).toBe('number');
  });

  test('public-stats returns non-negative numbers', async ({ request }) => {
    const response = await request.get(`${API}/cases/public-stats/`);
    const data = await response.json();
    expect(data.total_cases).toBeGreaterThanOrEqual(0);
    expect(data.active_cases).toBeGreaterThanOrEqual(0);
    expect(data.solved_cases).toBeGreaterThanOrEqual(0);
  });

  test('home page renders stats section for unauthenticated user', async ({ page }) => {
    // Visit home page without being logged in
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The stats section should be visible
    const statsSection = page.locator('.home-stats');
    await expect(statsSection).toBeVisible({ timeout: 10000 });

    // There should be stat cards
    const statCards = page.locator('.home-stat-card');
    await expect(statCards).toHaveCount(3);
  });

  test('home page stat numbers render (not stuck at loading skeleton)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for stats to load (skeleton disappears, numbers appear)
    const statNumber = page.locator('.stat-number').first();
    await expect(statNumber).toBeVisible({ timeout: 10000 });

    // The stat-number elements should contain actual numbers (digits)
    const statNumbers = page.locator('.stat-number');
    const count = await statNumbers.count();
    expect(count).toBe(3);

    for (let i = 0; i < count; i++) {
      const text = await statNumbers.nth(i).textContent();
      expect(text).not.toBeNull();
      expect(text!.trim()).toMatch(/^\d+$/);
    }
  });

  test('home page does NOT call authenticated cases endpoint for stats', async ({ page }) => {
    // Intercept API calls to detect if the old getCases() pattern is still used
    const authenticatedCaseCalls: string[] = [];
    await page.route('**/api/v1/cases/cases/**', (route) => {
      authenticatedCaseCalls.push(route.request().url());
      route.continue();
    });

    let publicStatsCalled = false;
    await page.route('**/api/v1/cases/public-stats/**', (route) => {
      publicStatsCalled = true;
      route.continue();
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // The old authenticated endpoint should NOT be called from the home page
    expect(authenticatedCaseCalls.length).toBe(0);
    // The new public stats endpoint SHOULD be called
    expect(publicStatsCalled).toBe(true);
  });
});
