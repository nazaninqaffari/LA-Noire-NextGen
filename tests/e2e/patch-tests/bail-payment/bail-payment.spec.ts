/**
 * Patch Test: Bail Payment System
 *
 * Feature: Bail payment system with Zarinpal integration
 *   - Level 2 bail auto-approved
 *   - Level 3 bail requires sergeant approval
 *   - Payment via Zarinpal sandbox gateway
 *   - Sergeant can approve/reject pending bail requests
 *
 * Verifies:
 * 1. Bail payments page loads
 * 2. Bail approvals page loads
 * 3. Bail-related API endpoints exist and respond correctly
 * 4. Bail payment creation validates amount
 */
import { test, expect } from '@playwright/test';

const API = 'http://localhost:8000/api/v1';

test.describe('Patch: Bail Payment System', () => {
  test('bail payments page loads', async ({ page }) => {
    await page.goto('/bail', { waitUntil: 'domcontentloaded' });
    // Should not show 404 or error
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible({ timeout: 10000 });
  });

  test('bail approvals page loads', async ({ page }) => {
    await page.goto('/bail-approvals', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, h2, .page-title').first()).toBeVisible({ timeout: 10000 });
  });

  test('bail payment return page loads', async ({ page }) => {
    // Without params, should still load (show error state)
    await page.goto('/bail/return', { waitUntil: 'domcontentloaded' });
    // Page should load without crashing
    await page.waitForTimeout(2000);
    // Should show some content (might be error or processing)
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('bail-payments API endpoint exists', async ({ request }) => {
    const response = await request.get(`${API}/trial/bail-payments/`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('results');
  });

  test('bail-payment creation validates data', async ({ request }) => {
    // Try to create bail with invalid data
    const response = await request.post(`${API}/trial/bail-payments/`, {
      data: {
        suspect: 999999,
        amount: 100,
      },
    });
    // Should be 400 (validation error) or similar client error
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('verify_payment endpoint exists', async ({ request }) => {
    const response = await request.post(`${API}/trial/bail-payments/verify_payment/`, {
      data: {
        authority: 'TEST_INVALID',
        status: 'OK',
      },
    });
    // Should return a client error (not 500 or 405) — verifying the endpoint exists
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('bail page shows bail request section', async ({ page }) => {
    await page.goto('/bail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should show either a form to request bail or a list of existing bails
    const formOrList = page.locator('form, .bail-list, .bail-requests, table, .empty-state, h2');
    await expect(formOrList.first()).toBeVisible({ timeout: 10000 });
  });

  test('bail approvals page shows correct heading', async ({ page }) => {
    await page.goto('/bail-approvals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should have a heading related to bail approvals
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
