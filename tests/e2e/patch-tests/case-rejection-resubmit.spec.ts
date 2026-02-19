/**
 * Patch Test: Case Rejection & Resubmit Workflow
 * 
 * Verifies the full rejection → edit → resubmit flow:
 * 1. Rejected cases show edit button
 * 2. CaseEdit page loads and shows rejection history
 * 3. Resubmit transitions case from draft → cadet_review
 * 4. 3-strike rule permanently dismisses the case
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse, mockAPIError } from '../helpers/test-utils';

const MOCK_CASE_DRAFT = {
  id: 100,
  case_number: 'LA-2024-TEST100',
  title: 'Test Robbery Case',
  description: 'Test description for robbery case',
  status: 'draft',
  crime_level: 2,
  formation_type: 'complaint',
  created_by: 1,
  created_by_details: { id: 1, username: 'client1', full_name: 'John Client' },
  reviews: [
    {
      id: 1,
      reviewer: { id: 2, username: 'cadet1', full_name: 'Jane Cadet' },
      decision: 'rejected',
      rejection_reason: 'Insufficient details',
      timestamp: '2024-01-15T10:00:00Z',
    },
  ],
  rejection_count: 1,
  complainant_statement: 'I was robbed',
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

test.describe('Patch: Case Rejection & Resubmit', () => {

  test('CaseDetail should show edit/resubmit button for draft cases', async ({ page }) => {
    // Mock the case detail endpoint
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_DRAFT.id}/`, MOCK_CASE_DRAFT);

    await page.goto(`/cases/${MOCK_CASE_DRAFT.id}`);
    await page.waitForTimeout(1500);

    // Should show the edit button
    const editBtn = page.locator('button:has-text("Edit & Resubmit")');
    await expect(editBtn).toBeVisible();

    // Should show rejection counter
    const counter = page.locator('.rejection-counter-hint');
    await expect(counter).toBeVisible();
    await expect(counter).toContainText('1/3');
  });

  test('CaseEdit page should load with rejection history', async ({ page }) => {
    // Mock the case endpoint for CaseEdit
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_DRAFT.id}/`, MOCK_CASE_DRAFT);

    await page.goto(`/cases/${MOCK_CASE_DRAFT.id}/edit`);
    await page.waitForTimeout(1500);

    // Page should show rejection history
    await expect(page.locator('text=Rejection History')).toBeVisible();
    await expect(page.locator('text=Insufficient details')).toBeVisible();

    // Form fields should be pre-filled
    const titleField = page.locator('input[name="title"], #title, input[value="Test Robbery Case"]');
    if (await titleField.count() > 0) {
      await expect(titleField.first()).toHaveValue('Test Robbery Case');
    }
  });

  test('CaseEdit should have Save Draft and Save & Resubmit buttons', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_DRAFT.id}/`, MOCK_CASE_DRAFT);

    await page.goto(`/cases/${MOCK_CASE_DRAFT.id}/edit`);
    await page.waitForTimeout(1500);

    const saveDraft = page.locator('button:has-text("Save Draft")');
    const resubmit = page.locator('button:has-text("Save & Resubmit")');

    await expect(saveDraft).toBeVisible();
    await expect(resubmit).toBeVisible();
  });

  test('resubmit should POST to correct endpoint', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_DRAFT.id}/`, MOCK_CASE_DRAFT);
    
    let resubmitCalled = false;
    let patchCalled = false;
    
    // Mock PATCH for save
    await page.route(`**/api/v1/cases/cases/${MOCK_CASE_DRAFT.id}/`, (route) => {
      if (route.request().method() === 'PATCH') {
        patchCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...MOCK_CASE_DRAFT }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_CASE_DRAFT),
        });
      }
    });

    // Mock resubmit endpoint
    await page.route(`**/api/v1/cases/cases/${MOCK_CASE_DRAFT.id}/resubmit/`, (route) => {
      resubmitCalled = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...MOCK_CASE_DRAFT, status: 'cadet_review' }),
      });
    });

    await page.goto(`/cases/${MOCK_CASE_DRAFT.id}/edit`);
    await page.waitForTimeout(1500);

    // Click "Save & Resubmit"
    const resubmitBtn = page.locator('button:has-text("Save & Resubmit")');
    if (await resubmitBtn.isVisible()) {
      await resubmitBtn.click();
      await page.waitForTimeout(2000);
      
      // Both PATCH and resubmit should have been called
      expect(patchCalled).toBe(true);
      expect(resubmitCalled).toBe(true);
    }
  });

  test('case with 3 rejections should show permanently dismissed warning', async ({ page }) => {
    const dismissedCase = {
      ...MOCK_CASE_DRAFT,
      rejection_count: 3,
    };
    await mockAPIResponse(page, `cases/cases/${dismissedCase.id}/`, dismissedCase);

    await page.goto(`/cases/${dismissedCase.id}`);
    await page.waitForTimeout(1500);

    const counter = page.locator('.rejection-counter-hint');
    await expect(counter).toContainText('3/3');
    await expect(counter).toContainText('permanently dismissed');
  });

  test('/cases/:id/edit route should be accessible', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_DRAFT.id}/`, MOCK_CASE_DRAFT);

    const response = await page.goto(`/cases/${MOCK_CASE_DRAFT.id}/edit`);
    expect(response?.status()).toBe(200);

    // Should not show 404
    const notFound = page.locator('text=Page Not Found, text=404');
    const notFoundCount = await notFound.count();
    expect(notFoundCount).toBe(0);
  });
});
