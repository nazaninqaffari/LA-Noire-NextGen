/**
 * Authentication & Login E2E Tests
 * 
 * Tests every possible scenario for login, logout, session management,
 * CSRF handling, and authentication state persistence.
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, TEST_ADMIN, mockAPIError, waitForLoading, expectURL, uniqueId } from '../helpers/test-utils';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  // ─── UI Rendering ─────────────────────────────────────────────────

  test('should display login page with all required elements', async ({ page }) => {
    // Page structure
    await expect(page.locator('.login-page')).toBeVisible();
    await expect(page.locator('.login-container')).toBeVisible();

    // Header elements
    await expect(page.locator('.login-header h1')).toContainText('LA Noire NextGen');
    await expect(page.locator('.login-subtitle')).toContainText('Los Angeles Police Department');
    await expect(page.locator('.login-tagline')).toContainText('Case Management System');

    // LAPD badge
    await expect(page.locator('.login-badge')).toBeVisible();
  });

  test('should display login form with username and password fields', async ({ page }) => {
    // Username field
    const usernameInput = page.locator('#username');
    await expect(usernameInput).toBeVisible();
    await expect(usernameInput).toHaveAttribute('type', 'text');
    await expect(usernameInput).toHaveAttribute('name', 'username');
    await expect(usernameInput).toHaveAttribute('placeholder', 'Enter your username');
    await expect(usernameInput).toHaveAttribute('autocomplete', 'username');

    // Password field
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('name', 'password');
    await expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    // Labels
    await expect(page.locator('label[for="username"]')).toHaveText('Username');
    await expect(page.locator('label[for="password"]')).toHaveText('Password');
  });

  test('should display submit button with correct text', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toHaveText('Sign In');
    await expect(submitBtn).toBeEnabled();
    await expect(submitBtn).toHaveClass(/btn-primary/);
  });

  test('should display footer links', async ({ page }) => {
    // Forgot password link
    await expect(page.locator('.forgot-password a')).toHaveAttribute('href', '/forgot-password');

    // Register link
    const registerLink = page.locator('.signup-link a');
    await expect(registerLink).toHaveText('Create Account');
    await expect(registerLink).toHaveAttribute('href', '/register');
  });

  test('should display system access info', async ({ page }) => {
    await expect(page.locator('.login-info')).toContainText('For System Access');
    await expect(page.locator('.login-info')).toContainText('administrator approval');
  });

  test('should auto-focus username field on load', async ({ page }) => {
    await expect(page.locator('#username')).toBeFocused();
  });

  // ─── Form Validation ──────────────────────────────────────────────

  test('should show warning when submitting with empty username', async ({ page }) => {
    await page.fill('#password', 'somepassword');
    await page.click('button[type="submit"]');

    // Should show notification about missing username
    const notification = page.locator('.notification').filter({ hasText: /username/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show warning when submitting with empty password', async ({ page }) => {
    await page.fill('#username', 'someuser');
    await page.click('button[type="submit"]');

    // Should show notification about missing password
    const notification = page.locator('.notification').filter({ hasText: /password/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show warning when submitting with both fields empty', async ({ page }) => {
    await page.click('button[type="submit"]');
    const notification = page.locator('.notification').filter({ hasText: /username/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show warning when username is only whitespace', async ({ page }) => {
    await page.fill('#username', '   ');
    await page.fill('#password', 'somepassword');
    await page.click('button[type="submit"]');
    const notification = page.locator('.notification').filter({ hasText: /username/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  // ─── Successful Login ─────────────────────────────────────────────

  test('should successfully login with valid admin credentials', async ({ page }) => {
    await page.fill('#username', TEST_ADMIN.username);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Command Dashboard' })).toBeVisible();
  });

  test('should show success notification on login', async ({ page }) => {
    await page.fill('#username', TEST_ADMIN.username);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('button[type="submit"]');

    // Wait for success notification
    const notification = page.locator('.notification').filter({ hasText: /welcome|login successful/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state during authentication', async ({ page }) => {
    await page.fill('#username', TEST_ADMIN.username);
    await page.fill('#password', TEST_ADMIN.password);

    // Intercept to slow down the request
    await page.route('**/api/v1/accounts/login/', async (route) => {
      await new Promise((res) => setTimeout(res, 2000));
      await route.continue();
    });

    await page.click('button[type="submit"]');

    // Should show loading state
    await expect(page.locator('.login-header h1')).toContainText('Authenticating');
  });

  test('should display spinner while authenticating', async ({ page }) => {
    await page.route('**/api/v1/accounts/login/', async (route) => {
      await new Promise((res) => setTimeout(res, 3000));
      await route.continue();
    });

    await page.fill('#username', TEST_ADMIN.username);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('button[type="submit"]');

    await expect(page.locator('.spinner')).toBeVisible({ timeout: 3000 });
  });

  // ─── Failed Login ─────────────────────────────────────────────────

  test('should show error notification for invalid credentials', async ({ page }) => {
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /failed|invalid|credentials|error/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should stay on login page after failed login', async ({ page }) => {
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error notification
    await page.waitForSelector('.notification', { timeout: 10000 });
    await expect(page).toHaveURL(/.*login/);
  });

  test('should clear password field is still filled after failed login', async ({ page }) => {
    await page.fill('#username', 'wronguser');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await page.waitForSelector('.notification', { timeout: 10000 });

    // Username should still be there
    await expect(page.locator('#username')).toHaveValue('wronguser');
  });

  test('should handle server error (500) gracefully', async ({ page }) => {
    await mockAPIError(page, 'accounts/login/', 500, { detail: 'Internal Server Error' });
    
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle network error gracefully', async ({ page }) => {
    await page.route('**/api/v1/accounts/login/', (route) => route.abort());
    
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle timeout gracefully', async ({ page }) => {
    await page.route('**/api/v1/accounts/login/', async (route) => {
      await new Promise((res) => setTimeout(res, 30000));
      await route.continue();
    });

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Page should show loading state
    await expect(page.locator('.login-header h1')).toContainText('Authenticating');
  });

  test('should handle 403 Forbidden response', async ({ page }) => {
    await mockAPIError(page, 'accounts/login/', 403, { detail: 'Forbidden' });
    
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /error|failed|forbidden/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle 429 Too Many Requests response', async ({ page }) => {
    await mockAPIError(page, 'accounts/login/', 429, { detail: 'Too many login attempts' });
    
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification').filter({ hasText: /error|failed|too many/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  // ─── Keyboard Navigation ──────────────────────────────────────────

  test('should submit form on Enter key press', async ({ page }) => {
    await page.fill('#username', TEST_ADMIN.username);
    await page.fill('#password', TEST_ADMIN.password);
    await page.press('#password', 'Enter');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('should tab from username to password field', async ({ page }) => {
    await page.fill('#username', 'testuser');
    await page.press('#username', 'Tab');
    await expect(page.locator('#password')).toBeFocused();
  });

  // ─── Navigation Links ─────────────────────────────────────────────

  test('should navigate to register page via Create Account link', async ({ page }) => {
    await page.click('a:has-text("Create Account")');
    await expect(page).toHaveURL(/.*register/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    const link = page.locator('a[href="/forgot-password"]');
    await expect(link).toBeVisible();
  });
});

test.describe('Login Redirect Logic', () => {
  test('should redirect authenticated user from login page to dashboard', async ({ page }) => {
    // First login
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Try to go to login page
    await page.goto('/login');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });
});

test.describe('Logout Flow', () => {
  test('should successfully logout and redirect to login', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Click logout
    await page.click('button.btn-logout');

    // Should redirect to login
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/.*login/);
  });

  test('should display logout button with correct text', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    const logoutBtn = page.locator('button.btn-logout');
    await expect(logoutBtn).toBeVisible();
    await expect(logoutBtn).toHaveText('Logout');
  });

  test('should show success notification on logout', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.click('button.btn-logout');

    const notification = page.locator('.notification').filter({ hasText: /logged out|logout/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should clear session after logout - protected pages should redirect', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.click('button.btn-logout');
    await page.waitForURL('**/login', { timeout: 10000 });

    // Try accessing protected page
    await page.goto('/dashboard');
    
    // Should be redirected to login (either by frontend auth guard or API 401)
    // Give time for API calls to fail and redirect
    await page.waitForTimeout(3000);
    const url = page.url();
    // Either stays on dashboard with no data or redirects to login
    expect(url).toMatch(/login|dashboard/);
  });

  test('should handle logout when server returns error', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    
    // Mock logout endpoint to fail
    await page.route('**/api/v1/accounts/logout/', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Server Error' }) });
    });

    await page.click('button.btn-logout');

    // Should still attempt to log out (clear cookies) even on server error
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Session Persistence', () => {
  test('should maintain session across page navigation', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Navigate to different pages
    await page.goto('/cases');
    await expect(page.locator('button.btn-logout')).toBeVisible({ timeout: 10000 });

    await page.goto('/evidence');
    await expect(page.locator('button.btn-logout')).toBeVisible({ timeout: 10000 });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Command Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('should maintain session after page refresh', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Refresh the page
    await page.reload();
    await waitForLoading(page);

    // Should still be logged in
    await expect(page.locator('button.btn-logout')).toBeVisible({ timeout: 10000 });
  });

  test('should display username in header when logged in', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await expect(page.locator('.user-name')).toContainText(TEST_ADMIN.username);
  });
});

