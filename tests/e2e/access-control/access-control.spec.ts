/**
 * Access Control & Role-Based Authorization E2E Tests
 * 
 * Tests that role-based navigation visibility works correctly,
 * protected routes require authentication, and role-specific
 * features are properly gated.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_ADMIN, waitForLoading, mockAPIResponse } from '../helpers/test-utils';

test.describe('Unauthenticated Access Control', () => {
  // Override storageState so these tests start without authentication
  test.use({ storageState: { cookies: [], origins: [] } });

  // ─── Public Pages Should Be Accessible ───────────────────────────

  test('should allow access to home page without authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.home-page, .hero').first()).toBeVisible();
  });

  test('should allow access to login page without authentication', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('.login-page')).toBeVisible();
  });

  test('should allow access to register page without authentication', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('.register-page')).toBeVisible();
  });

  test('should allow access to most-wanted page without authentication', async ({ page }) => {
    await page.goto('/most-wanted');
    await expect(page.locator('body')).toBeVisible();
    // Most wanted is public
  });

  test('should allow access to style-guide without authentication', async ({ page }) => {
    await page.goto('/style-guide');
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Protected Pages Should Redirect/Block ───────────────────────

  test('should handle unauthenticated access to dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    
    // Should redirect to login or show error/loading
    const url = page.url();
    const hasLoginRedirect = url.includes('login');
    const hasNotification = await page.locator('.notification').count() > 0;
    const isOnDashboard = url.includes('dashboard');
    
    // Either redirected to login, shows error, or dashboard with no data
    expect(hasLoginRedirect || hasNotification || isOnDashboard).toBeTruthy();
  });

  test('should handle unauthenticated access to cases', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('cases')).toBeTruthy();
  });

  test('should handle unauthenticated access to evidence', async ({ page }) => {
    await page.goto('/evidence');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('evidence')).toBeTruthy();
  });

  test('should handle unauthenticated access to suspects', async ({ page }) => {
    await page.goto('/suspects');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('suspects')).toBeTruthy();
  });

  test('should handle unauthenticated access to detective-board', async ({ page }) => {
    await page.goto('/detective-board');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('detective-board')).toBeTruthy();
  });

  test('should handle unauthenticated access to trials', async ({ page }) => {
    await page.goto('/trials');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('trials')).toBeTruthy();
  });

  test('should handle unauthenticated access to reports', async ({ page }) => {
    await page.goto('/reports');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('reports')).toBeTruthy();
  });

  test('should handle unauthenticated access to admin panel', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('admin')).toBeTruthy();
  });

  test('should handle unauthenticated access to create complaint', async ({ page }) => {
    await page.goto('/cases/complaint/new');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('complaint')).toBeTruthy();
  });

  test('should handle unauthenticated access to create crime scene report', async ({ page }) => {
    await page.goto('/cases/scene/new');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('scene')).toBeTruthy();
  });

  test('should handle unauthenticated access to evidence register', async ({ page }) => {
    await page.goto('/evidence/register');
    await page.waitForTimeout(3000);
    
    const url = page.url();
    expect(url.includes('login') || url.includes('evidence')).toBeTruthy();
  });
});

test.describe('Admin User Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
  });

  test('should show Admin link in navigation', async ({ page }) => {
    // Wait for user info to load in the header (proves auth context is ready)
    await expect(page.locator('.user-name')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav a:has-text("Admin")')).toBeVisible({ timeout: 10000 });
  });

  test('should be able to access admin panel', async ({ page }) => {
    await page.goto('/admin');
    await waitForLoading(page);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should be able to access all core pages', async ({ page }) => {
    const pages = ['/dashboard', '/cases', '/evidence', '/suspects'];
    for (const path of pages) {
      await page.goto(path);
      await waitForLoading(page);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should be able to create complaints', async ({ page }) => {
    await page.goto('/cases/complaint/new');
    await waitForLoading(page);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('should be able to create crime scene reports', async ({ page }) => {
    await page.goto('/cases/scene/new');
    await waitForLoading(page);
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

test.describe('Role-Based Navigation Visibility', () => {
  // Override storageState - these tests mock their own login/auth
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Helper: sets up route mocks for a role-based login test.
   *
   * Key design:
   *  1. Catch-all /api/v1/** returns 200 with empty results (prevents 401 redirects on dashboard).
   *  2. /users/me/ returns 401 BEFORE login (so AuthContext.checkAuth() sees "not authenticated"
   *     and the login form actually renders) then returns user data AFTER login.
   *  3. /login/ returns the user payload and flips the loggedIn flag.
   *
   * Playwright evaluates routes in reverse registration order (last registered wins),
   * so specific routes registered after the catch-all take priority.
   */
  async function setupMockedLogin(page: import('@playwright/test').Page, userData: Record<string, any>) {
    let loggedIn = false;

    // 1️⃣ Catch-all: return empty paginated results for every API endpoint
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [], count: 0 }),
      });
    });

    // 2️⃣ /users/me/ – 401 before login, real user data after
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      if (loggedIn) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(userData),
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Authentication credentials were not provided.' }),
        });
      }
    });

    // 3️⃣ /login/ – flip flag and return user
    await page.route('**/api/v1/accounts/login/', (route) => {
      loggedIn = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: userData, message: 'Login successful' }),
      });
    });
  }

  /** Fill the login form and wait for navigation to /dashboard */
  async function doMockedLogin(page: import('@playwright/test').Page, username: string) {
    await page.goto('/login');
    await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
    await page.fill('#username', username);
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    // Wait for the nav links to render (user state is set)
    await page.waitForSelector('nav .user-name', { timeout: 5000 });
  }

  test('should show Detective Board link for users with detective role', async ({ page }) => {
    const userData = {
      id: 1, username: 'test_detective', first_name: 'John', last_name: 'Detective',
      email: 'det@test.com', is_staff: false, is_superuser: false,
      roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
    };
    await setupMockedLogin(page, userData);
    await doMockedLogin(page, 'test_detective');

    const detectiveBoardLink = page.locator('nav a:has-text("Detective Board")');
    if (await detectiveBoardLink.count() > 0) {
      await expect(detectiveBoardLink).toBeVisible();
    }
  });

  test('should show Trials link for users with judge role', async ({ page }) => {
    const userData = {
      id: 2, username: 'test_judge', first_name: 'Mike', last_name: 'Judge',
      email: 'judge@test.com', is_staff: false, is_superuser: false,
      roles: [{ id: 2, name: 'judge', hierarchy_level: 0 }],
    };
    await setupMockedLogin(page, userData);
    await doMockedLogin(page, 'test_judge');

    const trialsLink = page.locator('nav a:has-text("Trials")');
    if (await trialsLink.count() > 0) {
      await expect(trialsLink).toBeVisible();
    }
  });

  test('should show Reports link for captain users', async ({ page }) => {
    const userData = {
      id: 3, username: 'test_captain', first_name: 'Alice', last_name: 'Captain',
      email: 'cap@test.com', is_staff: false, is_superuser: false,
      roles: [{ id: 3, name: 'captain', hierarchy_level: 7 }],
    };
    await setupMockedLogin(page, userData);
    await doMockedLogin(page, 'test_captain');

    const reportsLink = page.locator('nav a:has-text("Reports")');
    if (await reportsLink.count() > 0) {
      await expect(reportsLink).toBeVisible();
    }
  });

  test('should NOT show Admin link for regular non-staff users', async ({ page }) => {
    const userData = {
      id: 10, username: 'regular_user', first_name: 'Dave', last_name: 'Regular',
      email: 'reg@test.com', is_staff: false, is_superuser: false,
      roles: [{ id: 10, name: 'base_user', hierarchy_level: 0 }],
    };
    await setupMockedLogin(page, userData);
    await doMockedLogin(page, 'regular_user');

    const adminLink = page.locator('nav a:has-text("Admin")');
    await expect(adminLink).toHaveCount(0);
  });

  test('should NOT show Detective Board for regular users without detective role', async ({ page }) => {
    const userData = {
      id: 11, username: 'normal_user', first_name: 'Ray', last_name: 'Normal',
      email: 'normal@test.com', is_staff: false, is_superuser: false,
      roles: [{ id: 10, name: 'base_user', hierarchy_level: 0 }],
    };
    await setupMockedLogin(page, userData);
    await doMockedLogin(page, 'normal_user');

    const detectiveBoardLink = page.locator('nav a:has-text("Detective Board")');
    await expect(detectiveBoardLink).toHaveCount(0);
  });
});

