/**
 * Patch Test: Notification Bell Component
 * 
 * Verifies:
 * 1. Bell icon appears in the header for authenticated users
 * 2. Unread badge shows correct count
 * 3. Clicking bell opens notification dropdown
 * 4. Notifications are listed with icons and timestamps
 * 5. "Mark all read" clears the badge
 */
import { test, expect } from '@playwright/test';

const MOCK_USER = {
  id: 1,
  username: 'detective1',
  first_name: 'John',
  last_name: 'Detective',
  roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
  is_active: true,
  date_joined: '2024-01-01',
};

const MOCK_NOTIFICATIONS = {
  count: 3,
  results: [
    {
      id: 1,
      recipient: 1,
      notification_type: 'case_assigned',
      title: 'New Case Assigned',
      message: 'You have been assigned to Case #LA-2024-001',
      related_case: 1,
      is_read: false,
      created_at: new Date(Date.now() - 300000).toISOString(), // 5 min ago
    },
    {
      id: 2,
      recipient: 1,
      notification_type: 'new_evidence',
      title: 'New Evidence Submitted',
      message: 'Blood sample evidence has been registered for Case #LA-2024-001',
      related_case: 1,
      is_read: false,
      created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    },
    {
      id: 3,
      recipient: 1,
      notification_type: 'submission_approved',
      title: 'Suspect Submission Approved',
      message: 'Your suspect submission for Case #LA-2024-002 has been approved',
      related_case: 2,
      is_read: true,
      created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
  ],
};

test.describe('Patch: Notification Bell', () => {

  test.beforeEach(async ({ page }) => {
    // Mock auth
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      });
    });

    // Use a single route handler for ALL notification endpoints to avoid
    // glob ordering issues (Playwright matches most-recently-registered first).
    await page.route('**/api/v1/investigation/notifications/**', (route) => {
      const url = route.request().url();
      if (url.includes('/unread_count/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ count: 2 }),
        });
      } else if (url.includes('/mark_read/')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Notifications marked as read' }),
        });
      } else {
        // Notifications list
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_NOTIFICATIONS),
        });
      }
    });
  });

  test('bell icon should be visible in header for authenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const bellButton = page.locator('.bell-button');
    await expect(bellButton).toBeVisible();
  });

  test('should show unread count badge', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const badge = page.locator('.bell-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toHaveText('2');
  });

  test('clicking bell should open notification dropdown', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Initially dropdown should not be visible
    await expect(page.locator('.notification-dropdown')).not.toBeVisible();

    // Click bell
    await page.locator('.bell-button').click();
    await page.waitForTimeout(1000);

    // Dropdown should be visible
    await expect(page.locator('.notification-dropdown')).toBeVisible();
    await expect(page.locator('.notification-dropdown-header h4')).toHaveText('Notifications');
  });

  test('dropdown should show notification items', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await page.locator('.bell-button').click();
    await page.waitForTimeout(1500);

    const dropdown = page.locator('.notification-dropdown');

    // Should show notification items
    const items = dropdown.locator('.notification-item');
    const count = await items.count();
    expect(count).toBe(3);

    // Verify titles within the dropdown
    await expect(dropdown.locator('.notification-title:has-text("New Case Assigned")')).toBeVisible();
    await expect(dropdown.locator('.notification-title:has-text("New Evidence Submitted")')).toBeVisible();
    await expect(dropdown.locator('.notification-title:has-text("Suspect Submission Approved")')).toBeVisible();
  });

  test('unread notifications should have "unread" class', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await page.locator('.bell-button').click();
    await page.waitForTimeout(1500);

    const dropdown = page.locator('.notification-dropdown');
    const unreadItems = dropdown.locator('.notification-item.unread');
    const unreadCount = await unreadItems.count();
    expect(unreadCount).toBe(2);
  });

  test('should show "Mark all read" button when there are unread', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await page.locator('.bell-button').click();
    await page.waitForTimeout(1000);

    const markReadBtn = page.locator('.mark-read-btn');
    await expect(markReadBtn).toBeVisible();
    await expect(markReadBtn).toHaveText('Mark all read');
  });

  test('clicking "Mark all read" should clear unread indicators', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await page.locator('.bell-button').click();
    await page.waitForTimeout(1500);

    // Click mark all read
    await page.locator('.mark-read-btn').click();
    await page.waitForTimeout(1000);

    // After marking read, unread items should lose the "unread" class
    const unreadItems = page.locator('.notification-item.unread');
    const count = await unreadItems.count();
    expect(count).toBe(0);
  });

  test('clicking outside dropdown should close it', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await page.locator('.bell-button').click();
    await page.waitForTimeout(1000);
    await expect(page.locator('.notification-dropdown')).toBeVisible();

    // Click outside
    await page.click('body', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);

    await expect(page.locator('.notification-dropdown')).not.toBeVisible();
  });

  test('notification with related_case should navigate to case on click', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    await page.locator('.bell-button').click();
    await page.waitForTimeout(1500);

    // Click on a notification that has a related_case
    const dropdown = page.locator('.notification-dropdown');
    const clickableItem = dropdown.locator('.notification-item.clickable').first();
    await clickableItem.click();

    // Should navigate to the case (may redirect if case detail fails to load)
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/cases');
  });

  test('notification bell should not be visible for unauthenticated users', async ({ page }) => {
    // Clear saved auth cookies so we're truly unauthenticated
    await page.context().clearCookies();

    // Override auth to return 401
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Not authenticated' }) });
    });

    await page.goto('/login');
    await page.waitForTimeout(2000);

    const bellButton = page.locator('.bell-button');
    expect(await bellButton.count()).toBe(0);
  });
});
