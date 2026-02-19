/**
 * Patch Test: Suspect Submissions (Detective → Sergeant)
 * 
 * Verifies:
 * 1. SuspectSubmissions page loads and shows submissions
 * 2. Detective can see the "New Submission" button
 * 3. Sergeant can see review controls for pending submissions
 * 4. Route /suspect-submissions is accessible
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const CASE_ID = 42;

const MOCK_SUBMISSIONS = {
  count: 2,
  results: [
    {
      id: 1,
      case: CASE_ID,
      detective: { id: 10, username: 'detective1', full_name: 'John Detective' },
      suspects: [1, 2],
      reasoning: 'Based on fingerprints and eyewitness accounts',
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      case: CASE_ID,
      detective: { id: 10, username: 'detective1', full_name: 'John Detective' },
      suspects: [3],
      reasoning: 'DNA evidence links suspect to the scene',
      status: 'approved',
      sergeant_feedback: 'Evidence is compelling. Arrest warrants issued.',
      created_at: '2024-01-12T10:00:00Z',
    },
  ],
};

const MOCK_SUSPECTS = {
  count: 3,
  results: [
    { id: 1, case: CASE_ID, person: { id: 20, username: 'suspect1', full_name: 'Alice Suspect' }, status: 'under_pursuit', danger_score: 7, reward_amount: 5000, approved_by_sergeant: false, arrest_warrant_issued: false, created_at: '2024-01-10T10:00:00Z' },
    { id: 2, case: CASE_ID, person: { id: 21, username: 'suspect2', full_name: 'Bob Suspect' }, status: 'under_pursuit', danger_score: 5, reward_amount: 2000, approved_by_sergeant: false, arrest_warrant_issued: false, created_at: '2024-01-10T10:00:00Z' },
    { id: 3, case: CASE_ID, person: { id: 22, username: 'suspect3', full_name: 'Charlie Suspect' }, status: 'arrested', danger_score: 9, reward_amount: 10000, approved_by_sergeant: true, arrest_warrant_issued: true, created_at: '2024-01-10T10:00:00Z' },
  ],
};

test.describe('Patch: Suspect Submissions Page', () => {

  test('route /suspect-submissions should be accessible', async ({ page }) => {
    await mockAPIResponse(page, 'investigation/suspect-submissions/*', { count: 0, results: [] });
    // Mock auth
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1, username: 'detective1', roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
          first_name: 'Det', last_name: 'Test', is_active: true, date_joined: '2024-01-01',
        }),
      });
    });

    const response = await page.goto(`/suspect-submissions?case=${CASE_ID}`);
    expect(response?.status()).toBe(200);

    // Should not be a 404
    const notFound = page.locator('text=Page Not Found');
    expect(await notFound.count()).toBe(0);
  });

  test('detective should see "New Submission" button', async ({ page }) => {
    await mockAPIResponse(page, 'investigation/suspect-submissions/*', MOCK_SUBMISSIONS);
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10, username: 'detective1', roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
          first_name: 'John', last_name: 'Detective', is_active: true, date_joined: '2024-01-01',
        }),
      });
    });

    await page.goto(`/suspect-submissions?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    const newBtn = page.locator('button:has-text("New Submission")');
    await expect(newBtn).toBeVisible();
  });

  test('submissions list should show submission cards with status badges', async ({ page }) => {
    await mockAPIResponse(page, 'investigation/suspect-submissions/*', MOCK_SUBMISSIONS);
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10, username: 'detective1', roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
          first_name: 'John', last_name: 'Detective', is_active: true, date_joined: '2024-01-01',
        }),
      });
    });

    await page.goto(`/suspect-submissions?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Should show submission cards
    const cards = page.locator('.submission-card');
    const count = await cards.count();
    expect(count).toBe(2);

    // Check status badges
    const pendingBadge = page.locator('.badge-pending');
    const approvedBadge = page.locator('.badge-approved');
    await expect(pendingBadge).toBeVisible();
    await expect(approvedBadge).toBeVisible();
  });

  test('sergeant should see "Review Submission" button for pending items', async ({ page }) => {
    await mockAPIResponse(page, 'investigation/suspect-submissions/*', MOCK_SUBMISSIONS);
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 20, username: 'sergeant1', roles: [{ id: 5, name: 'sergeant', hierarchy_level: 5 }],
          first_name: 'Sara', last_name: 'Sergeant', is_active: true, date_joined: '2024-01-01',
        }),
      });
    });

    await page.goto(`/suspect-submissions?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Sergeant should see "Review Submission" on pending cards
    const reviewBtn = page.locator('button:has-text("Review Submission")');
    await expect(reviewBtn).toBeVisible();
  });

  test('clicking "New Submission" should show suspect selection form', async ({ page }) => {
    await mockAPIResponse(page, 'investigation/suspect-submissions/*', { count: 0, results: [] });
    await mockAPIResponse(page, 'investigation/suspects/*', MOCK_SUSPECTS);
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10, username: 'detective1', roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
          first_name: 'John', last_name: 'Detective', is_active: true, date_joined: '2024-01-01',
        }),
      });
    });

    await page.goto(`/suspect-submissions?case=${CASE_ID}`);
    await page.waitForTimeout(1500);

    // Click new submission
    const newBtn = page.locator('button:has-text("New Submission"), button:has-text("Create First Submission")');
    await newBtn.first().click();
    await page.waitForTimeout(1500);

    // Should show the submission form with suspect checkboxes
    const form = page.locator('.submission-form');
    await expect(form).toBeVisible();

    // Should show suspect checkboxes
    const checkboxes = page.locator('.suspect-checkbox');
    const checkboxCount = await checkboxes.count();
    expect(checkboxCount).toBeGreaterThan(0);

    // Should show reasoning textarea
    await expect(page.locator('#reasoning')).toBeVisible();
  });

  test('submission reasoning and detective info should be visible', async ({ page }) => {
    await mockAPIResponse(page, 'investigation/suspect-submissions/*', MOCK_SUBMISSIONS);
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 10, username: 'detective1', roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
          first_name: 'John', last_name: 'Detective', is_active: true, date_joined: '2024-01-01',
        }),
      });
    });

    await page.goto(`/suspect-submissions?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Reasoning should be displayed
    await expect(page.locator('text=Based on fingerprints')).toBeVisible();
    await expect(page.locator('text=DNA evidence')).toBeVisible();
  });
});
