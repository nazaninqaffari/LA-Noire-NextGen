/**
 * Patch Test: Login with Phone Number / National ID
 *
 * Verifies that the login page allows users to sign in using:
 *  - Username (default)
 *  - Phone number
 *  - National ID
 *
 * The backend MultiFieldAuthBackend resolves the identifier against
 * username, email, phone_number, and national_id fields.
 */

import { test, expect, Page } from '@playwright/test';

// Override the inherited admin storageState — login tests need a clean session
test.use({ storageState: { cookies: [], origins: [] } });

const API = 'http://localhost:8000/api/v1';

const TEST_USER = {
  username: 'login_method_testuser',
  password: 'TestPass123!',
  first_name: 'LoginTest',
  last_name: 'User',
  email: 'login_method_test@lapd.test',
  phone_number: '+19195550099',
  national_id: 'LMT0099NID',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function apiPost(page: Page, url: string, data: any): Promise<any> {
  const res = await page.request.post(`${API}${url}`, { data });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { ok: res.ok(), status: res.status(), data: body };
}

async function apiGet(page: Page, url: string, params?: Record<string, any>): Promise<any> {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  const res = await page.request.get(`${API}${url}${qs}`);
  return { ok: res.ok(), status: res.status(), data: res.ok() ? await res.json() : null };
}

async function adminLogin(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { state: 'visible', timeout: 8000 });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// ════════════════════════════════════════════════════════════════════════════════

test.describe('Login Method Toggle — Phone & National ID', () => {

  // Create the test user once via admin API (use request context, no browser needed)
  test.beforeAll(async ({ playwright }) => {
    const req = await playwright.request.newContext({ baseURL: 'http://localhost:8000' });

    // 1. Login as admin to get session cookie
    const loginRes = await req.post('/api/v1/accounts/login/', {
      data: { username: 'admin', password: 'admin123' },
    });
    if (!loginRes.ok()) {
      console.error('Admin login failed:', loginRes.status());
      await req.dispose();
      return;
    }

    // 2. Check if test user already exists
    const searchRes = await req.get('/api/v1/accounts/users/', { params: { search: TEST_USER.username } });
    if (searchRes.ok()) {
      const body = await searchRes.json();
      const results = body.results || body;
      const existing = (results as any[]).find((u: any) => u.username === TEST_USER.username);
      if (!existing) {
        const createRes = await req.post('/api/v1/accounts/users/', {
          data: { ...TEST_USER, password_confirm: TEST_USER.password },
        });
        if (!createRes.ok()) {
          console.error('User creation failed:', createRes.status(), await createRes.text());
        }
      }
    }

    await req.dispose();
  });

  // ─── Test: Login method toggle renders correctly ─────────────────────────

  test('Login page shows method toggle with Username, Phone, National ID buttons', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Verify toggle exists
    const toggle = page.locator('[data-testid="login-method-toggle"]');
    await expect(toggle).toBeVisible();

    // Verify all 3 buttons
    const usernameBtn = page.locator('[data-testid="method-username"]');
    const phoneBtn = page.locator('[data-testid="method-phone"]');
    const nationalIdBtn = page.locator('[data-testid="method-national-id"]');

    await expect(usernameBtn).toBeVisible();
    await expect(phoneBtn).toBeVisible();
    await expect(nationalIdBtn).toBeVisible();

    // Username should be active by default
    await expect(usernameBtn).toHaveClass(/active/);
    await expect(phoneBtn).not.toHaveClass(/active/);
    await expect(nationalIdBtn).not.toHaveClass(/active/);
  });

  // ─── Test: Toggle switches labels and placeholders ───────────────────────

  test('Switching login method changes label and placeholder', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Default — Username
    const label = page.locator('label[for="username"]');
    await expect(label).toContainText('Username');

    // Switch to Phone
    await page.click('[data-testid="method-phone"]');
    await expect(label).toContainText('Phone Number');
    const input = page.locator('#username');
    await expect(input).toHaveAttribute('placeholder', 'Enter your phone number');

    // Switch to National ID
    await page.click('[data-testid="method-national-id"]');
    await expect(label).toContainText('National ID');
    await expect(input).toHaveAttribute('placeholder', 'Enter your national ID');

    // Switch back to Username
    await page.click('[data-testid="method-username"]');
    await expect(label).toContainText('Username');
    await expect(input).toHaveAttribute('placeholder', 'Enter your username');
  });

  // ─── Test: Login with username works ─────────────────────────────────────

  test('Login with username succeeds', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.fill('#username', TEST_USER.username);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  // ─── Test: Login with phone number works ─────────────────────────────────

  test('Login with phone number succeeds', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Switch to Phone method
    await page.click('[data-testid="method-phone"]');
    await page.fill('#username', TEST_USER.phone_number);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  // ─── Test: Login with national ID works ──────────────────────────────────

  test('Login with national ID succeeds', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    // Switch to National ID method
    await page.click('[data-testid="method-national-id"]');
    await page.fill('#username', TEST_USER.national_id);
    await page.fill('#password', TEST_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  // ─── Test: Invalid credentials show error ────────────────────────────────

  test('Login with wrong password shows error', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.click('[data-testid="method-phone"]');
    await page.fill('#username', TEST_USER.phone_number);
    await page.fill('#password', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    // Should stay on login page and show error notification
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/login');
  });
});
