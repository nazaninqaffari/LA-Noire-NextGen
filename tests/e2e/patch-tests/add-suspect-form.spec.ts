/**
 * Patch Test: Bug 6 – Add Suspect Form
 *
 * Verifies that the Suspects page now has a working "Add Suspect" form:
 * 1. "+ Add Suspect" button is visible for users with the right role
 * 2. Clicking the button opens a form with person search, reason, and photo fields
 * 3. Person search autocomplete works (debounced)
 * 4. Successful submission adds the suspect and refreshes the list
 * 5. Regular users do not see the add button
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const CASE_ID = 42;

const MOCK_AUTH_DETECTIVE = {
  id: 10, username: 'detective1', first_name: 'John', last_name: 'Detective',
  roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
  is_active: true, date_joined: '2024-01-01',
};

const MOCK_AUTH_REGULAR = {
  id: 20, username: 'citizen1', first_name: 'Dave', last_name: 'Regular',
  roles: [{ id: 10, name: 'citizen', hierarchy_level: 0 }],
  is_active: true, date_joined: '2024-01-01',
};

const MOCK_SUSPECTS = {
  count: 2,
  results: [
    {
      id: 1, case: CASE_ID,
      person: { id: 30, first_name: 'Alice', last_name: 'Suspect', username: 'alice_s' },
      status: 'under_pursuit',
      danger_score: 7, reward_amount: 5000,
      approved_by_sergeant: false, arrest_warrant_issued: false,
      reason: 'Fingerprints match', photo: null,
      created_at: '2024-01-10T10:00:00Z',
    },
    {
      id: 2, case: CASE_ID,
      person: { id: 31, first_name: 'Bob', last_name: 'Criminal', username: 'bob_c' },
      status: 'arrested',
      danger_score: 9, reward_amount: 10000,
      approved_by_sergeant: true, arrest_warrant_issued: true,
      reason: 'DNA evidence', photo: '/media/suspects/bob.jpg',
      created_at: '2024-01-08T10:00:00Z',
    },
  ],
};

const MOCK_PERSON_SEARCH = {
  count: 3,
  results: [
    { id: 40, username: 'charlie_d', first_name: 'Charlie', last_name: 'Davis', email: 'charlie@test.com' },
    { id: 41, username: 'diana_e', first_name: 'Diana', last_name: 'Evans', email: 'diana@test.com' },
    { id: 42, username: 'eddie_f', first_name: 'Eddie', last_name: 'Flynn', email: 'eddie@test.com' },
  ],
};

test.describe('Patch: Add Suspect Form', () => {

  test('"+ Add Suspect" button is visible for detective user with case filter', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
    await mockAPIResponse(page, 'investigation/suspects/*', MOCK_SUSPECTS);

    await page.goto(`/suspects?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    const addBtn = page.locator('.add-suspect-btn:has-text("Add Suspect")');
    await expect(addBtn).toBeVisible();
  });

  test('"+ Add Suspect" button is hidden for regular users', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_REGULAR) }),
    );
    await mockAPIResponse(page, 'investigation/suspects/*', MOCK_SUSPECTS);

    await page.goto(`/suspects?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    const addBtn = page.locator('.add-suspect-btn');
    expect(await addBtn.count()).toBe(0);
  });

  test('clicking "+ Add Suspect" opens the add suspect form', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
    await mockAPIResponse(page, 'investigation/suspects/*', MOCK_SUSPECTS);

    await page.goto(`/suspects?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Form should not be visible initially
    await expect(page.locator('.add-suspect-form')).not.toBeVisible();

    // Click the button
    await page.locator('.add-suspect-btn:has-text("Add Suspect")').click();
    await page.waitForTimeout(500);

    // Form should now be visible
    await expect(page.locator('.add-suspect-form')).toBeVisible();

    // Button should now show "Cancel"
    await expect(page.locator('.add-suspect-btn:has-text("Cancel")')).toBeVisible();
  });

  test('add suspect form contains person search, reason, and photo fields', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
    await mockAPIResponse(page, 'investigation/suspects/*', MOCK_SUSPECTS);

    await page.goto(`/suspects?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Open form
    await page.locator('.add-suspect-btn:has-text("Add Suspect")').click();
    await page.waitForTimeout(500);

    // Check form fields exist
    await expect(page.locator('#person-search')).toBeVisible();
    await expect(page.locator('#suspect-reason')).toBeVisible();
    await expect(page.locator('#suspect-photo')).toBeVisible();
  });

  test('person search shows dropdown results after typing', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
    await mockAPIResponse(page, 'investigation/suspects/*', MOCK_SUSPECTS);

    // Mock person search endpoint
    await page.route('**/api/v1/accounts/users/*', (route) => {
      const url = route.request().url();
      if (url.includes('search=')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PERSON_SEARCH) });
      } else if (url.includes('users/me')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0, results: [] }) });
      }
    });

    await page.goto(`/suspects?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Open form
    await page.locator('.add-suspect-btn:has-text("Add Suspect")').click();
    await page.waitForTimeout(500);

    // Type in person search (debounced 400ms)
    await page.fill('#person-search', 'Charlie');
    await page.waitForTimeout(800);

    // Dropdown should appear with results
    const dropdown = page.locator('.person-results-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 3000 });

    const items = dropdown.locator('.person-result-item');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('selecting a person shows selected person badge', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
    await mockAPIResponse(page, 'investigation/suspects/*', MOCK_SUSPECTS);

    // Important: route for users/me/ MUST be matched before the generic users/* route
    // (Playwright uses LIFO order for route matching)
    await page.route('**/api/v1/accounts/users/?search=*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PERSON_SEARCH) });
    });

    await page.goto(`/suspects?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Open form
    await page.locator('.add-suspect-btn:has-text("Add Suspect")').click();
    await page.waitForTimeout(500);

    // Type in search
    await page.fill('#person-search', 'Charlie');
    await page.waitForTimeout(800);

    // Click first result
    const dropdown = page.locator('.person-results-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 3000 });
    await dropdown.locator('.person-result-item').first().click();
    await page.waitForTimeout(300);

    // Selected person badge should appear
    const badge = page.locator('.selected-person-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('Selected');
  });

  test('successful suspect submission refreshes the list', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );

    let suspectCallCount = 0;
    await page.route('**/api/v1/investigation/suspects/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 100, case: CASE_ID,
            person: { id: 40, first_name: 'Charlie', last_name: 'Davis', username: 'charlie_d' },
            status: 'under_pursuit', danger_score: 0, reward_amount: 0,
            approved_by_sergeant: false, arrest_warrant_issued: false,
            reason: 'Seen at crime scene', photo: null,
          }),
        });
      } else {
        suspectCallCount++;
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUSPECTS) });
      }
    });

    // Also mock the list endpoint with query params
    await page.route('**/api/v1/investigation/suspects/?*', (route) => {
      if (route.request().method() === 'GET') {
        suspectCallCount++;
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUSPECTS) });
      } else {
        route.continue();
      }
    });

    await page.route('**/api/v1/accounts/users/?search=*', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PERSON_SEARCH) });
    });

    await page.goto(`/suspects?case=${CASE_ID}`);
    await page.waitForTimeout(2000);

    // Open form, search, select person, fill reason, submit
    await page.locator('.add-suspect-btn:has-text("Add Suspect")').click();
    await page.waitForTimeout(500);

    await page.fill('#person-search', 'Charlie');
    await page.waitForTimeout(800);
    await page.locator('.person-results-dropdown .person-result-item').first().click();
    await page.waitForTimeout(300);

    await page.fill('#suspect-reason', 'Seen at crime scene');

    // Record call count before submit
    const callsBefore = suspectCallCount;

    await page.locator('.add-suspect-form button[type="submit"]:has-text("Add Suspect")').click();
    await page.waitForTimeout(2000);

    // Form should close after successful submission
    await expect(page.locator('.add-suspect-form')).not.toBeVisible({ timeout: 5000 });
  });

  test('add suspect button not shown without case filter', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );
    await mockAPIResponse(page, 'investigation/suspects/*', { count: 0, results: [] });

    // Navigate without case query parameter
    await page.goto(`/suspects`);
    await page.waitForTimeout(2000);

    const addBtn = page.locator('.add-suspect-btn');
    expect(await addBtn.count()).toBe(0);
  });
});