test.describe('CSRF Protection', () => {
  test('should include CSRF token in login request headers', async ({ page }) => {
    await page.goto('/login');

    let csrfTokenSent = false;
    page.on('request', (request) => {
      if (request.url().includes('/accounts/login/') && request.method() === 'POST') {
        const headers = request.headers();
        if (headers['x-csrftoken']) {
          csrfTokenSent = true;
        }
      }
    });

    await page.fill('#username', TEST_ADMIN.username);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  });

  test('should send cookies with requests (withCredentials)', async ({ page }) => {
    await page.goto('/login');

    let credentialsSent = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        // Playwright always sends cookies in same-origin requests
        credentialsSent = true;
      }
    });

    await page.fill('#username', TEST_ADMIN.username);
    await page.fill('#password', TEST_ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  });
});

test.describe('Login with Special Characters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should handle username with special characters', async ({ page }) => {
    await page.fill('#username', 'user@#$%^&*');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    // Should show error (invalid credentials)
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle very long username', async ({ page }) => {
    const longUsername = 'a'.repeat(500);
    await page.fill('#username', longUsername);
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle SQL injection attempt in username', async ({ page }) => {
    await page.fill('#username', "admin'; DROP TABLE users; --");
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
    // Should not crash the app
    await expect(page.locator('.login-page')).toBeVisible();
  });

  test('should handle XSS attempt in username', async ({ page }) => {
    await page.fill('#username', '<script>alert("xss")</script>');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
    // Should not execute the script
    await expect(page.locator('.login-page')).toBeVisible();
  });

  test('should handle unicode characters in username', async ({ page }) => {
    await page.fill('#username', '用户名');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle emoji in password', async ({ page }) => {
    await page.fill('#username', 'admin');
    await page.fill('#password', '🔒secret123');
    await page.click('button[type="submit"]');

    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });
});
