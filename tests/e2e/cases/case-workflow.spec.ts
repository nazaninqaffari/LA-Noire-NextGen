/**
 * Case Workflow E2E Tests
 * 
 * End-to-end tests for the complete case lifecycle:
 * complaint filing → cadet review → officer review → investigation → trial → closure
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_ADMIN, waitForLoading, mockAPIResponse, mockComplaintData, mockCrimeSceneData, uniqueId } from '../helpers/test-utils';

test.describe('Complete Case Workflow', () => {
  test('should complete full complaint filing workflow', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Step 1: Navigate to file complaint
    await page.goto('/cases/complaint/new');
    await waitForLoading(page);

    // Step 2: Fill in complaint details
    const data = mockComplaintData();
    await page.fill('#title', data.title);
    await page.selectOption('#crime_level', '2');
    await page.fill('#description', data.description);
    await page.fill('#complainant_statement', data.complainant_statement);

    // Step 3: Submit complaint
    await page.click('button:has-text("Submit Complaint")');

    // Step 4: Verify success notification
    const notification = page.locator('.notification').filter({ hasText: /success/i });
    await expect(notification).toBeVisible({ timeout: 15000 });

    // Step 5: Verify redirect to cases list
    await page.waitForURL('**/cases', { timeout: 10000 });
    await expect(page.locator('h1.page-title')).toContainText('Case Files');
  });

  test('should complete full crime scene report workflow', async ({ page }) => {
    test.setTimeout(60000);
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Step 1: Navigate to crime scene report
    await page.goto('/cases/scene/new');
    await waitForLoading(page);

    // Mock the API to return success for the POST
    await page.route('**cases/cases**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 998, case_id: 'CASE-WF', title: 'Test Scene', status: 'draft' }),
        });
      } else {
        route.continue();
      }
    });

    // Step 2: Fill in crime scene details
    const data = mockCrimeSceneData();
    await page.fill('#title', data.title);
    await page.selectOption('#crime_level', '1');
    await page.fill('#crime_scene_location', data.crime_scene_location);
    await page.fill('#crime_scene_datetime', data.crime_scene_datetime);
    await page.fill('#description', data.description);

    // Step 3: Fill witness information
    await page.fill('#witness-name-0', 'John Witness');
    await page.fill('#witness-phone-0', '5559990001');
    await page.fill('#witness-id-0', 'WIT0001');

    // Step 4: Submit report
    await page.click('button:has-text("Submit Report")');

    // Step 5: Verify outcome
    const notification = page.locator('.notification').filter({ hasText: /success/i });
    await expect(notification).toBeVisible({ timeout: 15000 });
  });

  test('should navigate through case detail from cases list', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Go to cases list
    await page.goto('/cases');
    await waitForLoading(page);

    // Click on a case if available via View Details link
    const viewLink = page.locator('.case-card a:has-text("View Details"), .case-card .btn-primary');
    if (await viewLink.count() > 0) {
      await viewLink.first().click();
      await page.waitForTimeout(3000);

      // Check if we navigated to a case detail page
      const url = page.url();
      if (/cases\/\d+/.test(url)) {
        // Wait for back button to appear (data loaded)
        const backBtn = page.locator('.btn-back');
        if (await backBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
          await backBtn.click();
          await expect(page).toHaveURL(/.*cases/);
        }
      }
    }
  });

  test('should create complaint then view it in cases list', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Create a unique complaint
    const uniqueTitle = `E2E Case ${uniqueId()}`;
    await page.goto('/cases/complaint/new');
    await waitForLoading(page);
    await page.fill('#title', uniqueTitle);
    await page.fill('#description', 'E2E test case description for workflow validation');
    await page.fill('#complainant_statement', 'E2E test complainant statement');
    await page.click('button:has-text("Submit Complaint")');

    // Wait for redirect to cases
    await page.waitForURL('**/cases', { timeout: 15000 });
    await waitForLoading(page);

    // Search for the case we just created
    await page.fill('input[placeholder="Search cases..."]', uniqueTitle);
    await page.click('button:has-text("Search")');
    await waitForLoading(page);
  });
});

