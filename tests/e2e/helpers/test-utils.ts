import { Page, expect, APIRequestContext } from '@playwright/test';

// ─── Constants ─────────────────────────────────────────────────────────────────

export const BASE_URL = 'http://localhost:3000';
export const API_BASE = 'http://localhost:8000/api/v1';

export const TEST_ADMIN = {
  username: 'admin',
  password: 'admin123',
};

export const TEST_USERS = {
  admin: { username: 'admin', password: 'admin123' },
  // Additional test users - will be created during test setup
  detective: { username: 'test_detective_e2e', password: 'TestPass123!', email: 'detective_e2e@lapd.gov', phone_number: '5551000001', national_id: 'DET00001E2E', first_name: 'John', last_name: 'DetectiveE2E' },
  cadet: { username: 'test_cadet_e2e', password: 'TestPass123!', email: 'cadet_e2e@lapd.gov', phone_number: '5551000002', national_id: 'CAD00001E2E', first_name: 'Jane', last_name: 'CadetE2E' },
  officer: { username: 'test_officer_e2e', password: 'TestPass123!', email: 'officer_e2e@lapd.gov', phone_number: '5551000003', national_id: 'OFF00001E2E', first_name: 'Bob', last_name: 'OfficerE2E' },
  captain: { username: 'test_captain_e2e', password: 'TestPass123!', email: 'captain_e2e@lapd.gov', phone_number: '5551000004', national_id: 'CAP00001E2E', first_name: 'Alice', last_name: 'CaptainE2E' },
  judge: { username: 'test_judge_e2e', password: 'TestPass123!', email: 'judge_e2e@lapd.gov', phone_number: '5551000005', national_id: 'JUD00001E2E', first_name: 'Mike', last_name: 'JudgeE2E' },
  sergeant: { username: 'test_sergeant_e2e', password: 'TestPass123!', email: 'sergeant_e2e@lapd.gov', phone_number: '5551000006', national_id: 'SGT00001E2E', first_name: 'Sara', last_name: 'SergeantE2E' },
  chief: { username: 'test_chief_e2e', password: 'TestPass123!', email: 'chief_e2e@lapd.gov', phone_number: '5551000007', national_id: 'CHF00001E2E', first_name: 'Tom', last_name: 'ChiefE2E' },
  forensic: { username: 'test_forensic_e2e', password: 'TestPass123!', email: 'forensic_e2e@lapd.gov', phone_number: '5551000008', national_id: 'FOR00001E2E', first_name: 'Lisa', last_name: 'ForensicE2E' },
  regular: { username: 'test_regular_e2e', password: 'TestPass123!', email: 'regular_e2e@lapd.gov', phone_number: '5551000009', national_id: 'REG00001E2E', first_name: 'Dave', last_name: 'RegularE2E' },
};

export const CASE_STATUSES = [
  'draft', 'cadet_review', 'officer_review', 'rejected', 'open',
  'under_investigation', 'suspects_identified', 'arrest_approved',
  'interrogation', 'trial_pending', 'closed',
] as const;

