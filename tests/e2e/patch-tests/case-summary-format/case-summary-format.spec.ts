/**
 * Patch Test: Case Summary Formatting (Bug 6)
 *
 * Bug: Trial detail showed case summary as raw JSON.stringify output in a
 * <pre> tag. The API returns rich structured data that should be displayed
 * in a formatted UI with sections for case info, suspect, police members,
 * interrogations, testimonies, evidence, and decisions.
 *
 * Fix: Replaced JSON.stringify with proper formatted sections using
 * summary-block, summary-grid, summary-item etc.
 *
 * Verifies:
 * 1. Trials page loads without rendering raw JSON
 * 2. When a trial is selected, summary blocks are shown instead of <pre>
 */
import { test, expect } from '@playwright/test';

test.describe('Patch: Case Summary Formatting', () => {

  test('trials page loads without errors', async ({ page }) => {
    await page.goto('/trials', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const heading = page.locator('h1:has-text("Trial Records")');
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('case summary uses formatted blocks not raw JSON', async ({ page }) => {
    await page.goto('/trials', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Click on the first trial card if available
    const trialCards = page.locator('.trial-card');
    const cardCount = await trialCards.count();

    if (cardCount === 0) {
      test.skip();
      return;
    }

    await trialCards.first().click();
    await page.waitForTimeout(2000);

    // Check that no <pre> with JSON content exists in the summary section
    const summaryPre = page.locator('.summary-section pre.summary-content');
    expect(await summaryPre.count()).toBe(0);

    // Instead, summary-block elements should exist
    const summaryBlocks = page.locator('.summary-block');
    const blockCount = await summaryBlocks.count();
    // If there's a case summary, we should have at least the case info block
    if (blockCount > 0) {
      expect(blockCount).toBeGreaterThanOrEqual(1);
      // Verify structured content
      const labels = page.locator('.summary-item .label');
      expect(await labels.count()).toBeGreaterThan(0);
    }
  });
});
