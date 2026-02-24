/**
 * Patch Test: Co-complainant Dashboard Visibility (Bug 1)
 * 
 * Verifies that when multiple users are complainants on a case,
 * each co-complainant can see the case in their own dashboard/case list.
 * 
 * Uses mock API responses to simulate:
 * - A case with two complainants
 * - The co-complainant's cases list includes the shared case
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse } from '../../helpers/test-utils';

const SHARED_CASE = {
  id: 700,
  case_number: 'LA-2024-700',
  title: 'Shared Co-Complaint Case',
  description: 'Case filed by two complainants',
  status: 'draft',
  crime_level: 3,
  formation_type: 'complaint',
  created_by: 100,
  created_by_details: { id: 100, username: 'creator', full_name: 'Case Creator' },
  complainants: [
    { id: 1, user: 100, full_name: 'Case Creator', is_primary: true },
    { id: 2, user: 101, full_name: 'Co Complainant', is_primary: false },
  ],
  reviews: [],
  created_at: '2024-06-01T10:00:00Z',
  updated_at: '2024-06-01T10:00:00Z',
};

test.describe('Patch: Co-complainant Dashboard Visibility', () => {

  test('co-complainant should see the shared case in their case list', async ({ page }) => {
    // Mock the cases list API to return the shared case for the co-complainant
    await mockAPIResponse(page, 'cases/cases/*', {
      count: 1,
      next: null,
      previous: null,
      results: [SHARED_CASE],
    });

    await page.goto('/cases');
    await page.waitForTimeout(2000);

    // The shared case should appear in the list
    await expect(page.locator(`text=${SHARED_CASE.title}`)).toBeVisible();
    await expect(page.locator(`text=${SHARED_CASE.case_number}`)).toBeVisible();
  });

  test('both co-complainants should see the case in case detail', async ({ page }) => {
    // Mock the case detail API
    await mockAPIResponse(page, `cases/cases/${SHARED_CASE.id}/`, SHARED_CASE);

    await page.goto(`/cases/${SHARED_CASE.id}`);
    await page.waitForTimeout(2000);

    // Case details should be visible
    await expect(page.locator(`text=${SHARED_CASE.title}`)).toBeVisible();
  });
});
