/**
 * Patch Test: Suspect Name on MostWanted Card
 *
 * Bug: MostWanted card displayed blank suspect names because code used
 *   `suspect.person?.first_name` but the IntensivePursuitSuspectSerializer
 *   returns a flat `person_full_name` field, not a nested `person` object.
 *
 * Fix: Changed card display and dropdown to use `person_full_name`
 *
 * Verifies:
 * 1. Most wanted page loads without errors
 * 2. Intensive pursuit API returns person_full_name field
 * 3. If suspects exist, their names are not blank on the cards
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api/v1';

test.describe('Patch: Suspect Name on MostWanted Card', () => {
  test('most wanted page loads successfully', async ({ page }) => {
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    // Page should load with some heading
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible({ timeout: 10000 });
  });

  test('intensive_pursuit API returns person_full_name field', async ({ request }) => {
    const response = await request.get(`${API}/investigation/suspects/intensive_pursuit/`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    // If there are results, each should have person_full_name
    if (Array.isArray(data) && data.length > 0) {
      for (const suspect of data) {
        expect(suspect).toHaveProperty('person_full_name');
        expect(suspect.person_full_name).toBeTruthy();
      }
    }
  });

  test('suspect cards do not show blank names', async ({ page }) => {
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Get all suspect card name elements (if any exist)
    const nameElements = page.locator('.suspect-card h3, .wanted-card h3, .card h3');
    const count = await nameElements.count();

    if (count > 0) {
      // Each name should have actual text, not be blank
      for (let i = 0; i < count; i++) {
        const text = await nameElements.nth(i).textContent();
        // Name should not be empty or "undefined undefined"
        expect(text?.trim()).not.toBe('');
        expect(text).not.toContain('undefined');
      }
    }
    // If no suspects, that's fine - the page just shows empty state
  });
});
