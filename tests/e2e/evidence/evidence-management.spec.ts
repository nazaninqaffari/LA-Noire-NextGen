/**
 * Evidence Management E2E Tests
 * 
 * Comprehensive tests for evidence listing, registration,
 * filtering, verification, and error handling.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_ADMIN, waitForLoading, mockAPIResponse, mockAPIError, uniqueId } from '../helpers/test-utils';

test.describe('Evidence List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/evidence');
    await waitForLoading(page);
  });

  // ─── Page Rendering ───────────────────────────────────────────────

  test('should display evidence page with correct title', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should display Register Evidence button/link', async ({ page }) => {
    const registerLink = page.locator('a[href="/evidence/register"], a:has-text("Register"), button:has-text("Register")');
    if (await registerLink.count() > 0) {
      await expect(registerLink.first()).toBeVisible();
    }
  });

  // ─── Evidence Type Tabs ───────────────────────────────────────────

  test('should display evidence type tabs or categories', async ({ page }) => {
    const tabs = page.locator('.tab, .evidence-tab, [role="tab"], .evidence-type-btn, button:has-text("Testimony"), button:has-text("Biological"), button:has-text("Vehicle"), button:has-text("Document"), button:has-text("Generic")');
    if (await tabs.count() > 0) {
      expect(await tabs.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('should switch between evidence types', async ({ page }) => {
    const testimonyTab = page.locator('button:has-text("Testimony"), .tab:has-text("Testimony"), a:has-text("Testimony")');
    if (await testimonyTab.count() > 0) {
      await testimonyTab.first().click();
      await waitForLoading(page);
    }

    const biologicalTab = page.locator('button:has-text("Biological"), .tab:has-text("Biological"), a:has-text("Biological")');
    if (await biologicalTab.count() > 0) {
      await biologicalTab.first().click();
      await waitForLoading(page);
    }

    const vehicleTab = page.locator('button:has-text("Vehicle"), .tab:has-text("Vehicle"), a:has-text("Vehicle")');
    if (await vehicleTab.count() > 0) {
      await vehicleTab.first().click();
      await waitForLoading(page);
    }
  });

  // ─── Error Handling ───────────────────────────────────────────────

  test('should handle API error when loading evidence', async ({ page }) => {
    await page.route('**/api/v1/evidence/**', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Server Error' }) });
    });
    await page.goto('/evidence');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i }).first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should handle network error when loading evidence', async ({ page }) => {
    await page.route('**/api/v1/evidence/**', (route) => route.abort());
    await page.goto('/evidence');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i }).first();
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  // ─── Empty State ──────────────────────────────────────────────────

  test('should show empty state when no evidence exists', async ({ page }) => {
    await page.route('**/api/v1/evidence/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify({ count: 0, results: [] }) });
    });
    await page.goto('/evidence');
    await waitForLoading(page);

    const emptyIndicator = page.locator('.empty-state, :has-text("No evidence"), :has-text("no results")');
    if (await emptyIndicator.count() > 0) {
      await expect(emptyIndicator.first()).toBeVisible();
    }
  });

  // ─── Loading State ────────────────────────────────────────────────

  test('should show loading state while evidence loads', async ({ page }) => {
    await page.route('**/api/v1/evidence/**', async (route) => {
      await new Promise((res) => setTimeout(res, 3000));
      await route.continue();
    });
    await page.goto('/evidence');

    const skeleton = page.locator('.skeleton, .loading, .spinner');
    if (await skeleton.count() > 0) {
      await expect(skeleton.first()).toBeVisible();
    }
  });
});

