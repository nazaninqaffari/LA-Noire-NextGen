/**
 * Registration E2E Tests
 * 
 * Comprehensive tests for user registration covering form validation,
 * successful registration, error handling, and edge cases.
 */
import { test, expect } from '@playwright/test';
import { uniqueId, mockAPIError, mockAPIResponse } from '../helpers/test-utils';

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  // ─── UI Rendering ─────────────────────────────────────────────────

  test('should display registration page with all required elements', async ({ page }) => {
    await expect(page.locator('.register-page')).toBeVisible();
    await expect(page.locator('.register-container')).toBeVisible();
    await expect(page.locator('.register-header h1')).toContainText('Create Account');
    await expect(page.locator('.register-subtitle')).toContainText('Join the LA Noire NextGen System');
    await expect(page.locator('.register-icon')).toBeVisible();
  });

  test('should display all form sections with proper headings', async ({ page }) => {
    await expect(page.locator('h3:has-text("Personal Information")')).toBeVisible();
    await expect(page.locator('h3:has-text("Contact Information")')).toBeVisible();
    await expect(page.locator('h3:has-text("Account Credentials")')).toBeVisible();
  });

  test('should display all 8 required form fields', async ({ page }) => {
    const fields = ['first_name', 'last_name', 'national_id', 'email', 'phone_number', 'username', 'password', 'confirm_password'];
    for (const field of fields) {
      await expect(page.locator(`#${field}`)).toBeVisible();
    }
  });

  test('should display correct labels for all fields', async ({ page }) => {
    await expect(page.locator('label[for="first_name"]')).toContainText('First Name');
    await expect(page.locator('label[for="last_name"]')).toContainText('Last Name');
    await expect(page.locator('label[for="national_id"]')).toContainText('National ID');
    await expect(page.locator('label[for="email"]')).toContainText('Email Address');
    await expect(page.locator('label[for="phone_number"]')).toContainText('Phone Number');
    await expect(page.locator('label[for="username"]')).toContainText('Username');
    await expect(page.locator('label[for="password"]')).toContainText('Password');
    await expect(page.locator('label[for="confirm_password"]')).toContainText('Confirm Password');
  });

  test('should display correct placeholders', async ({ page }) => {
    await expect(page.locator('#national_id')).toHaveAttribute('placeholder', 'Enter your national ID');
    await expect(page.locator('#email')).toHaveAttribute('placeholder', 'detective@lapd.gov');
    await expect(page.locator('#phone_number')).toHaveAttribute('placeholder', '1234567890');
    await expect(page.locator('#username')).toHaveAttribute('placeholder', 'Choose a unique username');
    await expect(page.locator('#password')).toHaveAttribute('placeholder', 'Minimum 8 characters');
    await expect(page.locator('#confirm_password')).toHaveAttribute('placeholder', 'Re-enter password');
  });

  test('should display submit button', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText('Create Account');
    await expect(submitBtn).toBeEnabled();
  });

  test('should display login link in footer', async ({ page }) => {
    await expect(page.locator('.register-footer')).toContainText('Already have an account?');
    const loginLink = page.locator('.register-footer a[href="/login"]');
    await expect(loginLink).toHaveText('Sign In');
  });

  test('should display note about default role', async ({ page }) => {
    await expect(page.locator('.register-footer .note')).toContainText('Normal User');
    await expect(page.locator('.register-footer .note')).toContainText('administrators');
  });

  // ─── Field Validation - Empty Fields ──────────────────────────────

  test('should show error when submitting completely empty form', async ({ page }) => {
    await page.click('button[type="submit"]');
    const notification = page.locator('.notification').filter({ hasText: /validation|error|fix/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show error when first name is empty', async ({ page }) => {
    await fillAllFieldsExcept(page, 'first_name');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show error when last name is empty', async ({ page }) => {
    await fillAllFieldsExcept(page, 'last_name');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show error when national ID is empty', async ({ page }) => {
    await fillAllFieldsExcept(page, 'national_id');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show error when email is empty', async ({ page }) => {
    await fillAllFieldsExcept(page, 'email');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show error when phone number is empty', async ({ page }) => {
    await fillAllFieldsExcept(page, 'phone_number');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show error when username is empty', async ({ page }) => {
    await fillAllFieldsExcept(page, 'username');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should show error when password is empty', async ({ page }) => {
    await fillAllFieldsExcept(page, 'password');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message').first()).toBeVisible();
  });

  // ─── Field Validation - Format Errors ─────────────────────────────

  test('should show error for invalid email format', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#email', 'notanemail');
    await page.click('button[type="submit"]');
    // Browser native email validation or custom validation will prevent submission
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const hasCustomError = await page.locator('.error-message').count() > 0;
    expect(isInvalid || hasCustomError).toBe(true);
  });

  test('should show error for email without @', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#email', 'test.com');
    await page.click('button[type="submit"]');
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const hasCustomError = await page.locator('.error-message').count() > 0;
    expect(isInvalid || hasCustomError).toBe(true);
  });

  test('should show error for email without domain', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#email', 'test@');
    await page.click('button[type="submit"]');
    const emailInput = page.locator('#email');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    const hasCustomError = await page.locator('.error-message').count() > 0;
    expect(isInvalid || hasCustomError).toBe(true);
  });

  test('should show error for phone number too short', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#phone_number', '12345');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText(/phone/i);
  });

  test('should show error for phone with letters', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#phone_number', 'abc1234567');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText(/phone/i);
  });

  test('should show error for username less than 3 characters', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#username', 'ab');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText(/username/i);
  });

  test('should show error for password less than 8 characters', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#password', '1234567');
    await page.fill('#confirm_password', '1234567');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText(/password/i);
  });

  test('should show error for national ID less than 8 characters', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#national_id', '1234567');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText(/national/i);
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await fillAllFields(page);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm_password', 'DifferentPass123!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message')).toContainText(/match/i);
  });

  // ─── Inline Validation ────────────────────────────────────────────

  test('should clear error when user starts typing in errored field', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-message').first()).toBeVisible();

    // Start typing in the first errored field
    await page.fill('#first_name', 'John');

    // The error for first_name should disappear
    const firstNameErrors = page.locator('#first_name').locator('..').locator('.error-message');
    await expect(firstNameErrors).toHaveCount(0);
  });

  test('should add error class to invalid fields', async ({ page }) => {
    await page.click('button[type="submit"]');
    // Fields with errors should have 'error' class
    await expect(page.locator('#first_name')).toHaveClass(/error/);
  });

  // ─── Successful Registration ──────────────────────────────────────

  test('should successfully register with valid data', async ({ page }) => {
    // Mock the registration API to return success
    await page.route('**accounts/users**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 99, username: 'testuser', email: 'test@lapd.gov' }),
        });
      } else {
        route.continue();
      }
    });

    await fillAllFields(page);
    await page.click('button[type="submit"]');

    // Should show success notification
    const notification = page.locator('.notification').filter({ hasText: /success|created/i });
    await expect(notification).toBeVisible({ timeout: 15000 });
  });

  test('should show loading state during registration', async ({ page }) => {
    await fillAllFields(page);
    
    await page.route('**accounts/users**', async (route) => {
      await new Promise((res) => setTimeout(res, 2000));
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 99 }),
      });
    });

    await page.click('button[type="submit"]');
    await expect(page.locator('.register-header h1')).toContainText('Creating Your Account');
  });

  test('should redirect to login page after successful registration', async ({ page }) => {
    // Mock the registration API to return success
    await page.route('**accounts/users**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 99, username: 'testuser' }),
        });
      } else {
        route.continue();
      }
    });

    await fillAllFields(page);
    await page.click('button[type="submit"]');

    // Should redirect to login after short delay
    await page.waitForURL('**/login', { timeout: 15000 });
  });

  // ─── Server-Side Validation Errors ────────────────────────────────

  test('should show error for duplicate username', async ({ page }) => {
    await page.route('**accounts/users**', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ username: ['A user with that username already exists.'] }),
      });
    });

    await fillAllFields(page);
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /already exists|duplicate|username|failed/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should show error for duplicate email', async ({ page }) => {
    await page.route('**accounts/users**', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ email: ['A user with this email already exists.'] }),
      });
    });

    await fillAllFields(page);
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /error|failed|email/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle server error during registration', async ({ page }) => {
    await page.route('**accounts/users**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal Server Error' }),
      });
    });

    await fillAllFields(page);
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle network error during registration', async ({ page }) => {
    await page.route('**accounts/users**', (route) => route.abort());

    await fillAllFields(page);
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  // ─── Navigation ───────────────────────────────────────────────────

  test('should navigate to login page via Sign In link', async ({ page }) => {
    await page.click('a:has-text("Sign In")');
    await expect(page).toHaveURL(/.*login/);
  });

  // ─── Edge Cases ───────────────────────────────────────────────────

  test('should handle XSS in form fields', async ({ page }) => {
    await page.fill('#first_name', '<script>alert("xss")</script>');
    await page.fill('#last_name', 'User');
    await page.fill('#national_id', '12345678');
    await page.fill('#email', 'xss@test.com');
    await page.fill('#phone_number', '5551234567');
    await page.fill('#username', 'xss_test');
    await page.fill('#password', 'TestPass123!');
    await page.fill('#confirm_password', 'TestPass123!');
    await page.click('button[type="submit"]');

    // App should not crash
    await expect(page.locator('.register-page, .notification').first()).toBeVisible();
  });

  test('should handle very long values in all fields', async ({ page }) => {
    const longStr = 'a'.repeat(300);
    await page.fill('#first_name', longStr);
    await page.fill('#last_name', longStr);
    await page.fill('#national_id', longStr);
    await page.fill('#email', `${longStr}@test.com`);
    await page.fill('#phone_number', '1'.repeat(20));
    await page.fill('#username', longStr);
    await page.fill('#password', longStr);
    await page.fill('#confirm_password', longStr);
    await page.click('button[type="submit"]');

    // Should handle gracefully without crash - either show page or notification
    await expect(page.locator('.register-page')).toBeVisible({ timeout: 10000 });
  });

  test('should handle unicode characters in name fields', async ({ page }) => {
    await page.fill('#first_name', '名前');
    await page.fill('#last_name', '苗字');
    await page.fill('#national_id', '12345678');
    await page.fill('#email', 'unicode@test.com');
    await page.fill('#phone_number', '5551234567');
    await page.fill('#username', 'unicode_user');
    await page.fill('#password', 'TestPass123!');
    await page.fill('#confirm_password', 'TestPass123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('.register-page, .notification').first()).toBeVisible();
  });

  // ─── Autocomplete Attributes ──────────────────────────────────────

  test('should have correct autocomplete attributes', async ({ page }) => {
    await expect(page.locator('#first_name')).toHaveAttribute('autocomplete', 'given-name');
    await expect(page.locator('#last_name')).toHaveAttribute('autocomplete', 'family-name');
    await expect(page.locator('#email')).toHaveAttribute('autocomplete', 'email');
    await expect(page.locator('#phone_number')).toHaveAttribute('autocomplete', 'tel');
    await expect(page.locator('#username')).toHaveAttribute('autocomplete', 'username');
    await expect(page.locator('#password')).toHaveAttribute('autocomplete', 'new-password');
    await expect(page.locator('#confirm_password')).toHaveAttribute('autocomplete', 'new-password');
  });

  // ─── Input Types ──────────────────────────────────────────────────

  test('should have correct input types for all fields', async ({ page }) => {
    await expect(page.locator('#first_name')).toHaveAttribute('type', 'text');
    await expect(page.locator('#last_name')).toHaveAttribute('type', 'text');
    await expect(page.locator('#national_id')).toHaveAttribute('type', 'text');
    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('#phone_number')).toHaveAttribute('type', 'tel');
    await expect(page.locator('#username')).toHaveAttribute('type', 'text');
    await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    await expect(page.locator('#confirm_password')).toHaveAttribute('type', 'password');
  });
});

