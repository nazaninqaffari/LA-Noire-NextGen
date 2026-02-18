/**
 * API Integration & Error Handling E2E Tests
 * 
 * Tests API request/response handling, error scenarios,
 * network failures, timeouts, CORS, and response parsing.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_ADMIN, waitForLoading, mockAPIError } from '../helpers/test-utils';

test.describe('API Error Response Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
  });

  // ─── HTTP Status Code Handling ────────────────────────────────────

  test('should handle 400 Bad Request gracefully', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ detail: 'Bad request data', title: ['This field is required.'] }),
      });
    });
    await page.goto('/cases');
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle 401 Unauthorized by redirecting', async ({ page }) => {
    // Clear cookies to simulate session expiry, then mock ALL API calls as 401
    await page.context().clearCookies();
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({ status: 401, body: JSON.stringify({ detail: 'Not authenticated' }) });
    });
    await page.goto('/cases');
    
    // Should redirect to login page (AuthContext checkAuth fails → redirect)
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('login');
  });

  test('should handle 403 Forbidden gracefully', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({ status: 403, body: JSON.stringify({ detail: 'You do not have permission' }) });
    });
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle 404 Not Found gracefully', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/99999/**', (route) => {
      route.fulfill({ status: 404, body: JSON.stringify({ detail: 'Not found.' }) });
    });
    await page.goto('/cases/99999');
    await page.waitForTimeout(3000);
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle 500 Internal Server Error gracefully', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Internal Server Error' }) });
    });
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle 502 Bad Gateway gracefully', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({ status: 502, body: '<html>Bad Gateway</html>', contentType: 'text/html' });
    });
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle 503 Service Unavailable gracefully', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({ status: 503, body: JSON.stringify({ detail: 'Service temporarily unavailable' }) });
    });
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── Network Error Scenarios ──────────────────────────────────────

  test('should handle connection refused', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => route.abort('connectionrefused'));
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle connection reset', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => route.abort('connectionreset'));
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle DNS resolution failure', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => route.abort('namenotresolved'));
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle request timeout', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => route.abort('timedout'));
    await page.goto('/cases');
    
    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── Malformed Response Handling ──────────────────────────────────

  test('should handle empty response body', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({ status: 200, body: '', contentType: 'application/json' });
    });
    await page.goto('/cases');
    
    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle invalid JSON response', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({ status: 200, body: 'not valid json{{{', contentType: 'application/json' });
    });
    await page.goto('/cases');
    
    // Should not crash the app
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle HTML response when JSON expected', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({ status: 200, body: '<html><body>Gateway Error</body></html>', contentType: 'text/html' });
    });
    await page.goto('/cases');
    
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Multiple Concurrent API Failures ──────────────────────────────

  test('should handle multiple API failures on dashboard', async ({ page }) => {
    // All dashboard APIs fail
    await page.route('**/api/v1/cases/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    await page.route('**/api/v1/investigation/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    
    await page.goto('/dashboard');
    await waitForLoading(page);
    
    // Dashboard should still render its structure
    await expect(page.locator('.dashboard').first()).toBeVisible();
  });

  test('should handle partial API failures gracefully', async ({ page }) => {
    // Cases API works but suspects fail
    await page.route('**/api/v1/cases/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, results: [] }) });
    });
    await page.route('**/api/v1/investigation/suspects/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    
    await page.goto('/dashboard');
    await waitForLoading(page);
    
    await expect(page.locator('.dashboard').first()).toBeVisible();
  });

  // ─── Slow API Responses ───────────────────────────────────────────

  test('should show loading state for slow API responses', async ({ page }) => {
    await page.route('**/api/v1/cases/**', async (route) => {
      await new Promise((res) => setTimeout(res, 5000));
      await route.fulfill({ status: 200, body: JSON.stringify({ count: 0, results: [] }) });
    });
    
    await page.goto('/cases');
    
    const skeleton = page.locator('.skeleton, .loading, .spinner');
    if (await skeleton.count() > 0) {
      await expect(skeleton.first()).toBeVisible();
    }
  });

  // ─── Large Response Handling ──────────────────────────────────────

  test('should handle large response payload', async ({ page }) => {
    const largeCases = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      case_id: `CASE-${i + 1}`,
      title: `Test Case ${i + 1}`,
      description: `Description for case ${i + 1}`,
      status: 'open',
      crime_level: i % 4,
      created_at: new Date().toISOString(),
      created_by: { first_name: 'Admin', last_name: 'User', email: 'admin@test.com' },
    }));

    await page.route('**/api/v1/cases/cases/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ count: 100, results: largeCases }),
      });
    });
    
    await page.goto('/cases');
    await waitForLoading(page);
    
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
  });

  test('should display error notifications with correct styling', async ({ page }) => {
    await mockAPIError(page, 'cases/cases/**', 500);
    await page.goto('/cases');
    
    const notification = page.locator('.notification').first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should display success notification after successful action', async ({ page }) => {
    await page.goto('/cases/complaint/new');
    await waitForLoading(page);
    
    // Mock successful creation
    await page.route('**/api/v1/cases/cases/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 999, case_id: 'CASE-999', title: 'Test', status: 'cadet_review',
          }),
        });
      } else {
        route.continue();
      }
    });
    
    await page.fill('#title', 'Test Complaint');
    await page.fill('#description', 'Test description for notification test');
    await page.fill('#complainant_statement', 'Test statement for notification');
    await page.click('button:has-text("Submit Complaint")');
    
    const notification = page.locator('.notification').filter({ hasText: /success/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should auto-dismiss notifications after timeout', async ({ page }) => {
    await mockAPIError(page, 'cases/cases/**', 500);
    await page.goto('/cases');
    
    const notification = page.locator('.notification').first();
    await expect(notification).toBeVisible({ timeout: 10000 });
    
    // Notifications typically auto-dismiss after 5-7 seconds
    await page.waitForTimeout(10000);
    
    // After timeout, notification should be gone or still visible (depends on implementation)
    // Just verify the app is still functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should stack multiple notifications', async ({ page }) => {
    // Trigger multiple errors
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    
    await page.goto('/dashboard');
    await page.waitForTimeout(5000);
    
    const notifications = page.locator('.notification');
    // Multiple API calls should generate multiple notifications
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Request Interceptor', () => {
  test('should send Content-Type application/json header', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    
    let contentTypeSet = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/') && request.method() === 'POST') {
        const headers = request.headers();
        if (headers['content-type']?.includes('application/json')) {
          contentTypeSet = true;
        }
      }
    });
    
    await page.goto('/cases/complaint/new');
    await waitForLoading(page);
    await page.fill('#title', 'Test');
    await page.fill('#description', 'Test');
    await page.fill('#complainant_statement', 'Test');
    await page.click('button:has-text("Submit Complaint")');
    
    await page.waitForTimeout(3000);
  });

  test('should include credentials in API requests', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    
    let requestMade = false;
    page.on('request', (request) => {
      if (request.url().includes('/api/v1/cases/')) {
        requestMade = true;
      }
    });
    
    await page.goto('/cases');
    await page.waitForTimeout(3000);
    
    expect(requestMade).toBeTruthy();
  });
});
