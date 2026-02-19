/**
 * Patch Test: Bug 4 – Evidence Registration Error Messages
 *
 * Verifies that when evidence registration fails, the catch block
 * calls extractErrorMessage() to show the real API error instead of
 * the generic "Failed to register evidence" string.
 *
 * Tests different evidence types to confirm all catch blocks use
 * the new error extraction logic.
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const CASE_ID = 42;

const MOCK_AUTH_DETECTIVE = {
  id: 10, username: 'detective1', first_name: 'Det', last_name: 'Test',
  roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
  is_active: true, date_joined: '2024-01-01',
};

test.describe('Patch: Evidence Registration Error Messages', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
  });

  test('testimony creation error shows real API detail message', async ({ page }) => {
    await page.route('**/api/v1/evidence/testimonies/', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Transcript field cannot be empty for testimony evidence.',
        }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Testimony is default type; fill all required fields so browser validation passes
    await page.fill('#title', 'Witness A');
    await page.fill('#description', 'Statement');
    // Fill transcript so browser required check passes — the mock API will still return 400
    await page.fill('#transcript', 'Test transcript content');

    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    const text = await notification.textContent();
    // Should show actual error, NOT "Failed to register evidence"
    expect(text).toContain('Transcript');
    expect(text).not.toBe('Failed to register evidence');
  });

  test('generic evidence creation error shows field-level messages with labels', async ({ page }) => {
    await page.route('**/api/v1/evidence/generic/', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          title: ['This field may not be blank.'],
          description: ['This field may not be blank.'],
        }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Select generic evidence
    await page.locator('button.type-btn:has-text("Other")').click();
    await page.waitForTimeout(500);

    // Fill required fields so browser validation passes — mock API still returns 400
    await page.fill('#title', 'Test item');
    await page.fill('#description', 'Test desc');
    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    const text = await notification.textContent();
    // Should show field labels from errorHandler.ts
    expect(text?.toLowerCase()).toMatch(/title|description/);
    expect(text).not.toBe('Failed to register evidence');
  });

  test('vehicle creation error shows non_field_errors from backend', async ({ page }) => {
    await page.route('**/api/v1/evidence/vehicles/', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          non_field_errors: ['Provide either a license plate or a serial/VIN number, not both.'],
        }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    await page.locator('button.type-btn:has-text("Vehicle")').click();
    await page.waitForTimeout(500);

    await page.fill('#title', 'Test car');
    await page.fill('#description', 'Car');
    await page.fill('#model', 'Honda');
    await page.fill('#color', 'Red');
    await page.fill('#license-plate', 'AAA111');
    await page.fill('#serial-number', 'VIN123');

    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    const text = await notification.textContent();
    expect(text).toContain('license plate');
  });

  test('ID document creation error shows real error message', async ({ page }) => {
    await page.route('**/api/v1/evidence/id-documents/', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          owner_full_name: ['This field is required.'],
        }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    await page.locator('button.type-btn:has-text("ID Document")').click();
    await page.waitForTimeout(500);

    await page.fill('#title', 'Passport');
    await page.fill('#description', 'Suspect passport');
    // Fill owner name so browser required check passes — mock API still returns 400
    await page.fill('#owner-name', 'John Doe');

    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    const text = await notification.textContent();
    // Should mention "Owner Full Name" (label from errorHandler.ts)
    expect(text?.toLowerCase()).toMatch(/owner|required/);
  });

  test('server 500 error shows error.message fallback, not generic string', async ({ page }) => {
    await page.route('**/api/v1/evidence/generic/', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal Server Error' }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    await page.locator('button.type-btn:has-text("Other")').click();
    await page.waitForTimeout(500);

    await page.fill('#title', 'Test item');
    await page.fill('#description', 'Test desc');

    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    const text = await notification.textContent();
    // Should show the actual server error
    expect(text).toContain('Internal Server Error');
  });
});
