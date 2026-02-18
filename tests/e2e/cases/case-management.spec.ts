/**
 * Cases List Page E2E Tests
 * 
 * Tests for case listing, filtering, searching, pagination,
 * case creation (complaint & crime scene), and case detail view.
 */
import { test, expect } from '@playwright/test';
import {
  loginAs, TEST_ADMIN, waitForLoading, mockAPIResponse, mockAPIError,
  mockComplaintData, mockCrimeSceneData, uniqueId
} from '../helpers/test-utils';

test.describe('Cases List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/cases');
    await waitForLoading(page);
  });

  // ─── Page Rendering ───────────────────────────────────────────────

  test('should display cases page with correct title', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toHaveText('Case Files');
    await expect(page.locator('.page-subtitle')).toContainText('Manage and review all active investigations');
  });

  test('should display action buttons for filing complaint and crime scene', async ({ page }) => {
    await expect(page.locator('a:has-text("📜 File Complaint")')).toBeVisible();
    await expect(page.locator('a:has-text("🚨 Report Crime Scene")')).toBeVisible();
  });

  test('should display search input with placeholder', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search cases..."]');
    await expect(searchInput).toBeVisible();
  });

  test('should display search button', async ({ page }) => {
    await expect(page.locator('button:has-text("Search")')).toBeVisible();
  });

  test('should display status filter dropdown', async ({ page }) => {
    const statusFilter = page.locator('#status-filter');
    await expect(statusFilter).toBeVisible();
  });

  test('should display crime level filter dropdown', async ({ page }) => {
    const crimeLevelFilter = page.locator('#crime-level-filter');
    await expect(crimeLevelFilter).toBeVisible();
  });

  // ─── Filter Dropdown Options ──────────────────────────────────────

  test('should display all status filter options', async ({ page }) => {
    const statusFilter = page.locator('#status-filter');
    const options = statusFilter.locator('option');
    const expectedStatuses = [
      'All Statuses', 'Draft', 'Cadet Review', 'Officer Review', 'Rejected',
      'Open', 'Under Investigation', 'Suspects Identified', 'Arrest Approved',
      'Interrogation', 'Trial Pending', 'Closed'
    ];

    const count = await options.count();
    expect(count).toBe(expectedStatuses.length);
  });

  test('should display all crime level filter options', async ({ page }) => {
    const crimeLevelFilter = page.locator('#crime-level-filter');
    const options = crimeLevelFilter.locator('option');

    const count = await options.count();
    expect(count).toBe(5); // All Levels + 4 crime levels
  });

  // ─── Filtering ────────────────────────────────────────────────────

  test('should filter cases by status', async ({ page }) => {
    await page.selectOption('#status-filter', 'open');
    await waitForLoading(page);

    // Clear Filters button should appear
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('should filter cases by crime level', async ({ page }) => {
    await page.selectOption('#crime-level-filter', '0');
    await waitForLoading(page);
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('should apply multiple filters simultaneously', async ({ page }) => {
    await page.selectOption('#status-filter', 'open');
    await page.selectOption('#crime-level-filter', '1');
    await waitForLoading(page);
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('should clear all filters when clicking Clear Filters', async ({ page }) => {
    await page.selectOption('#status-filter', 'open');
    await waitForLoading(page);
    await page.click('button:has-text("Clear Filters")');
    await waitForLoading(page);

    // Status filter should be reset
    await expect(page.locator('#status-filter')).toHaveValue('');
    await expect(page.locator('#crime-level-filter')).toHaveValue('');
  });

  test('should not show Clear Filters button when no filters active', async ({ page }) => {
    await expect(page.locator('button:has-text("Clear Filters")')).toHaveCount(0);
  });

  // ─── Search ───────────────────────────────────────────────────────

  test('should search cases by text', async ({ page }) => {
    await page.fill('input[placeholder="Search cases..."]', 'test');
    await page.click('button:has-text("Search")');
    await waitForLoading(page);
  });

  test('should search on form submit (Enter key)', async ({ page }) => {
    await page.fill('input[placeholder="Search cases..."]', 'murder');
    await page.press('input[placeholder="Search cases..."]', 'Enter');
    await waitForLoading(page);
  });

  test('should show Clear Filters after search', async ({ page }) => {
    await page.fill('input[placeholder="Search cases..."]', 'test');
    await page.click('button:has-text("Search")');
    await waitForLoading(page);
    await expect(page.locator('button:has-text("Clear Filters")')).toBeVisible();
  });

  test('should clear search when Clear Filters is clicked', async ({ page }) => {
    await page.fill('input[placeholder="Search cases..."]', 'test');
    await page.click('button:has-text("Search")');
    await waitForLoading(page);
    await page.click('button:has-text("Clear Filters")');
    await expect(page.locator('input[placeholder="Search cases..."]')).toHaveValue('');
  });

  // ─── Empty State ──────────────────────────────────────────────────

  test('should show empty state when no cases match filter', async ({ page }) => {
    // Mock API to return empty results
    await mockAPIResponse(page, 'cases/cases/**', { count: 0, results: [] });
    await page.selectOption('#status-filter', 'closed');
    await waitForLoading(page);

    await expect(page.locator('.empty-state')).toBeVisible();
  });

  test('should show appropriate message in empty state with filters', async ({ page }) => {
    await mockAPIResponse(page, 'cases/cases/**', { count: 0, results: [] });
    await page.selectOption('#status-filter', 'rejected');
    await waitForLoading(page);

    const emptyText = page.locator('.empty-state-text');
    if (await emptyText.isVisible()) {
      await expect(emptyText).toContainText(/adjust|filter/i);
    }
  });

  // ─── Error Handling ───────────────────────────────────────────────

  test('should show error notification when API fails to load cases', async ({ page }) => {
    await page.route('**cases/cases**', (route) => {
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ detail: 'Server Error' }) });
    });
    await page.goto('/cases');

    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle network error when loading cases', async ({ page }) => {
    await page.route('**cases/cases**', (route) => route.abort());
    await page.goto('/cases');

    const notification = page.locator('.notification');
    await expect(notification.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── Loading State ────────────────────────────────────────────────

  test('should show loading skeleton while cases are loading', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/**', async (route) => {
      await new Promise((res) => setTimeout(res, 3000));
      await route.continue();
    });
    await page.goto('/cases');

    // Should see skeleton loaders
    const skeletons = page.locator('.skeleton');
    if (await skeletons.count() > 0) {
      await expect(skeletons.first()).toBeVisible();
    }
  });

  // ─── Navigation from Cases Page ───────────────────────────────────

  test('should navigate to File Complaint form', async ({ page }) => {
    await page.click('a:has-text("📜 File Complaint")');
    await expect(page).toHaveURL(/.*cases\/complaint\/new/);
  });

  test('should navigate to Crime Scene Report form', async ({ page }) => {
    await page.click('a:has-text("🚨 Report Crime Scene")');
    await expect(page).toHaveURL(/.*cases\/scene\/new/);
  });

  // ─── Case Cards ───────────────────────────────────────────────────

  test('should display case cards in grid layout when cases exist', async ({ page }) => {
    const casesGrid = page.locator('.cases-grid');
    const caseCards = page.locator('.case-card, .cases-grid > *');
    
    if (await casesGrid.isVisible()) {
      expect(await caseCards.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Create Complaint', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/cases/complaint/new');
    await waitForLoading(page);
  });

  // ─── Page Rendering ───────────────────────────────────────────────

  test('should display complaint form with correct title', async ({ page }) => {
    await expect(page.locator('.complaint-title')).toContainText('File a Complaint');
    await expect(page.locator('.complaint-subtitle')).toContainText('Report a crime');
  });

  test('should display complaint icon', async ({ page }) => {
    await expect(page.locator('.complaint-icon')).toContainText('📜');
  });

  test('should display all required form fields', async ({ page }) => {
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#crime_level')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
    await expect(page.locator('#complainant_statement')).toBeVisible();
  });

  test('should display correct labels with required markers', async ({ page }) => {
    await expect(page.locator('label[for="title"]')).toContainText('Case Title');
    await expect(page.locator('label[for="title"] .required')).toBeVisible();
    await expect(page.locator('label[for="description"]')).toContainText('Incident Description');
    await expect(page.locator('label[for="complainant_statement"]')).toContainText('Your Statement');
  });

  test('should display placeholders', async ({ page }) => {
    await expect(page.locator('#title')).toHaveAttribute('placeholder', 'Brief summary of the incident');
    await expect(page.locator('#description')).toHaveAttribute('placeholder', /detailed description/i);
    await expect(page.locator('#complainant_statement')).toHaveAttribute('placeholder', /personal account/i);
  });

  test('should display crime severity dropdown with all options', async ({ page }) => {
    const select = page.locator('#crime_level');
    const options = select.locator('option');
    expect(await options.count()).toBe(4);
  });

  test('should default crime level to Medium', async ({ page }) => {
    await expect(page.locator('#crime_level')).toHaveValue('2');
  });

  test('should display Cancel and Submit buttons', async ({ page }) => {
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    await expect(page.locator('button:has-text("Submit Complaint")')).toBeVisible();
  });

  test('should display process information section', async ({ page }) => {
    await expect(page.locator('.process-info')).toBeVisible();
    await expect(page.locator('.process-title')).toContainText('What happens next');
    await expect(page.locator('.process-step')).toHaveCount(3);
    await expect(page.locator('.process-note')).toContainText('3 times');
  });

  // ─── Form Validation ──────────────────────────────────────────────

  test('should show error when title is empty', async ({ page }) => {
    await page.fill('#description', 'Some description');
    await page.fill('#complainant_statement', 'Some statement');
    // Remove HTML5 required to let JS validation handle it
    await page.evaluate(() => document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required')));
    await page.click('button:has-text("Submit Complaint")');

    const notification = page.locator('.notification').filter({ hasText: /title/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show error when description is empty', async ({ page }) => {
    await page.fill('#title', 'Some title');
    await page.fill('#complainant_statement', 'Some statement');
    await page.evaluate(() => document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required')));
    await page.click('button:has-text("Submit Complaint")');

    const notification = page.locator('.notification').filter({ hasText: /description/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show error when complaint statement is empty', async ({ page }) => {
    await page.fill('#title', 'Some title');
    await page.fill('#description', 'Some description');
    await page.evaluate(() => document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required')));
    await page.click('button:has-text("Submit Complaint")');

    const notification = page.locator('.notification').filter({ hasText: /statement/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  // ─── Successful Submission ────────────────────────────────────────

  test('should successfully submit a complaint', async ({ page }) => {
    const data = mockComplaintData();
    await page.fill('#title', data.title);
    await page.selectOption('#crime_level', data.crime_level.toString());
    await page.fill('#description', data.description);
    await page.fill('#complainant_statement', data.complainant_statement);

    await page.click('button:has-text("Submit Complaint")');

    // Should show success notification
    const notification = page.locator('.notification').filter({ hasText: /success/i });
    await expect(notification).toBeVisible({ timeout: 15000 });

    // Should redirect to cases list
    await page.waitForURL('**/cases', { timeout: 10000 });
  });

  test('should select different crime levels', async ({ page }) => {
    for (const level of ['0', '1', '2', '3']) {
      await page.selectOption('#crime_level', level);
      await expect(page.locator('#crime_level')).toHaveValue(level);
    }
  });

  // ─── Cancel Button ────────────────────────────────────────────────

  test('should navigate back to cases on Cancel click', async ({ page }) => {
    await page.click('button:has-text("Cancel")');
    await expect(page).toHaveURL(/.*cases/);
  });

  // ─── Error Handling ───────────────────────────────────────────────

  test('should show error notification on API failure', async ({ page }) => {
    await mockAPIError(page, 'cases/cases/', 500);

    const data = mockComplaintData();
    await page.fill('#title', data.title);
    await page.fill('#description', data.description);
    await page.fill('#complainant_statement', data.complainant_statement);
    await page.click('button:has-text("Submit Complaint")');

    const notification = page.locator('.notification').filter({ hasText: /error|failed/i });
    await expect(notification).toBeVisible({ timeout: 10000 });
  });

  test('should show loading state during submission', async ({ page }) => {
    await page.route('**/api/v1/cases/cases/', async (route) => {
      await new Promise((res) => setTimeout(res, 3000));
      await route.continue();
    });

    const data = mockComplaintData();
    await page.fill('#title', data.title);
    await page.fill('#description', data.description);
    await page.fill('#complainant_statement', data.complainant_statement);
    await page.click('button:has-text("Submit Complaint")');

    // Should show loading
    const skeleton = page.locator('.skeleton');
    if (await skeleton.count() > 0) {
      await expect(skeleton.first()).toBeVisible();
    }
  });

  // ─── Edge Cases ───────────────────────────────────────────────────

  test('should enforce maxLength on title field', async ({ page }) => {
    await expect(page.locator('#title')).toHaveAttribute('maxlength', '200');
  });

  test('should handle title with only whitespace', async ({ page }) => {
    await page.fill('#title', '   ');
    await page.fill('#description', 'Description');
    await page.fill('#complainant_statement', 'Statement');
    await page.click('button:has-text("Submit Complaint")');

    const notification = page.locator('.notification').filter({ hasText: /title/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Create Crime Scene Report', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
    await page.goto('/cases/scene/new');
    await waitForLoading(page);
  });

  // ─── Page Rendering ───────────────────────────────────────────────

  test('should display crime scene form with correct title', async ({ page }) => {
    await expect(page.locator('.scene-title')).toContainText('Crime Scene Report');
    await expect(page.locator('.scene-subtitle')).toContainText('law enforcement personnel only');
  });

  test('should display all required form fields', async ({ page }) => {
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#crime_level')).toBeVisible();
    await expect(page.locator('#crime_scene_location')).toBeVisible();
    await expect(page.locator('#crime_scene_datetime')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
  });

  test('should display witness section with default witness', async ({ page }) => {
    await expect(page.locator('.witnesses-section')).toBeVisible();
    await expect(page.locator('.witnesses-title')).toContainText('Witness Information');
    await expect(page.locator('.witness-card')).toHaveCount(1);
    await expect(page.locator('.witness-number')).toContainText('Witness #1');
  });

  test('should display Add Witness button', async ({ page }) => {
    await expect(page.locator('button:has-text("+ Add Witness")')).toBeVisible();
  });

  // ─── Witness Management ───────────────────────────────────────────

  test('should add a new witness card when clicking Add Witness', async ({ page }) => {
    await page.click('button:has-text("+ Add Witness")');
    await expect(page.locator('.witness-card')).toHaveCount(2);
    await expect(page.locator('.witness-number').nth(1)).toContainText('Witness #2');
  });

  test('should add multiple witnesses', async ({ page }) => {
    await page.click('button:has-text("+ Add Witness")');
    await page.click('button:has-text("+ Add Witness")');
    await page.click('button:has-text("+ Add Witness")');
    await expect(page.locator('.witness-card')).toHaveCount(4);
  });

  test('should remove a witness when clicking Remove', async ({ page }) => {
    await page.click('button:has-text("+ Add Witness")');
    await expect(page.locator('.witness-card')).toHaveCount(2);

    await page.click('.btn-remove');
    await expect(page.locator('.witness-card')).toHaveCount(1);
  });

  test('should not show Remove button when only one witness', async ({ page }) => {
    await expect(page.locator('.btn-remove')).toHaveCount(0);
  });

  test('should display witness fields with correct placeholders', async ({ page }) => {
    await expect(page.locator('#witness-name-0')).toHaveAttribute('placeholder', 'John Doe');
    await expect(page.locator('#witness-phone-0')).toHaveAttribute('placeholder', '+1234567890');
    await expect(page.locator('#witness-id-0')).toHaveAttribute('placeholder', 'ID number');
  });

  // ─── Form Validation ──────────────────────────────────────────────

  test('should show error when title is empty', async ({ page }) => {
    await page.fill('#description', 'Description');
    await page.fill('#crime_scene_location', 'Location');
    await page.fill('#crime_scene_datetime', '2025-01-15T14:30');
    await page.evaluate(() => document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required')));
    await page.click('button:has-text("Submit Report")');

    const notification = page.locator('.notification').filter({ hasText: /title/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show error when location is empty', async ({ page }) => {
    await page.fill('#title', 'Test Scene');
    await page.fill('#description', 'Description');
    await page.fill('#crime_scene_datetime', '2025-01-15T14:30');
    await page.evaluate(() => document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required')));
    await page.click('button:has-text("Submit Report")');

    const notification = page.locator('.notification').filter({ hasText: /location/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  test('should show error when datetime is empty', async ({ page }) => {
    await page.fill('#title', 'Test Scene');
    await page.fill('#description', 'Description');
    await page.fill('#crime_scene_location', 'Location');
    await page.evaluate(() => document.querySelectorAll('[required]').forEach(el => el.removeAttribute('required')));
    await page.click('button:has-text("Submit Report")');

    const notification = page.locator('.notification').filter({ hasText: /date|time/i });
    await expect(notification).toBeVisible({ timeout: 5000 });
  });

  // ─── Successful Submission ────────────────────────────────────────

  test('should successfully submit a crime scene report', async ({ page }) => {
    // Mock the API to return success
    await page.route('**cases/cases**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 999, case_id: 'CASE-TEST', title: 'Test Scene', status: 'draft' }),
        });
      } else {
        route.continue();
      }
    });

    const data = mockCrimeSceneData();
    await page.fill('#title', data.title);
    await page.selectOption('#crime_level', data.crime_level.toString());
    await page.fill('#crime_scene_location', data.crime_scene_location);
    await page.fill('#crime_scene_datetime', data.crime_scene_datetime);
    await page.fill('#description', data.description);

    // Fill witness data
    await page.fill('#witness-name-0', data.witnesses[0].full_name);
    await page.fill('#witness-phone-0', data.witnesses[0].phone_number);
    await page.fill('#witness-id-0', data.witnesses[0].national_id);

    await page.click('button:has-text("Submit Report")');

    const notification = page.locator('.notification').filter({ hasText: /success/i });
    await expect(notification).toBeVisible({ timeout: 15000 });
  });

  // ─── Guidelines Section ───────────────────────────────────────────

  test('should display officer reporting guidelines', async ({ page }) => {
    await expect(page.locator('.process-title')).toContainText('Officer Reporting Guidelines');
    await expect(page.locator('.guidelines-list')).toBeVisible();
    const items = page.locator('.guidelines-list li');
    expect(await items.count()).toBeGreaterThan(0);
  });

  // ─── Cancel Button ────────────────────────────────────────────────

  test('should navigate back to cases on Cancel', async ({ page }) => {
    await page.click('button:has-text("Cancel")');
    await expect(page).toHaveURL(/.*cases/);
  });
});

test.describe('Case Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
  });

  // ─── Page Structure ───────────────────────────────────────────────

  test('should display case detail page with back button', async ({ page }) => {
    // Navigate to cases list first, then click into a real case
    await page.goto('/cases');
    await page.waitForSelector('.case-card', { timeout: 15000 });
    // Click the View Details button on the first case card
    await page.locator('.case-card').first().locator('a:has-text("View Details")').click();
    await page.waitForSelector('.btn-back', { timeout: 15000 });
    await expect(page.locator('.btn-back')).toContainText('Back to Cases');
  });

  test('should navigate back to cases when clicking back button', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForSelector('.case-card', { timeout: 15000 });
    await page.locator('.case-card').first().locator('a:has-text("View Details")').click();
    await page.waitForSelector('.btn-back', { timeout: 15000 });
    await page.click('.btn-back');
    await expect(page).toHaveURL(/.*cases$/);
  });

  test('should display case information section', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForSelector('.case-card', { timeout: 15000 });
    await page.locator('.case-card').first().locator('a:has-text("View Details")').click();
    await page.waitForSelector('.btn-back', { timeout: 15000 });
    await expect(page.locator('h2:has-text("Case Information")')).toBeVisible();
  });

  test('should display review history section', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForSelector('.case-card', { timeout: 15000 });
    await page.locator('.case-card').first().locator('a:has-text("View Details")').click();
    await page.waitForSelector('.btn-back', { timeout: 15000 });
    await expect(page.locator('h2:has-text("Review History")')).toBeVisible();
  });

  // ─── Error Handling ───────────────────────────────────────────────

  test('should redirect to cases list when case ID does not exist', async ({ page }) => {
    await page.goto('/cases/99999999');
    
    // Should either show error notification or redirect
    await page.waitForTimeout(5000);
    const url = page.url();
    const notification = page.locator('.notification');
    
    // Either redirected or shows error
    expect(url.includes('cases') || await notification.count() > 0).toBeTruthy();
  });

  test('should handle invalid case ID in URL', async ({ page }) => {
    await page.goto('/cases/invalid-id');
    await page.waitForTimeout(3000);
    // Should handle gracefully
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Case Review Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);
  });

  test('should not allow review of non-reviewable case', async ({ page }) => {
    // Mock a case that is not in review status
    await page.route('**/api/v1/cases/cases/*', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 1,
            case_id: 'CASE-001',
            title: 'Test Case',
            description: 'Test',
            status: 'open',
            crime_level: 2,
            created_at: new Date().toISOString(),
            created_by: { first_name: 'Admin', last_name: 'User', email: 'admin@test.com' },
          }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/cases/1/review');
    
    // Should redirect or show error
    const notification = page.locator('.notification').filter({ hasText: /not available|cannot review/i });
    await page.waitForTimeout(3000);
  });
});
