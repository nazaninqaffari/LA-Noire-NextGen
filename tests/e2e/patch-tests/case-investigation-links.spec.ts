/**
 * Patch Test: Case Detail Investigation Links
 * 
 * Verifies investigation action links appear on case detail for open/investigation cases:
 * - Detective Board link
 * - Suspects link
 * - Suspect Submissions link
 * - Evidence link
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const MOCK_OPEN_CASE = {
  id: 50,
  case_number: 'LA-2024-050',
  title: 'Active Investigation Case',
  description: 'Case currently under investigation',
  status: 'under_investigation',
  crime_level: 1,
  formation_type: 'crime_scene',
  created_by: 1,
  created_by_details: { id: 1, username: 'client1', full_name: 'John Client' },
  assigned_detective: 10,
  assigned_detective_details: { id: 10, username: 'detective1', full_name: 'John Detective' },
  reviews: [],
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-20T10:00:00Z',
};

const MOCK_DRAFT_CASE = {
  ...MOCK_OPEN_CASE,
  id: 51,
  status: 'draft',
  case_number: 'LA-2024-051',
};

test.describe('Patch: Case Detail Investigation Links', () => {

  test('open/under_investigation case should show investigation links', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_OPEN_CASE.id}/`, MOCK_OPEN_CASE);

    await page.goto(`/cases/${MOCK_OPEN_CASE.id}`);
    await page.waitForTimeout(2000);

    // Should show investigation links
    await expect(page.locator('button:has-text("Detective Board")')).toBeVisible();
    await expect(page.locator('button:has-text("Suspects")')).toBeVisible();
    await expect(page.locator('button:has-text("Suspect Submissions")')).toBeVisible();
    await expect(page.locator('button:has-text("Evidence")')).toBeVisible();
  });

  test('draft case should NOT show investigation links', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_DRAFT_CASE.id}/`, MOCK_DRAFT_CASE);

    await page.goto(`/cases/${MOCK_DRAFT_CASE.id}`);
    await page.waitForTimeout(2000);

    // Investigation links should NOT appear for draft cases
    const boardLink = page.locator('.investigation-links button:has-text("Detective Board")');
    expect(await boardLink.count()).toBe(0);
  });

  test('investigation links should navigate to correct URLs with case ID', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_OPEN_CASE.id}/`, MOCK_OPEN_CASE);

    // Mock subsequent pages
    await page.route('**/api/v1/investigation/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0, results: [] }) });
    });
    await page.route('**/api/v1/evidence/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0, results: [] }) });
    });

    await page.goto(`/cases/${MOCK_OPEN_CASE.id}`);
    await page.waitForTimeout(2000);

    // Click detective board link
    await page.locator('button:has-text("Detective Board")').click();
    await page.waitForTimeout(1000);
    expect(page.url()).toContain(`/detective-board?case=${MOCK_OPEN_CASE.id}`);
  });

  test('suspects_identified status should also show investigation links', async ({ page }) => {
    const suspectsCase = { ...MOCK_OPEN_CASE, id: 52, status: 'suspects_identified' };
    await mockAPIResponse(page, `cases/cases/52/`, suspectsCase);

    await page.goto('/cases/52');
    await page.waitForTimeout(2000);

    await expect(page.locator('button:has-text("Suspect Submissions")')).toBeVisible();
  });
});