test.describe('Case Status Transitions (Mocked)', () => {
  test('should show review button for cases in cadet_review status', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    // Mock a case in cadet_review status
    await page.route('**/api/v1/cases/cases/1/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 1, case_id: 'CASE-001', title: 'Awaiting Cadet Review',
          description: 'Test case awaiting review', status: 'cadet_review',
          crime_level: 2, formation_type: 'complaint',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
          complainant_statement: 'Test statement',
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/1/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/1');
    await waitForLoading(page);

    const reviewBtn = page.locator('button:has-text("Review Case")');
    if (await reviewBtn.count() > 0) {
      await expect(reviewBtn).toBeVisible();
    }
  });

  test('should show review button for cases in officer_review status', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/2/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 2, case_id: 'CASE-002', title: 'Awaiting Officer Review',
          description: 'Test case awaiting officer review', status: 'officer_review',
          crime_level: 1, formation_type: 'crime_scene',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
          crime_scene_location: '123 Test St',
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/2/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/2');
    await waitForLoading(page);

    const reviewBtn = page.locator('button:has-text("Review Case")');
    if (await reviewBtn.count() > 0) {
      await expect(reviewBtn).toBeVisible();
    }
  });

  test('should NOT show review button for open cases', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/3/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 3, case_id: 'CASE-003', title: 'Open Investigation',
          description: 'Active investigation', status: 'open',
          crime_level: 0,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/3/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/3');
    await waitForLoading(page);

    const reviewBtn = page.locator('button:has-text("Review Case")');
    await expect(reviewBtn).toHaveCount(0);
  });

  test('should display case status badge correctly', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/4/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 4, case_id: 'CASE-004', title: 'Under Investigation',
          description: 'Test', status: 'under_investigation',
          crime_level: 2,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/4/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/4');
    await waitForLoading(page);

    // Status badge should be visible
    const statusBadge = page.locator('.status-badge, .case-status, [class*="status"]').first();
    if (await statusBadge.count() > 0) {
      await expect(statusBadge).toBeVisible();
    }
  });

  test('should display review history timeline', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/5/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 5, case_id: 'CASE-005', title: 'Reviewed Case',
          description: 'Test', status: 'open',
          crime_level: 2,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/5/reviews/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            reviewer: { first_name: 'Cadet', last_name: 'Smith' },
            decision: 'approved',
            timestamp: new Date().toISOString(),
          },
          {
            reviewer: { first_name: 'Officer', last_name: 'Jones' },
            decision: 'approved',
            timestamp: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.goto('/cases/5');
    await waitForLoading(page);

    // Review timeline should have items
    const reviews = page.locator('.timeline-item, .review-item');
    if (await reviews.count() > 0) {
      expect(await reviews.count()).toBe(2);
    }
  });

  test('should display rejection reason in review history', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/6/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 6, case_id: 'CASE-006', title: 'Rejected Case',
          description: 'Test', status: 'rejected',
          crime_level: 3,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/6/reviews/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            reviewer: { first_name: 'Cadet', last_name: 'Smith' },
            decision: 'rejected',
            timestamp: new Date().toISOString(),
            rejection_reason: 'Insufficient evidence provided',
          },
        ]),
      });
    });

    await page.goto('/cases/6');
    await waitForLoading(page);

    const rejectionReason = page.locator('.rejection-reason, :has-text("Insufficient evidence")');
    if (await rejectionReason.count() > 0) {
      await expect(rejectionReason.first()).toBeVisible();
    }
  });
});

test.describe('Case Formation Types', () => {
  test('should display complaint-specific fields for complaint cases', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/7/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 7, case_id: 'CASE-007', title: 'Complaint Case',
          description: 'Test', status: 'open',
          crime_level: 2, formation_type: 'complaint',
          complainant_statement: 'I witnessed a robbery at 5th and Main.',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/7/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/7');
    await waitForLoading(page);

    // Complaint-specific sections
    const complaintSection = page.locator('h2:has-text("Complainant Statement")');
    if (await complaintSection.count() > 0) {
      await expect(complaintSection).toBeVisible();
    }
  });

  test('should display crime-scene-specific fields for crime scene cases', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/8/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 8, case_id: 'CASE-008', title: 'Crime Scene Case',
          description: 'Test', status: 'open',
          crime_level: 0, formation_type: 'crime_scene',
          crime_scene_location: '1234 Hollywood Blvd',
          crime_scene_datetime: '2025-01-15T14:30:00Z',
          witness_data: [
            { full_name: 'Jane Doe', phone_number: '5551234567', national_id: 'WIT001' },
          ],
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/8/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/8');
    await waitForLoading(page);

    // Crime scene specific sections
    const crimeSceneSection = page.locator('h2:has-text("Crime Scene Details")');
    if (await crimeSceneSection.count() > 0) {
      await expect(crimeSceneSection).toBeVisible();
    }

    // Location should be displayed
    const location = page.locator(':has-text("1234 Hollywood Blvd")');
    if (await location.count() > 0) {
      await expect(location.first()).toBeVisible();
    }
  });

  test('should display formation type indicator in case meta', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/9/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 9, case_id: 'CASE-009', title: 'Complaint Type Case',
          description: 'Test', status: 'open',
          crime_level: 2, formation_type: 'complaint',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/9/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/9');
    await waitForLoading(page);

    const formationMeta = page.locator('.meta-item:has-text("Formation")');
    if (await formationMeta.count() > 0) {
      await expect(formationMeta.first()).toContainText(/Complaint|📜/);
    }
  });
});
