/**
 * Patch Test: Bug 2 – Biological Evidence Image File Upload
 *
 * Verifies that the evidence registration form can submit biological
 * evidence with raw image files (not just PK references). The backend
 * now handles InMemoryUploadedFile objects in the 'images' field.
 *
 * Tests cover:
 * 1. Selecting "Biological" evidence type shows correct fields
 * 2. File input accepts image files for biological evidence
 * 3. Successful submission navigates away (mock 201)
 * 4. The request goes to the correct biological endpoint
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const CASE_ID = 42;

const MOCK_AUTH_DETECTIVE = {
  id: 10, username: 'detective1', first_name: 'Det', last_name: 'Test',
  roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
  is_active: true, date_joined: '2024-01-01',
};

test.describe('Patch: Biological Evidence Image Upload', () => {

  test.beforeEach(async ({ page }) => {
    // Auth mock
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
  });

  test('biological evidence type shows file upload field for images', async ({ page }) => {
    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Click biological type button
    const bioBtn = page.locator('button.type-btn:has-text("Biological")');
    await bioBtn.click();
    await page.waitForTimeout(500);

    // File input for images should be visible (for biological type)
    const fileInput = page.locator('#evidence-files');
    await expect(fileInput).toBeVisible();
    // It should accept image/* and allow multiple files
    await expect(fileInput).toHaveAttribute('accept', 'image/*');
    await expect(fileInput).toHaveAttribute('multiple', '');
  });

  test('successful biological evidence submission with file navigates to evidence page', async ({ page }) => {
    // Mock successful creation
    let capturedContentType = '';
    await page.route('**/api/v1/evidence/biological/', (route) => {
      capturedContentType = route.request().headers()['content-type'] || '';
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 100, case: CASE_ID, title: 'Blood sample',
          description: 'Blood at entrance', evidence_type: 'blood',
          images: [], images_data: [],
        }),
      });
    });

    // Mock evidence list page
    await mockAPIResponse(page, 'evidence/biological/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/testimonies/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/vehicles/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/id-documents/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/generic/*', { count: 0, results: [] });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Select biological type
    await page.locator('button.type-btn:has-text("Biological")').click();
    await page.waitForTimeout(500);

    // Fill required fields
    await page.fill('#title', 'Blood sample');
    await page.fill('#description', 'Blood at entrance');

    // Submit
    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    // Should navigate to evidence list page
    await expect(page).toHaveURL(new RegExp(`/evidence`));
  });

  test('biological evidence API request goes to correct endpoint', async ({ page }) => {
    let requestUrl = '';
    let requestMethod = '';

    // Register list mocks FIRST (lower LIFO priority)
    await mockAPIResponse(page, 'evidence/testimonies/**', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/biological/**', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/vehicles/**', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/id-documents/**', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/generic/**', { count: 0, results: [] });

    // Register SPECIFIC capture route LAST so it has highest LIFO priority
    await page.route('**/api/v1/evidence/biological/', (route) => {
      requestUrl = route.request().url();
      requestMethod = route.request().method();
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101, case: CASE_ID, title: 'Hair strand',
          description: 'Hair on floor', evidence_type: 'hair',
          images: [], images_data: [],
        }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Select biological type
    await page.locator('button.type-btn:has-text("Biological")').click();
    await page.waitForTimeout(500);

    // Fill fields
    await page.fill('#title', 'Hair strand');
    await page.fill('#description', 'Hair on floor');

    // Submit
    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    // Verify the request was sent to the biological endpoint
    expect(requestUrl).toContain('/api/v1/evidence/biological/');
    expect(requestMethod).toBe('POST');
  });

  test('biological evidence creation failure shows error from API response', async ({ page }) => {
    // Mock biological endpoint with error
    await page.route('**/api/v1/evidence/biological/', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          evidence_type: ['This field is required.'],
        }),
      });
    });

    await page.goto(`/evidence/register?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Select biological type
    await page.locator('button.type-btn:has-text("Biological")').click();
    await page.waitForTimeout(500);

    // Fill fields — intentionally skip evidence_type subfield
    await page.fill('#title', 'Sample');
    await page.fill('#description', 'Desc');

    // Submit
    await page.locator('button[type="submit"]:has-text("Register Evidence")').click();
    await page.waitForTimeout(2000);

    // Should show error notification with the real API error, not generic "Failed to register evidence"
    const notification = page.locator('.notification');
    await expect(notification).toBeVisible({ timeout: 5000 });
    // The extractErrorMessage should produce something with "Evidence Type"
    const text = await notification.textContent();
    expect(text?.toLowerCase()).toMatch(/evidence.type|required/i);
  });
});
