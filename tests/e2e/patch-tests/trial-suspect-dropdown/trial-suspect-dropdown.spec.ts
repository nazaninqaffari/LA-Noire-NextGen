/**
 * Patch Test: Trial Suspect Dropdown (Bug 5)
 *
 * Bug: Trial creation form had raw number inputs for Case ID and Suspect ID.
 * Fix: Both Case ID and Suspect ID are now <select> dropdowns.
 * The suspect dropdown loads suspects dynamically when a case is selected,
 * and is disabled until a case is chosen.
 *
 * Verifies:
 * 1. Trials page loads correctly
 * 2. Trial create form uses a select for both case and suspect
 * 3. Suspect dropdown is disabled until a case is selected
 */
import { test, expect } from '@playwright/test';

test.describe('Patch: Trial Suspect Dropdown', () => {

  test('trials page loads without errors', async ({ page }) => {
    await page.goto('/trials', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const heading = page.locator('h1:has-text("Trial Records")');
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('trial create form uses select for case and suspect, not number inputs', async ({ page }) => {
    await page.goto('/trials', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Look for the Create Trial button (captain / admin)
    const createBtn = page.locator('button:has-text("Create Trial")');
    await expect(createBtn).toBeVisible({ timeout: 5000 });

    // Click create trial button
    await createBtn.click();
    await page.waitForTimeout(500);

    // The case field should be a <select>, not an <input type="number">
    const caseSelect = page.locator('#trial-case-id');
    await expect(caseSelect).toBeVisible();
    const caseTag = await caseSelect.evaluate(el => el.tagName.toLowerCase());
    expect(caseTag).toBe('select');

    // The suspect field should be a <select>, not an <input type="number">
    const suspectSelect = page.locator('#trial-suspect-id');
    await expect(suspectSelect).toBeVisible();
    const suspectTag = await suspectSelect.evaluate(el => el.tagName.toLowerCase());
    expect(suspectTag).toBe('select');

    // Suspect dropdown should be disabled since no case is selected
    await expect(suspectSelect).toBeDisabled();
  });
});
