/**
 * Patch Test: Most Wanted – Manual Intensive Pursuit
 *
 * Bug: When an admin manually sets a suspect to 'intensive_pursuit' status,
 *      the suspect did not appear on the Most Wanted page because the API
 *      endpoint filtered by `identified_at <= 30 days ago`.
 * Fix: Separated auto-upgrade logic from display. Now returns ALL suspects
 *      with status='intensive_pursuit' regardless of identified_at date.
 *
 * Verifies:
 * 1. The intensive_pursuit API endpoint returns 200
 * 2. The Most Wanted page loads and renders correctly
 * 3. If suspects exist on the list, they include `case` field in API response
 * 4. Tip form has a type selector (suspect vs case)
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api/v1';

test.describe('Patch: Most Wanted Manual Status', () => {
  test('intensive_pursuit API returns 200', async ({ request }) => {
    // This is a public endpoint - no auth needed
    const response = await request.get(`${API}/investigation/suspects/intensive_pursuit/`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('intensive_pursuit API response includes case field', async ({ request }) => {
    const response = await request.get(`${API}/investigation/suspects/intensive_pursuit/`);
    const data = await response.json();
    // If there are suspects, each should have a 'case' field
    if (data.length > 0) {
      expect(data[0]).toHaveProperty('case');
      expect(data[0]).toHaveProperty('case_title');
      expect(data[0]).toHaveProperty('danger_score');
      expect(data[0]).toHaveProperty('reward_amount');
    }
  });

  test('most wanted page loads', async ({ page }) => {
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Most Wanted' })).toBeVisible({ timeout: 10000 });
  });

  test('tip form has type selector', async ({ page }) => {
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Most Wanted' })).toBeVisible({ timeout: 10000 });

    // Click the "Submit a Tip" button to open the form
    const tipButton = page.locator('button:has-text("Submit a Tip")');
    await expect(tipButton).toBeVisible({ timeout: 5000 });
    await tipButton.click();

    // The type selector should show
    const typeSelect = page.locator('#tip-type');
    await expect(typeSelect).toBeVisible({ timeout: 5000 });
    
    // Should have suspect and case options
    const options = typeSelect.locator('option');
    await expect(options).toHaveCount(2);
  });

  test('tip form shows case dropdown when "case" type selected', async ({ page }) => {
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    
    const tipButton = page.locator('button:has-text("Submit a Tip")');
    await expect(tipButton).toBeVisible({ timeout: 5000 });
    await tipButton.click();

    // Select "case" type
    await page.selectOption('#tip-type', 'case');

    // Case dropdown should appear
    const caseSelect = page.locator('#tip-case');
    await expect(caseSelect).toBeVisible({ timeout: 5000 });
  });

  test('tip form shows suspect dropdown when "suspect" type selected', async ({ page }) => {
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    
    const tipButton = page.locator('button:has-text("Submit a Tip")');
    await expect(tipButton).toBeVisible({ timeout: 5000 });
    await tipButton.click();

    // Default is "suspect" — suspect dropdown should show
    const suspectSelect = page.locator('#tip-suspect');
    await expect(suspectSelect).toBeVisible({ timeout: 5000 });
  });

  test('reward verification form exists', async ({ page }) => {
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    
    const rewardButton = page.locator('button:has-text("Verify Reward")');
    await expect(rewardButton).toBeVisible({ timeout: 5000 });
    await rewardButton.click();

    await expect(page.locator('#reward-code')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#reward-nid')).toBeVisible({ timeout: 5000 });
  });
});
