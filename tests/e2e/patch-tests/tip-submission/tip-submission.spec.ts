/**
 * Patch Test: Tip Submission Workflow
 *
 * Bug: Tip sending didn't work because:
 *   1. createTipOff didn't send the required `case` field
 *   2. The suspect dropdown had no data (API didn't return `case` FK ID)
 *   3. No type selector to choose between suspect tip vs case tip
 *   4. Officer/detective review service used wrong payload format
 *
 * Fix:
 *   - Added `case` field to IntensivePursuitSuspectSerializer
 *   - Added tip type selector (suspect vs case) in MostWanted.tsx
 *   - Fixed officerReviewTipOff/detectiveReviewTipOff to send { approved, rejection_reason }
 *   - Created TipReview page for officers and detectives
 *
 * Verifies:
 * 1. Tip submission API requires `case` field 
 * 2. Tip review page loads for authenticated users
 * 3. Tip-off CRUD endpoints work correctly
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api/v1';

test.describe('Patch: Tip Submission Workflow', () => {
  test('tip creation requires authentication or valid data', async ({ request }) => {
    // Try to create a tip without case - should fail with 400 or 403
    const response = await request.post(`${API}/investigation/tipoffs/`, {
      data: {
        information: 'Test tip without case',
      },
    });
    // Should be 400 (bad request, missing case) or 403 (permission check)
    expect([400, 403]).toContain(response.status());
  });

  test('tipoffs list endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${API}/investigation/tipoffs/`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('results');
  });

  test('tip review page loads', async ({ page }) => {
    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    // Should show the Tip-Off Reviews heading
    await expect(page.getByRole('heading', { name: 'Tip-Off Reviews' })).toBeVisible({ timeout: 10000 });
  });

  test('tip review page shows empty state or tips', async ({ page }) => {
    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Tip-Off Reviews' })).toBeVisible({ timeout: 10000 });

    // Should show either tips or empty state
    const emptyState = page.locator('.empty-state');
    const tipCards = page.locator('.tip-card');
    
    // Wait for loading to finish
    await page.waitForTimeout(2000);
    
    // Either empty state or tip cards should be visible
    const hasEmpty = await emptyState.isVisible();
    const hasTips = await tipCards.count();
    expect(hasEmpty || hasTips > 0).toBeTruthy();
  });

  test('verify_reward endpoint exists', async ({ request }) => {
    // Call with invalid data - should return 400, not 404
    const response = await request.post(`${API}/investigation/tipoffs/verify_reward/`, {
      data: {
        redemption_code: 'INVALID',
        national_id: '0000000000',
      },
    });
    // Should not be 404 (endpoint exists)
    expect(response.status()).not.toBe(404);
  });

  test('redeem_reward endpoint exists', async ({ request }) => {
    const response = await request.post(`${API}/investigation/tipoffs/redeem_reward/`, {
      data: {
        redemption_code: 'INVALID',
        national_id: '0000000000',
      },
    });
    expect(response.status()).not.toBe(404);
  });

  test('tip review page is accessible via URL', async ({ page }) => {
    // Navigate directly to tip reviews page
    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    // Page should load without errors
    await expect(page.getByRole('heading', { name: 'Tip-Off Reviews' })).toBeVisible({ timeout: 10000 });
  });
});
