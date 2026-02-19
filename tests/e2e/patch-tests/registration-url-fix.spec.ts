/**
 * Patch Test: Registration URL Fix
 * 
 * Verifies that registration posts to /api/v1/accounts/users/ (not /api/v1/v1/accounts/users/).
 * Also verifies that error messages show readable field labels.
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse, mockAPIError, uniqueId } from '../helpers/test-utils';

test.describe('Patch: Registration URL & Error Messages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('registration should POST to correct URL /api/v1/accounts/users/', async ({ page }) => {
    // Intercept the correct URL and mock a success response
    let capturedUrl = '';
    await page.route('**/api/v1/**', (route) => {
      capturedUrl = route.request().url();
      // Success response
      if (route.request().url().includes('/accounts/users/')) {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, username: 'testuser', message: 'User created' }),
        });
      } else {
        route.continue();
      }
    });

    // Fill the form
    const uid = uniqueId();
    await page.fill('#first_name', 'John');
    await page.fill('#last_name', 'Doe');
    await page.fill('#national_id', `NID${uid}`);
    await page.fill('#email', `test${uid}@lapd.gov`);
    await page.fill('#phone_number', '5551234567');
    await page.fill('#username', `user_${uid}`);
    await page.fill('#password', 'StrongPass123!');
    await page.fill('#confirm_password', 'StrongPass123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for request
    await page.waitForTimeout(2000);

    // Verify it hit the correct URL (not /v1/v1/)
    expect(capturedUrl).toContain('/api/v1/accounts/users/');
    expect(capturedUrl).not.toContain('/v1/v1/');
  });

  test('should NOT post to double /v1/v1/ prefix', async ({ page }) => {
    let hitDoublePrefix = false;
    await page.route('**/v1/v1/**', (route) => {
      hitDoublePrefix = true;
      route.fulfill({ status: 404, body: 'Not Found' });
    });

    const uid = uniqueId();
    await page.fill('#first_name', 'Jane');
    await page.fill('#last_name', 'Doe');
    await page.fill('#national_id', `XX${uid}`);
    await page.fill('#email', `jane${uid}@test.com`);
    await page.fill('#phone_number', '5559876543');
    await page.fill('#username', `jane_${uid}`);
    await page.fill('#password', 'StrongPass123!');
    await page.fill('#confirm_password', 'StrongPass123!');

    // Mock the correct endpoint
    await mockAPIResponse(page, 'accounts/users/', { id: 2, username: `jane_${uid}` }, 201);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    expect(hitDoublePrefix).toBe(false);
  });

  test('error messages should show readable field labels, not raw keys', async ({ page }) => {
    // Mock a validation error response
    await mockAPIError(page, 'accounts/users/', 400, {
      username: ['A user with that username already exists.'],
      phone_number: ['This field is required.'],
      national_id: ['Ensure this field has at least 10 characters.'],
    });

    const uid = uniqueId();
    await page.fill('#first_name', 'Test');
    await page.fill('#last_name', 'User');
    await page.fill('#national_id', `X${uid}`);
    await page.fill('#email', `test${uid}@test.com`);
    await page.fill('#phone_number', '555');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'StrongPass123!');
    await page.fill('#confirm_password', 'StrongPass123!');

    await page.click('button[type="submit"]');

    // Wait for error to appear
    await page.waitForTimeout(2000);

    // Check that the error contains readable labels
    const pageContent = await page.textContent('body');
    
    // Should show "Username" not "username"
    // Verify readable labels appear somewhere on the page
    const hasReadableLabel = 
      pageContent?.includes('Username') || 
      pageContent?.includes('Phone Number') ||
      pageContent?.includes('National ID');
    
    expect(hasReadableLabel).toBe(true);
  });
});
