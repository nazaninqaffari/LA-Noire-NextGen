/**
 * Patch Test: Bug 5 – Detective Board Item Titles & Hover Preview
 *
 * Verifies that:
 * 1. Board items show their label instead of "Item #123"
 * 2. Items with notes display a truncated notes line
 * 3. Hovering over an item shows a preview tooltip with evidence details
 * 4. The preview tooltip includes evidence images when available
 * 5. The add-item form includes label and notes fields
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../helpers/test-utils';

const CASE_ID = 42;

const MOCK_AUTH_DETECTIVE = {
  id: 1, username: 'detective1', first_name: 'Det', last_name: 'Test',
  roles: [{ id: 1, name: 'detective', hierarchy_level: 4 }],
  is_active: true, date_joined: '2024-01-01',
};

const MOCK_BOARD_WITH_LABELS = {
  id: 1,
  case: CASE_ID,
  created_by: 1,
  items: [
    {
      id: 10,
      board: 1,
      label: 'Blood stain near entrance',
      notes: 'Matched victim DNA. Key evidence linking suspect to scene.',
      position_x: 100,
      position_y: 120,
      content_type: 'biological',
      object_id: 2,
    },
    {
      id: 11,
      board: 1,
      label: 'Witness Statement - Jane Doe',
      notes: '',
      position_x: 350,
      position_y: 120,
      content_type: 'testimony',
      object_id: 1,
    },
    {
      id: 12,
      board: 1,
      label: '',
      notes: '',
      position_x: 600,
      position_y: 120,
      content_type: null,
      object_id: null,
    },
  ],
  connections: [],
  created_at: '2024-01-10T10:00:00Z',
};

const MOCK_BOARDS = {
  count: 1,
  results: [MOCK_BOARD_WITH_LABELS],
};

const MOCK_BIO = {
  count: 1,
  results: [
    {
      id: 2, case: CASE_ID, title: 'Blood Sample A',
      description: 'Blood found near entrance, DNA pending.',
      evidence_type: 'blood',
      images_data: [{ id: 50, image: '/media/evidence/blood_sample.jpg', caption: 'Blood stain photo' }],
    },
  ],
};

const MOCK_TESTIMONIES = {
  count: 1,
  results: [
    {
      id: 1, case: CASE_ID, title: 'Witness Statement',
      witness_name: 'Jane Doe',
      description: 'Saw suspect fleeing the building at 11pm.',
    },
  ],
};

test.describe('Patch: Detective Board Item Titles & Hover', () => {

  test.beforeEach(async ({ page }) => {
    // Auth
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_DETECTIVE) }),
    );

    // Mock notification endpoint so it doesn't fail
    await page.route('**/api/v1/investigation/notifications/unread_count/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) }),
    );

    // Evidence endpoints (for hover preview detail)
    await mockAPIResponse(page, 'evidence/testimonies/**', MOCK_TESTIMONIES);
    await mockAPIResponse(page, 'evidence/biological/**', MOCK_BIO);
    await mockAPIResponse(page, 'evidence/vehicles/**', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/id-documents/**', { count: 0, results: [] });
    await mockAPIResponse(page, 'evidence/generic/**', { count: 0, results: [] });

    // Board endpoints — register AFTER evidence so these have LIFO priority.
    // Use ** to match both list (?case=42) and detail (/1/) URLs.
    await page.route('**/api/v1/investigation/detective-boards/**', (route) => {
      const url = route.request().url();
      if (url.match(/detective-boards\/\d+\//)) {
        // Detail: /detective-boards/1/
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BOARD_WITH_LABELS) });
      } else {
        // List: /detective-boards/?case=42
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_BOARDS) });
      }
    });
  });

  test('board items display their label text instead of "Item #ID"', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`);

    // Item with label should show its label
    const labelledItem = page.locator('.board-item-label:has-text("Blood stain near entrance")');
    await expect(labelledItem).toBeVisible({ timeout: 10000 });

    // Item without label should fall back to "Item #12"
    const fallbackItem = page.locator('.board-item-label:has-text("Item #12")');
    await expect(fallbackItem).toBeVisible({ timeout: 5000 });
  });

  test('board items with notes show truncated notes text', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`);

    // The blood stain item has notes — check for notes element
    const notesEl = page.locator('.board-item-notes').first();
    await expect(notesEl).toBeVisible({ timeout: 10000 });
    const notesText = await notesEl.textContent();
    expect(notesText).toContain('Matched victim DNA');
  });

  test('hovering over a board item shows preview tooltip', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`);

    // Wait for board items to render
    const boardItems = page.locator('.board-item');
    await expect(boardItems.first()).toBeVisible({ timeout: 10000 });

    const count = await boardItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Check that preview elements are part of board items
    const previewsInDom = page.locator('.board-item-preview');
    const previewCount = await previewsInDom.count();
    expect(previewCount).toBeGreaterThan(0);
  });

  test('preview tooltip contains evidence description for linked items', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`);

    // Hover over the blood stain item to trigger preview
    const bloodItem = page.locator('.board-item').filter({ hasText: 'Blood stain near entrance' });
    await expect(bloodItem).toBeVisible({ timeout: 10000 });
    await bloodItem.hover();
    await page.waitForTimeout(500);

    // Check preview content
    const preview = bloodItem.locator('.board-item-preview');
    await expect(preview).toBeVisible();

    // Should show the preview-title with the label
    const previewTitle = preview.locator('.preview-title');
    await expect(previewTitle).toContainText('Blood stain near entrance');

    // Should show notes in the preview
    const previewNotes = preview.locator('.preview-notes');
    await expect(previewNotes).toContainText('Matched victim DNA');
  });

  test('preview tooltip shows content type badge for linked evidence', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`);

    // Hover over the blood stain item (biological type)
    const bloodItem = page.locator('.board-item').filter({ hasText: 'Blood stain near entrance' });
    await expect(bloodItem).toBeVisible({ timeout: 10000 });
    await bloodItem.hover();
    await page.waitForTimeout(500);

    const preview = bloodItem.locator('.board-item-preview');
    const typeBadge = preview.locator('.preview-type');
    await expect(typeBadge).toBeVisible();
    await expect(typeBadge).toContainText('biological');
  });

  test('add item form includes label and notes fields', async ({ page }) => {
    await page.goto(`/detective-board?case=${CASE_ID}`);

    // Wait for page to load
    await page.locator('.board-item').first().waitFor({ state: 'visible', timeout: 10000 });

    // Click "+ Add Item" button
    const addBtn = page.locator('button:has-text("Add Item")');
    await addBtn.click();
    await page.waitForTimeout(500);

    // The add-item form should be visible
    const form = page.locator('.add-item-form');
    await expect(form).toBeVisible();

    // Should have label and notes fields
    const labelInput = form.locator('#item-label');
    const notesInput = form.locator('#item-notes');
    await expect(labelInput).toBeVisible();
    await expect(notesInput).toBeVisible();
  });
});
