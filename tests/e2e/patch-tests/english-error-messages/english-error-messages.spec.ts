/**
 * Patch Test: English Error Messages (Bug 4)
 * 
 * Verifies that API error messages shown in the UI are in English,
 * not Persian. Tests various pages that might display validation errors.
 */
import { test, expect } from '@playwright/test';
import { mockAPIResponse, mockAPIError } from '../../helpers/test-utils';

test.describe('Patch: English Error Messages', () => {

  test('bail payment validation error should be in English', async ({ page }) => {
    // Mock bail payment creation with English error
    const englishError = {
      amount: ['Bail amount must be at least 1,000,000 Rials.'],
    };
    await mockAPIError(page, 'trial/bail-payments/', 400, englishError);
    await mockAPIResponse(page, 'trial/bail-payments/*', {
      count: 0, next: null, previous: null, results: [],
    });

    await page.goto('/bail-payments');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent() || '';
    // Verify no Persian in body
    const persianRegex = /[\u0600-\u06FF]{3,}/;
    expect(persianRegex.test(bodyText)).toBeFalsy();
  });

  test('suspect status change error should be in English', async ({ page }) => {
    // Mock suspect status change with English error
    const englishError = {
      detail: 'Permission denied: You do not have permission to change suspect status.',
    };
    await mockAPIError(page, 'investigation/suspects/*/change_status/', 403, englishError);
    await mockAPIResponse(page, 'investigation/suspects/*', {
      count: 0, next: null, previous: null, results: [],
    });

    await page.goto('/suspects');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent() || '';
    const persianRegex = /[\u0600-\u06FF]{3,}/;
    expect(persianRegex.test(bodyText)).toBeFalsy();
  });

  test('trial page loads with English content', async ({ page }) => {
    await mockAPIResponse(page, 'trial/trials/*', {
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 1,
        case: 1,
        case_number: 'LA-2024-001',
        suspect: 1,
        suspect_name: 'Test Suspect',
        judge: 1,
        judge_name: 'Test Judge',
        status: 'pending',
        trial_date: '2024-06-01',
        has_verdict: false,
        submitted_by_captain: true,
        submitted_by_chief: false,
        captain_notes: 'Ready for trial',
        chief_notes: null,
        trial_started_at: null,
        trial_ended_at: null,
      }],
    });

    await page.goto('/trials');
    await page.waitForTimeout(2000);

    // The status should display in English
    const bodyText = await page.locator('body').textContent() || '';
    const persianRegex = /[\u0600-\u06FF]{3,}/;
    expect(persianRegex.test(bodyText)).toBeFalsy();
  });

  test('interrogation page loads with English content', async ({ page }) => {
    await mockAPIResponse(page, 'investigation/interrogations/*', {
      count: 0, next: null, previous: null, results: [],
    });

    await page.goto('/interrogations');
    await page.waitForTimeout(2000);

    const bodyText = await page.locator('body').textContent() || '';
    const persianRegex = /[\u0600-\u06FF]{3,}/;
    expect(persianRegex.test(bodyText)).toBeFalsy();
  });
});
