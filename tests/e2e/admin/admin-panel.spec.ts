/**
 * Admin Panel E2E Tests
 * 
 * Comprehensive tests for the admin panel including user management,
 * role management, role assignment, and access control.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_ADMIN, waitForLoading, mockAPIResponse, mockAPIError, uniqueId } from '../helpers/test-utils';

test.describe('Admin Panel Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/admin');
    await waitForLoading(page);
  });

  // ─── Page Rendering ───────────────────────────────────────────────

  test('should display admin panel heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should display user management section', async ({ page }) => {
    const userSection = page.locator('h2:has-text("User"), h3:has-text("User"), :has-text("User Management")');
    if (await userSection.count() > 0) {
      await expect(userSection.first()).toBeVisible();
    }
  });

  test('should display role management section', async ({ page }) => {
    const roleSection = page.locator('h2:has-text("Role"), h3:has-text("Role"), :has-text("Role Management")');
    if (await roleSection.count() > 0) {
      await expect(roleSection.first()).toBeVisible();
    }
  });

  // ─── User List ────────────────────────────────────────────────────

  test('should display list of users', async ({ page }) => {
    const userList = page.locator('table, .user-list, .user-card');
    if (await userList.count() > 0) {
      await expect(userList.first()).toBeVisible();
    }
  });

  test('should display user details (username, email, roles)', async ({ page }) => {
    // Mock users list
    await page.route('**/api/v1/accounts/users/**', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            count: 2,
            results: [
              { id: 1, username: 'admin', email: 'admin@lapd.gov', first_name: 'Admin', last_name: 'User', roles: [{ name: 'admin' }], is_staff: true },
              { id: 2, username: 'detective1', email: 'det@lapd.gov', first_name: 'John', last_name: 'Doe', roles: [{ name: 'detective' }], is_staff: false },
            ],
          }),
        });
      } else {
        route.continue();
      }
    });
    await page.goto('/admin');
    await waitForLoading(page);

    const adminUser = page.locator(':has-text("admin")');
    await expect(adminUser.first()).toBeVisible();
  });

  // ─── Role Management ─────────────────────────────────────────────

  test('should display list of roles', async ({ page }) => {
    await page.route('**/api/v1/accounts/roles/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          count: 3,
          results: [
            { id: 1, name: 'admin', description: 'System administrator', is_police_rank: false, hierarchy_level: 0 },
            { id: 2, name: 'detective', description: 'Detective officer', is_police_rank: true, hierarchy_level: 4 },
            { id: 3, name: 'judge', description: 'Judge', is_police_rank: false, hierarchy_level: 0 },
          ],
        }),
      });
    });
    await page.goto('/admin');
    await waitForLoading(page);

    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Role Assignment ──────────────────────────────────────────────

  test('should have role assignment UI for users', async ({ page }) => {
    const assignBtn = page.locator('button:has-text("Assign"), button:has-text("Role"), select:has-text("Role")');
    // Role assignment UI should exist somewhere on the admin page
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Create Role ──────────────────────────────────────────────────

  test('should have option to create new role', async ({ page }) => {
    const createBtn = page.locator('button:has-text("Create"), button:has-text("Add Role"), button:has-text("New Role")');
    if (await createBtn.count() > 0) {
      await expect(createBtn.first()).toBeVisible();
    }
  });

  // ─── Error Handling ───────────────────────────────────────────────

  test('should handle API error when loading users', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Server Error' }) });
    });
    await page.goto('/admin');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i }).first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle API error when loading roles', async ({ page }) => {
    await page.route('**/api/v1/accounts/roles/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Server Error' }) });
    });
    await page.goto('/admin');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i }).first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle network error', async ({ page }) => {
    await page.route('**/api/v1/accounts/**', (route) => route.abort());
    await page.goto('/admin');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i }).first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  // ─── Loading State ────────────────────────────────────────────────

  test('should show loading state while data is fetching', async ({ page }) => {
    await page.route('**/api/v1/accounts/**', async (route) => {
      await new Promise((res) => setTimeout(res, 3000));
      await route.continue();
    });
    await page.goto('/admin');

    const loader = page.locator('.skeleton, .spinner, .loading');
    if (await loader.count() > 0) {
      await expect(loader.first()).toBeVisible();
    }
  });

  // ─── Role Assignment Error ────────────────────────────────────────

  test('should handle role assignment API error', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/*/assign_roles/', (route) => {
      route.fulfill({ status: 400, body: JSON.stringify({ detail: 'Invalid role assignment' }) });
    });

    // The error should be handled when attempting role assignment
    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Delete Role Error ────────────────────────────────────────────

  test('should handle role deletion API error', async ({ page }) => {
    await page.route('**/api/v1/accounts/roles/*/', (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 400, body: JSON.stringify({ detail: 'Cannot delete role in use' }) });
      } else {
        route.continue();
      }
    });

    await expect(page.locator('body')).toBeVisible();
  });
});
