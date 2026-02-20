/**
 * Patch Test: Detective Board Evidence Display
 * 
 * Verifies that the detective board has an evidence panel:
 * 1. "Show Evidence" button appears when viewing a case board
 * 2. Evidence panel loads and shows categorized evidence
 * 3. Evidence items can be added to the board
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const CASE_ID = 42;

const MOCK_BOARDS = {
  count: 1,
  results: [
    {
      id: 1,
      case: CASE_ID,
      created_by: 1,
      items: [
        { id: 10, board: 1, label: 'Suspect A', notes: 'Main suspect', position_x: 100, position_y: 100, content_type: null, object_id: null },
      ],
      connections: [],
      created_at: '2024-01-10T10:00:00Z',
    },
  ],
};

const MOCK_BOARD_DETAIL = MOCK_BOARDS.results[0];

const MOCK_TESTIMONIES = {
  count: 1,
  results: [
    { id: 1, case: CASE_ID, title: 'Witness statement', witness_name: 'Mary Jones', description: 'Saw the suspect flee', transcription: 'I saw him run away...' },
  ],
};

const MOCK_BIO_EVIDENCE = {
  count: 1,
  results: [
    { id: 2, case: CASE_ID, title: 'Blood sample', description: 'Found at scene', evidence_type: 'blood' },
  ],
};

const MOCK_VEHICLES = { count: 0, results: [] };
const MOCK_ID_DOCS = { count: 0, results: [] };
const MOCK_GENERIC = {
  count: 1,
  results: [
    { id: 5, case: CASE_ID, title: 'Crowbar', description: 'Possible weapon' },
  ],
};

test.describe('Patch: Detective Board Evidence Panel', () => {

  test.beforeEach(async ({ page }) => {
    // Mock investigation board endpoints
    await page.route(`**/api/v1/investigation/detective-boards/*`, (route) => {
      const url = route.request().url();
      if (url.endsWith('/1/')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BOARD_DETAIL) });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BOARDS) });
      }
    });

    // Mock evidence endpoints
    await mockAPIResponse(page, 'evidence/testimonies/*', MOCK_TESTIMONIES);
    await mockAPIResponse(page, 'evidence/biological/*', MOCK_BIO_EVIDENCE);
    await mockAPIResponse(page, 'evidence/vehicles/*', MOCK_VEHICLES);
    await mockAPIResponse(page, 'evidence/id-documents/*', MOCK_ID_DOCS);
    await mockAPIResponse(page, 'evidence/generic/*', MOCK_GENERIC);

    // Mock auth
    await page.route('**/api/v1/accounts/users/me/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1, username: 'detective1', first_name: 'Det', last_name: 'Test',
          roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
          is_active: true, date_joined: '2024-01-01',
        }),
      });
    });
  });

  test('should show "Show Evidence" button when case ID is present', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const evidenceBtn = page.locator('button:has-text("Show Evidence")');
    await expect(evidenceBtn).toBeVisible();
  });

  test('clicking "Show Evidence" should open evidence panel', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Initially no evidence panel
    await expect(page.locator('.evidence-panel')).not.toBeVisible();

    // Click the button
    const evidenceBtn = page.locator('button:has-text("Show Evidence")');
    await evidenceBtn.click();
    await page.waitForTimeout(1500);

    // Evidence panel should now be visible
    await expect(page.locator('.evidence-panel')).toBeVisible();
    await expect(page.locator('text=Case Evidence')).toBeVisible();
  });

  test('evidence panel should display evidence items with types', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const evidenceBtn = page.locator('button:has-text("Show Evidence")');
    await evidenceBtn.click();
    await page.waitForTimeout(2000);

    // Check evidence list items
    const evidenceList = page.locator('.evidence-list-item');
    const count = await evidenceList.count();
    expect(count).toBeGreaterThan(0);

    // Check for type badges
    const badges = page.locator('.evidence-type-badge');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('evidence panel should have "Add" buttons', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const evidenceBtn = page.locator('button:has-text("Show Evidence")');
    await evidenceBtn.click();
    await page.waitForTimeout(2000);

    // Each evidence item should have an Add button
    const addBtns = page.locator('.evidence-list-item button:has-text("Add")');
    const count = await addBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('toggling evidence button should hide the panel', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const evidenceBtn = page.locator('button:has-text("Evidence")');
    
    // Open
    await evidenceBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('.evidence-panel')).toBeVisible();

    // Close
    await evidenceBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('.evidence-panel')).not.toBeVisible();
  });
});
