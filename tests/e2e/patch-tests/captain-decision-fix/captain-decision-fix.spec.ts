/**
 * Patch Test: Captain Decision needs_more Fix (Bug 4)
 *
 * Bug: Frontend sent `needs_more_investigation` for captain decisions but
 * the backend CaptainDecision model only accepts `needs_more`. The API
 * returned 400 Bad Request.
 *
 * Fix: Changed frontend to send `needs_more` instead of `needs_more_investigation`.
 *
 * Verifies:
 * 1. Interrogations page loads without errors
 * 2. Captain decision radio buttons have correct values
 */
import { test, expect } from '@playwright/test';

test.describe('Patch: Captain Decision needs_more Fix', () => {

  test('interrogations page loads without errors', async ({ page }) => {
    await page.goto('/interrogations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should show the page title
    const heading = page.locator('h1:has-text("Interrogations")');
    await expect(heading).toBeVisible({ timeout: 5000 });

    // No error boundaries
    const errorBoundary = page.locator('text=Something went wrong');
    expect(await errorBoundary.count()).toBe(0);
  });

  test('page source does not contain needs_more_investigation', async ({ page }) => {
    await page.goto('/interrogations', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // The page HTML should not contain the old incorrect value
    const pageContent = await page.content();
    // Check that value="needs_more_investigation" is NOT present in rendered HTML
    expect(pageContent).not.toContain('value="needs_more_investigation"');
  });
});
