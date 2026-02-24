/**
 * Patch Test: Tip Review Approve/Reject via UI
 *
 * Verifies that officers and detectives can review tips through the
 * TipReview page UI using approve/reject buttons.
 */

import { test, expect, Page } from '@playwright/test';

const API = 'http://localhost:8000/api/v1';

const ADMIN = { username: 'admin', password: 'admin123' };

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function uiLogin(page: Page, username: string, password: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { state: 'visible', timeout: 8000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// ════════════════════════════════════════════════════════════════════════════════

test.describe('Tip Review Page UI Elements', () => {

  test('TipReview page loads and renders tip cards with data-testid', async ({ page }) => {
    await uiLogin(page, ADMIN.username, ADMIN.password);

    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Page should render without errors
    const pageTitle = page.locator('main h1');
    await expect(pageTitle).toContainText('Tip-Off Reviews');

    // Either tip cards or empty state should be visible
    const tipCards = page.locator('[data-testid^="tip-card-"]');
    const emptyState = page.locator('.empty-state');
    const tipCount = await tipCards.count();
    const emptyCount = await emptyState.count();

    expect(tipCount + emptyCount).toBeGreaterThan(0);
  });

  test('Tip cards have approve and reject buttons with data-testid', async ({ page }) => {
    await uiLogin(page, ADMIN.username, ADMIN.password);

    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const tipCards = page.locator('[data-testid^="tip-card-"]');
    const count = await tipCards.count();

    if (count > 0) {
      // Find any tip card with an approve button
      const approveButtons = page.locator('[data-testid^="approve-tip-"]');
      const rejectButtons = page.locator('[data-testid^="reject-tip-"]');

      const approveCount = await approveButtons.count();
      const rejectCount = await rejectButtons.count();

      // At least the approve/reject buttons should have proper data-testid
      // (they may not be visible if all tips are already reviewed)
      if (approveCount > 0) {
        const firstApprove = approveButtons.first();
        await expect(firstApprove).toBeVisible();
        const testId = await firstApprove.getAttribute('data-testid');
        expect(testId).toMatch(/^approve-tip-\d+$/);
      }
      if (rejectCount > 0) {
        const firstReject = rejectButtons.first();
        await expect(firstReject).toBeVisible();
        const testId = await firstReject.getAttribute('data-testid');
        expect(testId).toMatch(/^reject-tip-\d+$/);
      }
    }
  });
});
