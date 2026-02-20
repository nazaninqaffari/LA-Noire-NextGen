/**
 * Patch Test: Menu Overflow Fix (Bug 3)
 *
 * Bug: Header nav items overflowed the screen when many nav links were shown
 * for roles with many permissions. Only mobile had flex-wrap; desktop had no
 * overflow handling.
 *
 * Fix: Added flex-wrap, reduced gap/padding on nav links for desktop, and
 * set max-width to prevent overflow.
 *
 * Verifies:
 * 1. Header nav wraps properly without horizontal overflow
 * 2. All nav links are visible and accessible
 */
import { test, expect } from '@playwright/test';

test.describe('Patch: Menu Overflow Fix', () => {

  test('header nav does not overflow horizontally', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check the header-nav element does not cause horizontal scroll
    const nav = page.locator('.header-nav');
    await expect(nav).toBeVisible();

    const navBox = await nav.boundingBox();
    const viewportSize = page.viewportSize();
    expect(navBox).not.toBeNull();
    expect(viewportSize).not.toBeNull();

    // Nav should not extend beyond the viewport width
    if (navBox && viewportSize) {
      expect(navBox.x + navBox.width).toBeLessThanOrEqual(viewportSize.width + 5); // 5px tolerance
    }
  });

  test('all nav links are visible', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const navLinks = page.locator('.header-nav .nav-link');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);

    // Verify each link is visible
    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      await expect(link).toBeVisible();
    }
  });

  test('header nav uses flex-wrap', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const nav = page.locator('.header-nav');
    const flexWrap = await nav.evaluate((el) => window.getComputedStyle(el).flexWrap);
    expect(flexWrap).toBe('wrap');
  });
});