// ─── Helper Functions ──────────────────────────────────────────────────────────

async function fillAllFields(page: any) {
  const id = uniqueId();
  await page.fill('#first_name', 'Test');
  await page.fill('#last_name', 'User');
  await page.fill('#national_id', `NID${id.substring(0, 12)}`);
  await page.fill('#email', `test_${id}@lapd.gov`);
  await page.fill('#phone_number', `555${Date.now().toString().slice(-7)}`);
  await page.fill('#username', `user_${id}`.substring(0, 20));
  await page.fill('#password', 'TestPass123!');
  await page.fill('#confirm_password', 'TestPass123!');
}

async function fillAllFieldsExcept(page: any, fieldToSkip: string) {
  const id = uniqueId();
  const fieldValues: Record<string, string> = {
    first_name: 'Test',
    last_name: 'User',
    national_id: `NID${id.substring(0, 12)}`,
    email: `test_${id}@lapd.gov`,
    phone_number: `555${Date.now().toString().slice(-7)}`,
    username: `user_${id}`.substring(0, 20),
    password: 'TestPass123!',
    confirm_password: 'TestPass123!',
  };

  for (const [field, value] of Object.entries(fieldValues)) {
    if (field !== fieldToSkip) {
      await page.fill(`#${field}`, value);
    }
  }
}
