/**
 * Patch Test: Bug 3 – Vehicle Evidence Error Display
 *
 * Verifies that vehicle evidence validation errors (like requiring
 * either license_plate or serial_number) appear as non-field errors
 * so the frontend can display them properly.
 *
 * The backend was changed from field-specific errors
 *   {"license_plate": "..."} → non_field_errors: ["..."]
 * This test ensures the error is surfaced to the user.
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const CASE_ID = 42;

const MOCK_AUTH_DETECTIVE = {
  id: 10, username: 'detective1', first_name: 'Det', last_name: 'Test',
  roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
  is_active: true, date_joined: '2024-01-01',
};

test.describe('Patch: Vehicle Evidence Error Display', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
  });

  test('submitting vehicle with both plate and serial returns non-field error', async ({ page }) => {
    // Mock the vehicle endpoint to return non_field_errors
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

    // Select vehicle type
    await page.locator('button.type-btn:has-text("Vehicle")').click();
    await page.waitForTimeout(500);

    // Fill form fields
    await page.fill('#title', 'Suspicious van');
    await page.fill('#description', 'White van near scene');
    await page.fill('#model', 'Transit');
    await page.fill('#color', 'White');
    await page.fill('#license-plate', 'ABC123');
    await page.fill('#serial-number', 'VIN9999');

    // Submit
    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    // Error notification should show the non-field error message
    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    const text = await notification.textContent();
    expect(text).toContain('license plate');
  });

  test('submitting vehicle with neither plate nor serial returns non-field error', async ({ page }) => {
    await page.route('**/api/v1/evidence/vehicles/', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          non_field_errors: ['Either a license plate or a serial/VIN number is required.'],
        }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    await page.locator('button.type-btn:has-text("Vehicle")').click();
    await page.waitForTimeout(500);

    await page.fill('#title', 'Unknown car');
    await page.fill('#description', 'Dark sedan spotted');
    await page.fill('#model', 'Sedan');
    await page.fill('#color', 'Black');
    // Deliberately leave plate and serial empty

    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    const text = await notification.textContent();
    expect(text).toContain('license plate');
  });

  test('vehicle evidence form shows model, color, plate, and serial fields', async ({ page }) => {
    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Select vehicle type
    await page.locator('button.type-btn:has-text("Vehicle")').click();
    await page.waitForTimeout(500);

    // All vehicle-specific fields should be visible
    await expect(page.locator('#model')).toBeVisible();
    await expect(page.locator('#color')).toBeVisible();
    await expect(page.locator('#license-plate')).toBeVisible();
    await expect(page.locator('#serial-number')).toBeVisible();
  });

  test('successful vehicle evidence submission navigates to evidence page', async ({ page }) => {
    await page.route('**/api/v1/evidence/vehicles/', (route) => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 200, case: CASE_ID, title: 'Blue truck',
          description: 'Truck at scene', model: 'F-150', color: 'Blue',
          license_plate: 'XYZ789', serial_number: '',
        }),
      });
    });

    // Mock evidence list
    await mockAPIResponse(page, 'evidence/testimonies/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/biological/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/vehicles/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/id-documents/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/generic/*', { count: 0, results: [] });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    await page.locator('button.type-btn:has-text("Vehicle")').click();
    await page.waitForTimeout(500);

    await page.fill('#title', 'Blue truck');
    await page.fill('#description', 'Truck at scene');
    await page.fill('#model', 'F-150');
    await page.fill('#color', 'Blue');
    await page.fill('#license-plate', 'XYZ789');

    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    await expect(page).toHaveURL(new RegExp('/evidence'));
  });
});