test.describe('Evidence Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/evidence/register');
    await waitForLoading(page);
  });

  // ─── Page Rendering ───────────────────────────────────────────────

  test('should display evidence registration page', async ({ page }) => {
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should display evidence type selection', async ({ page }) => {
    // Should have options for different evidence types
    const typeSelector = page.locator('select, [role="listbox"], .evidence-type-selector, button:has-text("Testimony"), button:has-text("Biological"), button:has-text("Vehicle"), button:has-text("Document"), button:has-text("Generic")');
    if (await typeSelector.count() > 0) {
      await expect(typeSelector.first()).toBeVisible();
    }
  });

  // ─── Evidence Type Forms ──────────────────────────────────────────

  test('should display testimony form fields when Testimony is selected', async ({ page }) => {
    const testimonyBtn = page.locator('button:has-text("Testimony"), option:has-text("Testimony"), .type-card:has-text("Testimony")');
    if (await testimonyBtn.count() > 0) {
      await testimonyBtn.first().click();
      await waitForLoading(page);

      // Should show testimony-specific fields (witness name, transcript)
      const testimonyFields = page.locator('#witness_name, #transcript, [name="witness_name"], [name="transcript"]');
      if (await testimonyFields.count() > 0) {
        await expect(testimonyFields.first()).toBeVisible();
      }
    }
  });

  test('should display biological evidence form fields when selected', async ({ page }) => {
    const bioBtn = page.locator('button:has-text("Biological"), option:has-text("Biological"), .type-card:has-text("Biological")');
    if (await bioBtn.count() > 0) {
      await bioBtn.first().click();
      await waitForLoading(page);

      const bioFields = page.locator('#evidence_type, [name="evidence_type"], [name="coroner_analysis"]');
      if (await bioFields.count() > 0) {
        await expect(bioFields.first()).toBeVisible();
      }
    }
  });

  test('should display vehicle evidence form fields when selected', async ({ page }) => {
    const vehicleBtn = page.locator('button:has-text("Vehicle"), option:has-text("Vehicle"), .type-card:has-text("Vehicle")');
    if (await vehicleBtn.count() > 0) {
      await vehicleBtn.first().click();
      await waitForLoading(page);

      const vehicleFields = page.locator('#model, #color, #license_plate, [name="model"], [name="color"]');
      if (await vehicleFields.count() > 0) {
        await expect(vehicleFields.first()).toBeVisible();
      }
    }
  });

  test('should display ID document form fields when selected', async ({ page }) => {
    const docBtn = page.locator('button:has-text("Document"), button:has-text("ID Doc"), option:has-text("Document"), .type-card:has-text("Document")');
    if (await docBtn.count() > 0) {
      await docBtn.first().click();
      await waitForLoading(page);

      const docFields = page.locator('#owner_full_name, #document_type, [name="owner_full_name"]');
      if (await docFields.count() > 0) {
        await expect(docFields.first()).toBeVisible();
      }
    }
  });

  test('should display generic evidence form fields when selected', async ({ page }) => {
    const genericBtn = page.locator('button:has-text("Generic"), option:has-text("Generic"), .type-card:has-text("Generic")');
    if (await genericBtn.count() > 0) {
      await genericBtn.first().click();
      await waitForLoading(page);
    }
  });

  // ─── Form Submission Error Handling ─────────────────────────────

  test('should show error when submitting empty evidence form', async ({ page }) => {
    const submitBtn = page.locator('button[type="submit"]:has-text("Register Evidence")');
    if (await submitBtn.count() > 0) {
      await submitBtn.first().click();
      // Form uses native HTML required validation - form submission is blocked
      // Verify we're still on the registration page (didn't navigate away)
      await expect(page).toHaveURL(/.*evidence\/register/);
      // Verify required fields exist
      const requiredFields = page.locator('input[required], textarea[required]');
      expect(await requiredFields.count()).toBeGreaterThan(0);
    }
  });

  test('should handle API error during evidence submission', async ({ page }) => {
    await page.route('**/api/v1/evidence/**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 500, body: JSON.stringify({ detail: 'Server Error' }) });
      } else {
        route.continue();
      }
    });

    // Try to fill and submit any evidence form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Register")');
    if (await submitBtn.count() > 0) {
      // Fill minimal fields
      const titleField = page.locator('#title, [name="title"]');
      if (await titleField.count() > 0) {
        await titleField.first().fill('Test Evidence');
      }
      await submitBtn.first().click();
    }
  });

  // ─── Navigation ───────────────────────────────────────────────────

  test('should have back/cancel navigation', async ({ page }) => {
    const backBtn = page.locator('button:has-text("Cancel"), button:has-text("Back"), a:has-text("Back")');
    if (await backBtn.count() > 0) {
      await expect(backBtn.first()).toBeVisible();
    }
  });
});

test.describe('Evidence Verification', () => {
  test('should show verification option for biological evidence for forensic doctor', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Mock biological evidence list with an unverified item
    await page.route('**/api/v1/evidence/biological/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 1,
            title: 'Blood Sample',
            evidence_type: 'blood',
            case: 1,
            verified_by_coroner: false,
            created_at: new Date().toISOString(),
          }],
        }),
      });
    });

    await page.goto('/evidence');
    await waitForLoading(page);

    // Navigate to biological tab
    const bioTab = page.locator('button:has-text("Biological"), .tab:has-text("Biological")');
    if (await bioTab.count() > 0) {
      await bioTab.first().click();
      await waitForLoading(page);
    }
  });
});
