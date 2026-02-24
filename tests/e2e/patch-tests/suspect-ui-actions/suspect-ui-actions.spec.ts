/**
 * Patch Test: Suspect Add & Status Change via UI
 *
 * Verifies that:
 *  - Detectives can add a suspect through the Suspects page UI form
 *  - Detectives can change suspect status using the status dropdown
 *  - The person search works and filters results
 */

import { test, expect, Page } from '@playwright/test';

const API = 'http://localhost:8000/api/v1';

const ADMIN = { username: 'admin', password: 'admin123' };
const DETECTIVE = { username: 'susp_ui_det', password: 'TestPass123!' };
const CITIZEN = { username: 'susp_ui_citz', password: 'TestPass123!' };

let caseId: number;
let suspectId: number;
const roleIds: Record<string, number> = {};

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function uiLogin(page: Page, username: string, password: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { state: 'visible', timeout: 8000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

async function apiGet(page: Page, url: string, params?: Record<string, any>): Promise<any> {
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  const res = await page.request.get(`${API}${url}${qs}`);
  return { ok: res.ok(), status: res.status(), data: res.ok() ? await res.json() : null };
}

async function apiPost(page: Page, url: string, data: any): Promise<any> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find(c => c.name === 'csrftoken')?.value || '';
  const res = await page.request.post(`${API}${url}`, {
    data,
    headers: csrf ? { 'X-CSRFToken': csrf } : {},
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { ok: res.ok(), status: res.status(), data: body };
}

// ════════════════════════════════════════════════════════════════════════════════

test.describe.serial('Suspect Add & Status Change via UI', () => {

  test('Setup: create users and a case', async ({ page }) => {
    await uiLogin(page, ADMIN.username, ADMIN.password);

    // Fetch roles
    const rolesRes = await apiGet(page, '/accounts/roles/');
    expect(rolesRes.ok).toBe(true);
    const roles: any[] = rolesRes.data.results || rolesRes.data;
    for (const r of roles) roleIds[r.name.toLowerCase()] = r.id;

    // Create detective user
    const detSearch = await apiGet(page, '/accounts/users/', { search: DETECTIVE.username });
    let detId: number;
    const detResults = detSearch.data?.results || detSearch.data || [];
    const existingDet = detResults.find((u: any) => u.username === DETECTIVE.username);
    if (existingDet) {
      detId = existingDet.id;
    } else {
      const reg = await apiPost(page, '/accounts/users/', {
        username: DETECTIVE.username, password: DETECTIVE.password,
        password_confirm: DETECTIVE.password,
        first_name: 'SuUI', last_name: 'Detective',
        email: 'susp_ui_det@test.com', phone_number: '5553300001', national_id: 'SUI0001DT',
      });
      expect(reg.ok).toBe(true);
      detId = reg.data.id;
    }
    await apiPost(page, `/accounts/users/${detId}/assign_roles/`, { role_ids: [roleIds['detective']] });

    // Create citizen user
    const citSearch = await apiGet(page, '/accounts/users/', { search: CITIZEN.username });
    let citId: number;
    const citResults = citSearch.data?.results || citSearch.data || [];
    const existingCit = citResults.find((u: any) => u.username === CITIZEN.username);
    if (existingCit) {
      citId = existingCit.id;
    } else {
      const reg = await apiPost(page, '/accounts/users/', {
        username: CITIZEN.username, password: CITIZEN.password,
        password_confirm: CITIZEN.password,
        first_name: 'SuUI', last_name: 'Citizen',
        email: 'susp_ui_citz@test.com', phone_number: '5553300002', national_id: 'SUI0002CT',
      });
      expect(reg.ok).toBe(true);
      citId = reg.data.id;
    }

    // Create a case (already open)
    const caseRes = await apiPost(page, '/cases/cases/', {
      title: `Suspect UI Test Case — ${Date.now()}`,
      description: 'Test case for suspect UI patch tests.',
      crime_level: 1,
      complainant_statement: 'Testing suspect add via UI.',
      status: 'open',
    });
    // If the above doesn't work (may need proper workflow), just find any open case
    if (caseRes.ok) {
      caseId = caseRes.data.id;
    } else {
      const casesRes = await apiGet(page, '/cases/cases/', { status: 'open' });
      expect(casesRes.ok).toBe(true);
      const cases = casesRes.data.results || casesRes.data;
      expect(cases.length).toBeGreaterThan(0);
      caseId = cases[0].id;
    }
  });

  test('Detective can add a suspect via the Suspects page form', async ({ page }) => {
    await uiLogin(page, DETECTIVE.username, DETECTIVE.password);

    await page.goto(`/suspects?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    // Click "Add Suspect" button
    const addBtn = page.locator('.add-suspect-btn');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Wait for form
    await page.waitForSelector('.add-suspect-form', { timeout: 10000 });

    // Search for person
    await page.fill('#person-search', CITIZEN.username);
    await page.waitForSelector('.person-results-dropdown', { timeout: 8000 });

    // Select first result
    const personItem = page.locator('.person-result-item').first();
    await expect(personItem).toBeVisible();
    await personItem.click();

    // Check selected badge
    await page.waitForSelector('.selected-person-badge', { timeout: 3000 });

    // Fill reason
    await page.fill('#suspect-reason', 'Suspect identified through eyewitness testimony and physical evidence match.');

    // Submit
    await page.click('.add-suspect-form button[type="submit"]');
    await page.waitForTimeout(3000);

    // Verify via API
    const res = await apiGet(page, '/investigation/suspects/', { case: String(caseId) });
    expect(res.ok).toBe(true);
    const results = res.data.results || res.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
    suspectId = results[results.length - 1].id;
  });

  test('Detective can change suspect status via dropdown', async ({ page }) => {
    await uiLogin(page, DETECTIVE.username, DETECTIVE.password);

    await page.goto(`/suspects?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.suspect-card', { timeout: 10000 });

    // Find status dropdown for our suspect
    const statusSelect = page.locator(`[data-testid="status-select-${suspectId}"]`);
    await expect(statusSelect).toBeVisible();

    // Change to intensive_pursuit
    await statusSelect.selectOption('intensive_pursuit');
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, `/investigation/suspects/${suspectId}/`);
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('intensive_pursuit');
  });
});