export const CRIME_LEVELS = [
  { value: 0, label: 'Critical' },
  { value: 1, label: 'Major' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Minor' },
] as const;

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Login as a specific user.
 * 
 * Optimized for speed:
 * 1. If storageState provides admin auth and we want admin → skip login (instant)
 * 2. Otherwise, use fast API login (sets session cookie directly)
 * 3. Falls back to UI login only if API fails
 */
export async function loginAs(page: Page, username: string, password: string): Promise<void> {
  // For non-admin users, clear existing cookies (storageState provides admin)
  if (username !== TEST_ADMIN.username) {
    await page.context().clearCookies();
  } else {
    // Admin: check if already authed via storageState (check for logout button, not just URL)
    try {
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      // Verify ACTUAL authentication by checking for logout button (only visible when authed)
      await page.waitForSelector('button.btn-logout', { timeout: 3000 });
      return; // Already logged in as admin
    } catch {
      // Not authed, continue to login
    }
  }

  // UI login (works regardless of storageState/CSRF state)
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { state: 'visible', timeout: 5000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Login via API directly (fastest - skips UI entirely)
 */
export async function loginViaAPI(page: Page, username: string, password: string): Promise<void> {
  const response = await page.request.post(`${API_BASE}/accounts/login/`, {
    data: { username, password },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.ok()).toBeTruthy();
}

/**
 * Block heavy resources (fonts, media) to speed up page loads.
 * CSS is kept because it affects element visibility which tests check.
 * Call this in beforeEach for resource-heavy test suites.
 */
export async function blockHeavyResources(page: Page): Promise<void> {
  await page.route(/\.(woff2?|ttf|eot|otf|mp4|webm|ogg|mp3|wav)(\?.*)?$/i, route => route.abort());
  await page.route(/fonts\.googleapis\.com|fonts\.gstatic\.com/i, route => route.abort());
}

/**
 * Logout via the UI
 */
export async function logout(page: Page): Promise<void> {
  const logoutBtn = page.locator('button.btn-logout');
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await page.waitForURL('**/login', { timeout: 10000 });
  }
}

/**
 * Wait for loading to complete (skeleton/spinner disappears)
 */
export async function waitForLoading(page: Page): Promise<void> {
  // Wait for any skeleton loaders to disappear
  const skeleton = page.locator('.skeleton, .spinner, .loading');
  if (await skeleton.count() > 0) {
    await skeleton.first().waitFor({ state: 'hidden', timeout: 15000 });
  }
}

/**
 * Check if a notification appears with specific text
 */
export async function expectNotification(page: Page, text: string, type?: 'success' | 'error' | 'warning'): Promise<void> {
  const notification = page.locator('.notification').filter({ hasText: text });
  await expect(notification).toBeVisible({ timeout: 10000 });
  if (type) {
    await expect(notification).toHaveClass(new RegExp(type));
  }
}

/**
 * Navigate and wait for page load
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await waitForLoading(page);
}

/**
 * Fill a form field by label text
 */
export async function fillFormField(page: Page, label: string, value: string): Promise<void> {
  const field = page.locator(`label:has-text("${label}")`).locator('..').locator('input, textarea, select');
  await field.fill(value);
}

/**
 * Select an option from a dropdown by label
 */
export async function selectOption(page: Page, label: string, value: string): Promise<void> {
  const select = page.locator(`label:has-text("${label}")`).locator('..').locator('select');
  await select.selectOption(value);
}

/**
 * Assert a page has a specific title heading
 */
export async function expectPageTitle(page: Page, title: string): Promise<void> {
  await expect(page.locator('h1').first()).toContainText(title);
}

/**
 * Generate a unique test ID for dedup
 */
export function uniqueId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Create a mock complaint data set
 */
export function mockComplaintData() {
  const id = uniqueId('case');
  return {
    title: `Test Complaint ${id}`,
    description: `Detailed description for test complaint ${id}. This is a test case filed by automated E2E tests.`,
    crime_level: 2,
    complainant_statement: `I witnessed the incident on the evening of the test run. ${id}`,
  };
}

/**
 * Create a mock crime scene data set
 */
export function mockCrimeSceneData() {
  const id = uniqueId('scene');
  return {
    title: `Test Crime Scene ${id}`,
    description: `Crime scene discovered at test location. Evidence of forced entry. ${id}`,
    crime_level: 1,
    crime_scene_location: `123 Test Street, Los Angeles, CA ${id}`,
    crime_scene_datetime: new Date().toISOString().slice(0, 16),
    witnesses: [
      { full_name: 'Test Witness One', phone_number: '5559990001', national_id: 'WIT0001' },
    ],
  };
}

/**
 * Assert the page shows an empty state
 */
export async function expectEmptyState(page: Page, text?: string): Promise<void> {
  const emptyState = page.locator('.empty-state, .empty-state-title');
  await expect(emptyState.first()).toBeVisible();
  if (text) {
    await expect(emptyState.first()).toContainText(text);
  }
}

/**
 * Get the count of items in a list/grid
 */
export async function getItemCount(page: Page, selector: string): Promise<number> {
  await waitForLoading(page);
  return page.locator(selector).count();
}

/**
 * Intercept API calls to mock responses
 */
export async function mockAPIResponse(page: Page, urlPattern: string, response: object, status: number = 200): Promise<void> {
  await page.route(`**/api/v1/${urlPattern}`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Intercept API calls to simulate errors
 */
export async function mockAPIError(page: Page, urlPattern: string, status: number = 500, body?: object): Promise<void> {
  await page.route(`**/api/v1/${urlPattern}`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body || { detail: 'Internal Server Error' }),
    });
  });
}

/**
 * Wait for API response before continuing
 */
export async function waitForAPI(page: Page, urlPattern: string): Promise<void> {
  await page.waitForResponse((resp) => resp.url().includes(urlPattern));
}

/**
 * Check if element is disabled
 */
export async function expectDisabled(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeDisabled();
}

/**
 * Check if element is enabled
 */
export async function expectEnabled(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeEnabled();
}

/**
 * Take a screenshot with a descriptive name
 */
export async function captureScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `tests/e2e/screenshots/${name}.png`, fullPage: true });
}

/**
 * Check that the URL matches expected pattern
 */
export async function expectURL(page: Page, pattern: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(pattern));
}

/**
 * Register a user via the form
 */
export async function registerUser(page: Page, userData: {
  username: string;
  password: string;
  email: string;
  phone_number: string;
  national_id: string;
  first_name: string;
  last_name: string;
}): Promise<void> {
  await page.goto('/register');
  await page.fill('#first_name', userData.first_name);
  await page.fill('#last_name', userData.last_name);
  await page.fill('#national_id', userData.national_id);
  await page.fill('#email', userData.email);
  await page.fill('#phone_number', userData.phone_number);
  await page.fill('#username', userData.username);
  await page.fill('#password', userData.password);
  await page.fill('#confirm_password', userData.password);
  await page.click('button[type="submit"]');
}
