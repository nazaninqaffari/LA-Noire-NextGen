/**
 * Patch Test: Detective Interrogation Button (Bug 2)
 * 
 * Verifies that when a case has status 'arrest_approved' or 'interrogation',
 * the case detail page shows a "🔎 Interrogations" button alongside the
 * 4 other investigation buttons.
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../../helpers/test-utils';

const MOCK_CASE_ARREST = {
  id: 701,
  case_number: 'LA-2024-701',
  title: 'Arrest Approved Case',
  description: 'Suspects arrested, ready for interrogation',
  status: 'arrest_approved',
  crime_level: 1,
  formation_type: 'crime_scene',
  created_by: 1,
  created_by_details: { id: 1, username: 'creator', full_name: 'Case Creator' },
  assigned_detective: 10,
  assigned_detective_details: { id: 10, username: 'detective1', full_name: 'John Detective' },
  reviews: [],
  created_at: '2024-06-01T10:00:00Z',
  updated_at: '2024-06-15T10:00:00Z',
};

const MOCK_CASE_INTERROGATION = {
  ...MOCK_CASE_ARREST,
  id: 702,
  case_number: 'LA-2024-702',
  title: 'Interrogation Phase Case',
  status: 'interrogation',
};

const MOCK_CASE_OPEN = {
  ...MOCK_CASE_ARREST,
  id: 703,
  case_number: 'LA-2024-703',
  title: 'Open Investigation Case',
  status: 'open',
};

test.describe('Patch: Detective Interrogation Button', () => {

  test('arrest_approved case should show Interrogations button', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_ARREST.id}/`, MOCK_CASE_ARREST);

    await page.goto(`/cases/${MOCK_CASE_ARREST.id}`);
    await page.waitForTimeout(2000);

    // Should show all 5 buttons
    await expect(page.locator('button:has-text("Detective Board")')).toBeVisible();
    await expect(page.locator('.investigation-links button:has-text("Suspects")')).toBeVisible();
    await expect(page.locator('button:has-text("Suspect Submissions")')).toBeVisible();
    await expect(page.locator('.investigation-links button:has-text("Evidence")')).toBeVisible();
    await expect(page.locator('button:has-text("Interrogations")')).toBeVisible();
  });

  test('interrogation status case should show Interrogations button', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_INTERROGATION.id}/`, MOCK_CASE_INTERROGATION);

    await page.goto(`/cases/${MOCK_CASE_INTERROGATION.id}`);
    await page.waitForTimeout(2000);

    await expect(page.locator('button:has-text("Interrogations")')).toBeVisible();
  });

  test('open case should NOT show Interrogations button', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_OPEN.id}/`, MOCK_CASE_OPEN);

    await page.goto(`/cases/${MOCK_CASE_OPEN.id}`);
    await page.waitForTimeout(2000);

    // Should show other buttons but NOT Interrogations
    await expect(page.locator('button:has-text("Detective Board")')).toBeVisible();
    const interrogationBtn = page.locator('button:has-text("Interrogations")');
    expect(await interrogationBtn.count()).toBe(0);
  });

  test('interrogation button navigates to correct URL', async ({ page }) => {
    await mockAPIResponse(page, `cases/cases/${MOCK_CASE_ARREST.id}/`, MOCK_CASE_ARREST);
    // Also mock interrogations page to avoid navigation errors
    await mockAPIResponse(page, 'investigation/interrogations/*', {
      count: 0, next: null, previous: null, results: [],
    });

    await page.goto(`/cases/${MOCK_CASE_ARREST.id}`);
    await page.waitForTimeout(2000);

    await page.locator('button:has-text("Interrogations")').click();
    await page.waitForTimeout(1000);

    // Should navigate to interrogations with case filter
    expect(page.url()).toContain(`/interrogations`);
    expect(page.url()).toContain(`case=${MOCK_CASE_ARREST.id}`);
  });
});
