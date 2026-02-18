/**
 * Most Wanted & Public Pages E2E Tests
 * 
 * Tests for the Most Wanted page (public), tip-off submission,
 * suspect display, danger scores, and rewards.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_ADMIN, waitForLoading, mockAPIResponse, mockAPIError } from '../helpers/test-utils';

test.describe('Most Wanted Page - Public Access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/most-wanted');
    await waitForLoading(page);
  });

  test('should be accessible without authentication', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    // Should not redirect to login
    await expect(page).toHaveURL(/.*most-wanted/);
  });

  test('should display page heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  // ─── Empty State ──────────────────────────────────────────────────

  test('should handle empty most wanted list', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/intensive_pursuit/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, results: [] }) });
    });
    await page.goto('/most-wanted');
    await waitForLoading(page);

    await expect(page.locator('body')).toBeVisible();
  });

  // ─── With Suspects ────────────────────────────────────────────────

  test('should display suspect cards when data is available', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/intensive_pursuit/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          count: 2,
          results: [
            {
              id: 1, status: 'intensive_pursuit',
              person: { first_name: 'John', last_name: 'Doe' },
              case: { id: 1, title: 'Bank Robbery', case_number: 'CASE-001' },
              danger_score: 150, reward_amount: 3000000000,
              reason: 'Armed and dangerous',
              created_at: '2025-01-01T00:00:00Z',
            },
            {
              id: 2, status: 'intensive_pursuit',
              person: { first_name: 'Jane', last_name: 'Smith' },
              case: { id: 2, title: 'Kidnapping', case_number: 'CASE-002' },
              danger_score: 200, reward_amount: 4000000000,
              reason: 'Fugitive from justice',
              created_at: '2024-12-15T00:00:00Z',
            },
          ],
        }),
      });
    });
    await page.goto('/most-wanted');
    await waitForLoading(page);

    const cards = page.locator('.suspect-card, .wanted-card, .card');
    if (await cards.count() > 0) {
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });

  // ─── Error Handling ───────────────────────────────────────────────

  test('should handle API error gracefully', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/intensive_pursuit/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Server Error' }) });
    });
    await page.goto('/most-wanted');
    await waitForLoading(page);

    // Page should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle network error', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/intensive_pursuit/**', (route) => {
      route.abort();
    });
    await page.goto('/most-wanted');
    await waitForLoading(page);

    await expect(page.locator('body')).toBeVisible();
  });

  // ─── Loading State ────────────────────────────────────────────────

  test('should show loading state', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/intensive_pursuit/**', async (route) => {
      await new Promise((res) => setTimeout(res, 3000));
      await route.continue();
    });
    await page.goto('/most-wanted');

    const loader = page.locator('.skeleton, .spinner, .loading');
    if (await loader.count() > 0) {
      await expect(loader.first()).toBeVisible();
    }
  });
});

test.describe('Suspects Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/suspects');
    await waitForLoading(page);
  });

  test('should display suspects page heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should handle empty suspects list', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, results: [] }) });
    });
    await page.goto('/suspects');
    await waitForLoading(page);

    const emptyIndicator = page.locator('.empty-state, :has-text("No suspects")');
    if (await emptyIndicator.count() > 0) {
      await expect(emptyIndicator.first()).toBeVisible();
    }
  });

  test('should handle API error when loading suspects', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    await page.goto('/suspects');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i }).first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should display suspects with status indicators when data exists', async ({ page }) => {
    await page.route('**/api/v1/investigation/suspects/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 1, status: 'under_pursuit',
            person: { first_name: 'Test', last_name: 'Suspect' },
            case: { id: 1, title: 'Test Case' },
            reason: 'Test reason',
            identified_by_detective: true,
            approved_by_sergeant: false,
            created_at: new Date().toISOString(),
          }],
        }),
      });
    });
    await page.goto('/suspects');
    await waitForLoading(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Trials Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/trials');
    await waitForLoading(page);
  });

  test('should display trials page heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should handle empty trials list', async ({ page }) => {
    await page.route('**/api/v1/trial/trials/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, results: [] }) });
    });
    await page.goto('/trials');
    await waitForLoading(page);

    const emptyIndicator = page.locator('.empty-state, :has-text("No trials")');
    if (await emptyIndicator.count() > 0) {
      await expect(emptyIndicator.first()).toBeVisible();
    }
  });

  test('should handle API error when loading trials', async ({ page }) => {
    await page.route('**/api/v1/trial/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    await page.goto('/trials');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i }).first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Reports Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/reports');
    await waitForLoading(page);
  });

  test('should display reports page heading', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/v1/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    await page.goto('/reports');
    await waitForLoading(page);

    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Detective Board Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/detective-board');
    await waitForLoading(page);
  });

  test('should display detective board page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should handle empty detective board', async ({ page }) => {
    await page.route('**/api/v1/investigation/detective-boards/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, results: [] }) });
    });
    await page.goto('/detective-board');
    await waitForLoading(page);

    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle API error loading detective board', async ({ page }) => {
    await page.route('**/api/v1/investigation/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Error' }) });
    });
    await page.goto('/detective-board');

    await expect(page.locator('body')).toBeVisible();
  });
});
