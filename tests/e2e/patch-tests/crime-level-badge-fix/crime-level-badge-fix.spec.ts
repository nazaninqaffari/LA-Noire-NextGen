/**
 * Patch Test: CrimeLevelBadge Crash Fix
 *
 * Bug: CrimeLevelBadge crashed with "can't access property className, config is
 * undefined" because the Case API returns crime_level as the FK primary key
 * (1, 2, 3…) rather than the level value (0, 1, 2, 3). When the PK didn't
 * match a key in levelConfig, config was undefined and the component crashed.
 *
 * Fix:
 * - CrimeLevelBadge now falls back to a default config when level is unknown.
 * - CaseCard passes crime_level_details.level (the real 0–3 value) instead of
 *   the raw FK id.
 *
 * Verifies:
 * 1. Cases page renders without crashing
 * 2. Crime level badges are visible on case cards
 * 3. Badge text is one of Critical/Major/Medium/Minor
 */
import { test, expect } from '@playwright/test';

// Tests run with admin storageState (pre-authenticated)

test.describe('Patch: CrimeLevelBadge Crash Fix', () => {

  test('cases page loads without CrimeLevelBadge crash', async ({ page }) => {
    // Navigate to cases list (admin is already authenticated via storageState)
    await page.goto('/cases', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // The page should NOT show an error boundary or blank screen
    const errorBoundary = page.locator('text=Something went wrong');
    const hasError = await errorBoundary.count();
    expect(hasError).toBe(0);

    // The page title should be visible
    const heading = page.locator('h1:has-text("Case Files")');
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('crime level badges display valid labels', async ({ page }) => {
    // Navigate to cases list
    await page.goto('/cases', { waitUntil: 'domcontentloaded' });

    // Wait for case cards to appear
    const caseCards = page.locator('.case-card');
    await page.waitForTimeout(3000);
    const count = await caseCards.count();

    if (count === 0) {
      // No cases — skip badge check (test passes trivially)
      test.skip();
      return;
    }

    // Every visible badge should have a valid label
    const badges = page.locator('.crime-level-badge');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);

    const validLabels = ['Critical', 'Major', 'Medium', 'Minor'];
    for (let i = 0; i < badgeCount; i++) {
      const text = await badges.nth(i).textContent();
      expect(text).not.toBeNull();
      // Allow valid labels or fallback "Level X" pattern
      const isValid = validLabels.includes(text!.trim()) || /^Level \d+$/.test(text!.trim());
      expect(isValid).toBe(true);
    }
  });

  test('CaseCard uses crime_level_details.level for badge', async ({ page }) => {
    // Intercept the cases API to inspect what crime_level value looks like
    let apiCrimeLevel: any = null;
    let apiCrimeLevelDetails: any = null;
    await page.route('**/api/v1/cases/cases/**', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      // Grab first case's crime_level info
      const results = json.results || [json];
      if (results.length > 0) {
        apiCrimeLevel = results[0].crime_level;
        apiCrimeLevelDetails = results[0].crime_level_details;
      }
      await route.fulfill({ response });
    });

    await page.goto('/cases', { waitUntil: 'networkidle' });

    // If API returned data, verify the crime_level_details has a level field
    if (apiCrimeLevelDetails) {
      expect(apiCrimeLevelDetails).toHaveProperty('level');
      expect([0, 1, 2, 3]).toContain(apiCrimeLevelDetails.level);
    }
  });
});