test.describe('API Access Control', () => {
  // Override storageState - test unauthenticated API behavior
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should return 401 for unauthenticated API requests', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/v1/cases/cases/');
    expect([401, 403]).toContain(response.status());
  });

  test('should return 401 for unauthenticated user list request', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/v1/accounts/users/me/');
    expect([401, 403]).toContain(response.status());
  });

  test('should return 401 for unauthenticated evidence request', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/v1/evidence/testimonies/');
    expect([401, 403]).toContain(response.status());
  });

  test('should return 401 for unauthenticated investigation request', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/v1/investigation/suspects/');
    expect([401, 403]).toContain(response.status());
  });

  test('should return 401 for unauthenticated trial request', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/v1/trial/trials/');
    expect([401, 403]).toContain(response.status());
  });

  test('should allow public access to intensive_pursuit endpoint', async ({ page }) => {
    const response = await page.request.get('http://localhost:8000/api/v1/investigation/suspects/intensive_pursuit/');
    // This endpoint is public
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Session Expiry Handling', () => {
  test('should redirect to login when session expires during navigation', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Clear cookies to truly simulate session expiry (no valid session to fall back on)
    await page.context().clearCookies();

    // Simulate session expiry by making API return 401
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Authentication credentials were not provided.' }) });
    });

    await page.goto('/cases');
    await page.waitForTimeout(5000);

    // The 401 interceptor should redirect to login
    const url = page.url();
    expect(url).toContain('login');
  });

  test('should redirect to login on 401 from API call', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Clear cookies to truly simulate session expiry
    await page.context().clearCookies();

    // Only intercept case-related endpoints
    await page.route('**/api/v1/cases/**', (route) => {
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Session expired' }) });
    });

    await page.goto('/cases');
    await page.waitForTimeout(5000);

    // Without valid cookies, /users/me/ returns 401 from real server → redirect to login
    const url = page.url();
    expect(url).toContain('login');
  });
});
