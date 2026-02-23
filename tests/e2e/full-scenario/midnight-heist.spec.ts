/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  THE MIDNIGHT HEIST — Full-Scenario UI End-to-End Test
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  A daring jewelry heist at the Grand Bazaar. Security cameras caught a shadow
 *  slipping through the vents at 2:47 AM. Diamonds worth billions of rials are
 *  missing, and the clock is ticking...
 *
 *  This test drives EVERY step of the LA Noire NextGen case lifecycle through
 *  the real frontend — no mocked data, no fake API calls.
 *
 *  Workflow:
 *    0.  Infrastructure setup (users, roles — via API)
 *    1.  Citizen files a level-3 complaint          → CreateComplaint page
 *    2.  Cadet approves the complaint               → CaseReview page
 *    3.  Officer approves the complaint              → CaseReview page
 *    4.  Detective registers evidence                → EvidenceRegister page
 *    5.  Detective adds a suspect                    → API (hybrid)
 *    6.  Detective escalates suspect to most-wanted  → API change-status
 *    7.  Citizen submits a tip on most-wanted page   → MostWanted page
 *    8.  Officer reviews the tip (approve)           → TipReview page (API)
 *    9.  Detective reviews the tip (approve)         → TipReview page (API)
 *   10.  Detective submits suspect list              → SuspectSubmissions page
 *   11.  Sergeant approves submission                → SuspectSubmissions page
 *   12.  Detective creates an interrogation          → Interrogations page
 *   13.  Detective submits ratings                   → Interrogations page
 *   14.  Captain makes a guilty decision             → Interrogations page
 *   15.  Captain creates a trial                     → Trials page
 *   16.  Judge delivers a guilty verdict             → Trials page
 *   17.  Citizen requests bail (level 3 → pending)   → Bail page
 *   18.  Sergeant approves bail                      → BailApprovals page
 *   19.  Verify "Pay via Zarinpal" button exists     → Bail page (stop here)
 *
 *  Each step is a separate serial test for traceability.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Constants ──────────────────────────────────────────────────────────────────

const API = 'http://localhost:8000/api/v1';

const USERS = {
  admin:     { username: 'admin',               password: 'admin123' },
  citizen:   { username: 'mh_citizen',          password: 'TestPass123!' },
  cadet:     { username: 'mh_cadet',            password: 'TestPass123!' },
  officer:   { username: 'mh_officer',          password: 'TestPass123!' },
  detective: { username: 'mh_detective',        password: 'TestPass123!' },
  sergeant:  { username: 'mh_sergeant',         password: 'TestPass123!' },
  captain:   { username: 'mh_captain',          password: 'TestPass123!' },
  judge:     { username: 'mh_judge',            password: 'TestPass123!' },
};

const SCENARIO = {
  title: `Midnight Heist at Grand Bazaar — ${Date.now()}`,
  description:
    'A brazen jewelry heist at the Grand Bazaar. At 2:47 AM, a masked figure was captured on CCTV crawling through the ventilation system. ' +
    'The suspect disabled the alarm, cracked two display cases, and vanished with 14 diamond necklaces worth an estimated 50 billion rials.',
  complainant_statement:
    'I am the head of security at the Grand Bazaar. At approximately 3:12 AM, I received an automated alert from our backup motion sensors. ' +
    'When I arrived, I found the main display cases shattered and empty. The ventilation grate on the ceiling was hanging open.',
};

// ─── Shared state ───────────────────────────────────────────────────────────────

let caseId: number;
let crimeLevelId: number;
let suspectId: number;
let submissionId: number;
let interrogationId: number;
let trialId: number;
let tipId: number;
let bailId: number;

const roleIds: Record<string, number> = {};
const userIds: Record<string, number> = {};

// ─── Helpers ────────────────────────────────────────────────────────────────────

async function uiLogin(page: Page, username: string, password: string): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { state: 'visible', timeout: 8000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000, waitUntil: 'domcontentloaded' });
}

async function getCsrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find(c => c.name === 'csrftoken');
  return csrf?.value || '';
}

async function apiGet(page: Page, url: string, params?: Record<string, any>): Promise<any> {
  const queryString = params
    ? '?' + new URLSearchParams(params as Record<string, string>).toString()
    : '';
  const res = await page.request.get(`${API}${url}${queryString}`);
  return { ok: res.ok(), status: res.status(), data: res.ok() ? await res.json() : null, res };
}

async function apiPost(page: Page, url: string, data: any): Promise<any> {
  const csrf = await getCsrfToken(page);
  const res = await page.request.post(`${API}${url}`, {
    data,
    headers: csrf ? { 'X-CSRFToken': csrf } : {},
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty */ }
  return { ok: res.ok(), status: res.status(), data: body, res };
}

async function ensureUser(
  page: Page,
  userInfo: {
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    national_id: string;
  }
): Promise<number> {
  const search = await apiGet(page, '/accounts/users/', { search: userInfo.username });
  if (search.ok) {
    const results = search.data.results || search.data;
    const existing = (results as any[]).find((u: any) => u.username === userInfo.username);
    if (existing) return existing.id;
  }

  const reg = await apiPost(page, '/accounts/users/', {
    ...userInfo,
    password_confirm: userInfo.password,
  });
  if (reg.ok) return reg.data.id;

  // Fallback: login to verify existence
  const reg2 = await apiPost(page, '/accounts/login/', {
    username: userInfo.username,
    password: userInfo.password,
  });
  if (reg2.ok) {
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    const searchAgain = await apiGet(page, '/accounts/users/', { search: userInfo.username });
    if (searchAgain.ok) {
      const results = searchAgain.data.results || searchAgain.data;
      const u = (results as any[]).find((u: any) => u.username === userInfo.username);
      if (u) return u.id;
    }
  }

  throw new Error(`Could not create or find user ${userInfo.username}`);
}

async function assignRoles(page: Page, userId: number, roleIdList: number[]): Promise<void> {
  const res = await apiPost(page, `/accounts/users/${userId}/assign_roles/`, {
    role_ids: roleIdList,
  });
  expect([200, 201, 400]).toContain(res.status);
}

// ════════════════════════════════════════════════════════════════════════════════

test.describe.serial('The Midnight Heist — Full Scenario (UI)', () => {

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 0 — Infrastructure Setup
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 0: Setup users and roles', async ({ page }) => {
    await uiLogin(page, USERS.admin.username, USERS.admin.password);

    // Fetch roles
    const rolesResult = await apiGet(page, '/accounts/roles/');
    expect(rolesResult.ok).toBeTruthy();
    const roles: any[] = rolesResult.data.results || rolesResult.data;
    for (const r of roles) {
      roleIds[r.name.toLowerCase()] = r.id;
    }

    const requiredRoles = ['cadet', 'police officer', 'detective', 'sergeant', 'captain', 'judge'];
    for (const rn of requiredRoles) {
      expect(roleIds[rn], `Role "${rn}" missing. Available: ${Object.keys(roleIds).join(', ')}`).toBeDefined();
    }

    // Create users
    const usersToCreate = [
      { key: 'citizen',   first_name: 'Reza',    last_name: 'Mohammadi',  email: 'mh_citizen@test.com',   phone_number: '5551200001', national_id: 'MH0001CT', roles: [] as string[] },
      { key: 'cadet',     first_name: 'Parsa',   last_name: 'Kazemi',     email: 'mh_cadet@test.com',     phone_number: '5551200002', national_id: 'MH0002CD', roles: ['cadet'] },
      { key: 'officer',   first_name: 'Dariush', last_name: 'Bakhtiari',  email: 'mh_officer@test.com',   phone_number: '5551200003', national_id: 'MH0003OF', roles: ['police officer'] },
      { key: 'detective', first_name: 'Kaveh',   last_name: 'Pourshariati', email: 'mh_detective@test.com', phone_number: '5551200004', national_id: 'MH0004DT', roles: ['detective'] },
      { key: 'sergeant',  first_name: 'Bahram',  last_name: 'Ferdowsi',   email: 'mh_sergeant@test.com',  phone_number: '5551200005', national_id: 'MH0005SG', roles: ['sergeant'] },
      { key: 'captain',   first_name: 'Sohrab',  last_name: 'Shahnameh',  email: 'mh_captain@test.com',   phone_number: '5551200006', national_id: 'MH0006CP', roles: ['captain'] },
      { key: 'judge',     first_name: 'Farhad',  last_name: 'Adlkhah',    email: 'mh_judge@test.com',     phone_number: '5551200007', national_id: 'MH0007JG', roles: ['judge'] },
    ];

    for (const u of usersToCreate) {
      const uid = await ensureUser(page, {
        username: (USERS as any)[u.key].username,
        password: (USERS as any)[u.key].password,
        first_name: u.first_name,
        last_name: u.last_name,
        email: u.email,
        phone_number: u.phone_number,
        national_id: u.national_id,
      });
      userIds[u.key] = uid;

      if (u.roles.length > 0) {
        const rids = u.roles.map(rn => roleIds[rn]);
        await assignRoles(page, uid, rids);
      }
    }

    // Fetch crime levels — pick Level 3 (Minor)
    const clResult = await apiGet(page, '/cases/crime-levels/');
    expect(clResult.ok).toBeTruthy();
    const levels: any[] = clResult.data.results || clResult.data;
    expect(levels.length).toBeGreaterThan(0);

    // Find level 3 specifically
    const level3 = levels.find((l: any) => l.level === 3);
    crimeLevelId = level3 ? level3.id : levels[levels.length - 1].id;

    expect(Object.keys(userIds).length).toBe(usersToCreate.length);
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 1 — Citizen Files a Level-3 Complaint (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 1: Citizen files a level-3 complaint via UI', async ({ page }) => {
    await uiLogin(page, USERS.citizen.username, USERS.citizen.password);

    await page.goto('/cases/complaint/new', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#title', { state: 'visible', timeout: 10000 });

    await page.fill('#title', SCENARIO.title);
    await page.locator('#crime_level').selectOption(String(crimeLevelId));
    await page.fill('#description', SCENARIO.description);
    await page.fill('#complainant_statement', SCENARIO.complainant_statement);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/cases', { timeout: 15000 });

    // Find created case
    await page.waitForTimeout(1000);
    const searchRes = await apiGet(page, '/cases/cases/', { search: SCENARIO.title.substring(0, 30) });
    // Citizen might not have access to /cases/cases, so try admin
    if (!searchRes.ok || !(searchRes.data?.results || searchRes.data)?.length) {
      await uiLogin(page, USERS.admin.username, USERS.admin.password);
      const adminSearch = await apiGet(page, '/cases/cases/', { search: SCENARIO.title.substring(0, 30) });
      expect(adminSearch.ok).toBeTruthy();
      const results = adminSearch.data.results || adminSearch.data;
      const ourCase = results.find((c: any) => c.title === SCENARIO.title);
      expect(ourCase, 'Created case should appear in search results').toBeTruthy();
      caseId = ourCase.id;
      expect(ourCase.status).toBe('cadet_review');
    } else {
      const results = searchRes.data.results || searchRes.data;
      const ourCase = results.find((c: any) => c.title === SCENARIO.title);
      expect(ourCase).toBeTruthy();
      caseId = ourCase.id;
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 2 — Cadet Approves (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 2: Cadet approves the case via UI', async ({ page }) => {
    await uiLogin(page, USERS.cadet.username, USERS.cadet.password);

    await page.goto(`/cases/${caseId}/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.review-form', { timeout: 10000 });

    await page.click('.decision-btn.approve');
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/cases/${caseId}`, { timeout: 15000 });

    // Verify
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    const res = await apiGet(page, `/cases/cases/${caseId}/`);
    expect(res.ok).toBeTruthy();
    expect(res.data.status).toBe('officer_review');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 3 — Officer Approves (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 3: Officer approves the case via UI', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);

    await page.goto(`/cases/${caseId}/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.review-form', { timeout: 10000 });

    await page.click('.decision-btn.approve');
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/cases/${caseId}`, { timeout: 15000 });

    const res = await apiGet(page, `/cases/cases/${caseId}/`);
    expect(res.ok).toBeTruthy();
    expect(res.data.status).toBe('open');

    // Assign our detective to this case via Django admin (needed for detective_review later)
    // Use Django admin interface's change endpoint directly
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    const csrf = await getCsrfToken(page);
    // Go to Django admin to set the assigned_detective
    await page.goto(`http://localhost:8000/admin/cases/case/${caseId}/change/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    // Select detective in the assigned_detective dropdown
    const detSelect = page.locator('#id_assigned_detective');
    if (await detSelect.count() > 0) {
      await detSelect.selectOption(String(userIds['detective']));
      // Submit form
      await page.click('input[name="_save"]');
      await page.waitForTimeout(2000);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 4 — Detective Registers Evidence (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 4: Detective registers evidence via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/evidence/register?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.evidence-form', { timeout: 10000 });

    // Select Testimony type
    const testimonyBtn = page.locator('.type-btn').filter({ hasText: 'Testimony' });
    await testimonyBtn.click();

    // Select case
    await page.waitForFunction(
      (id) => document.querySelector(`#case-id option[value="${id}"]`) !== null,
      caseId,
      { timeout: 10000 }
    );
    await page.selectOption('#case-id', String(caseId));

    await page.fill('#title', 'Night Guard Witness Statement');
    await page.fill('#description', 'Guard from the neighboring shop saw a dark van parked behind the bazaar at 2:30 AM');
    await page.fill('#transcript', 'I was doing my nightly rounds when I saw a black van with no plates parked in the alley behind the Grand Bazaar. A person in dark clothes carried something heavy into the van around 3 AM.');
    await page.fill('#witness-name', 'Hassan Eftekhari');

    await page.click('button[type="submit"]');
    // Wait for navigation or success notification
    await page.waitForTimeout(3000);

    // Verify — use admin to ensure we can see evidence regardless of role filtering  
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    const res = await apiGet(page, '/evidence/testimonies/', { case: String(caseId) });
    expect(res.ok).toBeTruthy();
    const results = res.data.results || res.data;
    expect(results.length, `Expected at least 1 testimony for case ${caseId}, got ${results.length}`).toBeGreaterThanOrEqual(1);
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 5 — Detective Adds Suspect (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 5: Detective adds a suspect via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/suspects?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    // Click "Add Suspect" button
    const addBtn = page.locator('.add-suspect-btn');
    await addBtn.click();
    await page.waitForSelector('.add-suspect-form', { timeout: 10000 });

    // Search for the person (citizen user)
    await page.fill('#person-search', USERS.citizen.username);
    await page.waitForSelector('.person-results-dropdown', { timeout: 8000 });

    // Click the first matching person result
    const personItem = page.locator('.person-result-item').first();
    await personItem.click();
    await page.waitForSelector('.selected-person-badge', { timeout: 3000 });

    // Fill reason
    await page.fill('#suspect-reason', 'Matches build and gait pattern from CCTV footage. Was seen near the bazaar at 2 AM by the night guard.');

    // Submit
    await page.click('.add-suspect-form button[type="submit"]');
    await page.waitForTimeout(3000);

    // Verify via API
    const res = await apiGet(page, '/investigation/suspects/', { case: String(caseId) });
    expect(res.ok).toBeTruthy();
    const results = res.data.results || res.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
    suspectId = results[results.length - 1].id;
    expect(suspectId).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 6 — Detective Escalates Suspect to Most-Wanted (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 6: Detective escalates suspect to intensive_pursuit via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/suspects?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.suspect-card', { timeout: 10000 });

    // Find the status dropdown for our suspect and change it
    const statusSelect = page.locator(`[data-testid="status-select-${suspectId}"]`);
    await statusSelect.selectOption('intensive_pursuit');
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, `/investigation/suspects/${suspectId}/`);
    expect(res.ok).toBeTruthy();
    expect(res.data.status).toBe('intensive_pursuit');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 7 — Citizen Submits a Tip on Most-Wanted Page (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 7: Citizen submits a tip via Most Wanted page', async ({ page }) => {
    await uiLogin(page, USERS.citizen.username, USERS.citizen.password);

    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check our suspect appears on the most-wanted list
    const pageContent = await page.textContent('body');
    // The suspect's name should be on the page (from person_full_name)
    // Let's wait for content to load
    await page.waitForSelector('.wanted-card, .suspect-card, .card', { timeout: 10000 });

    // Click "Submit a Tip" button to open the form
    const tipBtn = page.locator('button').filter({ hasText: /Submit a Tip/ });
    await tipBtn.click();

    // Wait for tip form to appear
    await page.waitForSelector('.tip-form-card', { timeout: 5000 });

    // Select tip type — "suspect"
    await page.selectOption('#tip-type', 'suspect');

    // Select OUR specific suspect from dropdown (not just the first one)
    await page.waitForTimeout(500);
    const suspectSelect = page.locator('#tip-suspect');
    // Try to select by our suspectId value
    try {
      await suspectSelect.selectOption(String(suspectId));
    } catch {
      // Fallback: select by index if suspectId isn't an option value
      const suspectOptions = await suspectSelect.locator('option').all();
      if (suspectOptions.length > 1) {
        // Find option that contains our suspect's name (Reza Mohammadi)
        let found = false;
        for (let i = 1; i < suspectOptions.length; i++) {
          const text = await suspectOptions[i].textContent();
          if (text?.includes('Reza') || text?.includes('Mohammadi') || text?.includes('mh_citizen')) {
            await suspectSelect.selectOption({ index: i });
            found = true;
            break;
          }
        }
        if (!found) {
          // Last resort: pick last option (most recently created)
          await suspectSelect.selectOption({ index: suspectOptions.length - 1 });
        }
      }
    }

    // Fill tip information
    await page.fill('#tip-info', 'I saw someone matching the suspect description selling jewelry at the flea market near Vali-Asr square yesterday. He was wearing a grey hoodie and had a scar on his left cheek.');

    // Submit
    const submitBtn = page.locator('.tip-form-card button.btn-primary, .tip-form-card button[type="submit"]');
    await submitBtn.click();

    // Wait for success notification
    await page.waitForTimeout(2000);

    // Verify tip was created via API (login as officer to see it)
    await uiLogin(page, USERS.officer.username, USERS.officer.password);
    const tipsRes = await apiGet(page, '/investigation/tipoffs/');
    expect(tipsRes.ok).toBeTruthy();
    const tips = tipsRes.data.results || tipsRes.data;
    // Find our tip
    const ourTip = tips.find((t: any) =>
      t.information?.includes('flea market near Vali-Asr')
    );
    expect(ourTip, 'Tip should exist in the system').toBeTruthy();
    tipId = ourTip.id;
    expect(ourTip.status).toBe('pending');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 8 — Officer Reviews Tip (approve) via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 8: Officer reviews and approves the tip via UI', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);

    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-testid="tip-card-${tipId}"]`, { timeout: 10000 });

    // Click Approve button on our tip card
    const approveBtn = page.locator(`[data-testid="approve-tip-${tipId}"]`);
    await approveBtn.click();
    await page.waitForTimeout(2000);

    // Verify status changed
    const tipRes = await apiGet(page, `/investigation/tipoffs/${tipId}/`);
    expect(tipRes.ok).toBeTruthy();
    expect(tipRes.data.status).toBe('officer_approved');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 9 — Detective Reviews Tip (approve) via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 9: Detective reviews and approves the tip via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-testid="tip-card-${tipId}"]`, { timeout: 10000 });

    // Click Approve button on our tip card
    const approveBtn = page.locator(`[data-testid="approve-tip-${tipId}"]`);
    await approveBtn.click();
    await page.waitForTimeout(2000);

    // Verify status changed
    const tipRes = await apiGet(page, `/investigation/tipoffs/${tipId}/`);
    expect(tipRes.ok).toBeTruthy();
    expect(tipRes.data.status).toBe('approved');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 10 — Detective Submits Suspect List (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 10: Detective submits suspect list via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/suspect-submissions?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    const newBtn = page.locator('button').filter({ hasText: /New Submission/ });
    await newBtn.click();
    await page.waitForSelector('.submission-form', { timeout: 10000 });

    // Select the suspect checkbox
    const suspectCheckbox = page.locator('.suspect-checkbox').first();
    await suspectCheckbox.click();

    await page.fill('#reasoning', 'CCTV footage match confirmed by forensic analysis. Eyewitness corroborates. Citizen tip placed suspect at jewelry fence near Vali-Asr.');

    const submitBtn = page.locator('button').filter({ hasText: /Submit to Sergeant/ });
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, '/investigation/suspect-submissions/', { case: String(caseId) });
    expect(res.ok).toBeTruthy();
    const results = res.data.results || res.data;
    const ourSub = results.find((s: any) => s.status === 'pending');
    expect(ourSub, 'Pending submission should exist').toBeTruthy();
    submissionId = ourSub.id;
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 11 — Sergeant Approves Submission (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 11: Sergeant approves submission via UI', async ({ page }) => {
    await uiLogin(page, USERS.sergeant.username, USERS.sergeant.password);

    await page.goto(`/suspect-submissions?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    const reviewBtn = page.locator('button').filter({ hasText: /Review Submission/ });
    await reviewBtn.first().click();

    const reviewTextarea = page.locator('.review-form textarea');
    await reviewTextarea.fill('Evidence is overwhelming — CCTV match, eyewitness, and citizen tip. Arrest warrant authorized.');

    const approveBtn = page.locator('button').filter({ hasText: /Approve/ });
    await approveBtn.first().click();

    await page.waitForTimeout(2000);

    // Verify
    const subRes = await apiGet(page, `/investigation/suspect-submissions/${submissionId}/`);
    expect(subRes.ok).toBeTruthy();
    expect(subRes.data.status).toBe('approved');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 12 — Detective Creates Interrogation (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 12: Detective creates interrogation via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/interrogations?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    const newBtn = page.locator('button').filter({ hasText: /New Interrogation/ });
    await newBtn.click();
    await page.waitForSelector('.interrogation-form', { timeout: 10000 });

    // Select suspect
    const suspectSelect = page.locator('#interrogation-suspect');
    await suspectSelect.selectOption({ index: 1 });

    // Select sergeant
    const sergeantSelect = page.locator('#interrogation-sergeant');
    await sergeantSelect.selectOption({ index: 1 });

    const submitBtn = page.locator('.interrogation-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify
    const res = await apiGet(page, '/investigation/interrogations/', { suspect__case: String(caseId) });
    expect(res.ok).toBeTruthy();
    const results = res.data.results || res.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
    interrogationId = results[0].id;
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 13 — Detective Submits Ratings (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 13: Detective submits interrogation ratings via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/interrogations?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.interrogation-card', { timeout: 10000 });

    const ratingsBtn = page.locator('button').filter({ hasText: /Submit Ratings/ });
    await ratingsBtn.first().click();
    await page.waitForSelector('.ratings-form', { timeout: 10000 });

    // Fill ratings
    const detRating = page.locator('.ratings-form input[type="number"]').first();
    await detRating.fill('9');

    const sgtRating = page.locator('.ratings-form input[type="number"]').nth(1);
    await sgtRating.fill('8');

    // Fill notes
    const detNotes = page.locator('.ratings-form textarea').first();
    await detNotes.fill('Suspect broke down under questioning. Admitted to prior knowledge of the bazaar layout from a construction job last year. Tried to hide scratch marks on hands consistent with vent crawling.');

    const sgtNotes = page.locator('.ratings-form textarea').nth(1);
    await sgtNotes.fill('Physical evidence — cut marks on subject hands match vent grate metal. Tool marks on display cases match tools found in suspect vehicle. Guilt is clear.');

    const submitBtn = page.locator('.ratings-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify
    const res = await apiGet(page, `/investigation/interrogations/${interrogationId}/`);
    expect(res.ok).toBeTruthy();
    expect(res.data.status).toBe('submitted');
    expect(res.data.detective_guilt_rating).toBe(9);
    expect(res.data.sergeant_guilt_rating).toBe(8);
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 14 — Captain Makes Guilty Decision (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 14: Captain makes a guilty decision via UI', async ({ page }) => {
    await uiLogin(page, USERS.captain.username, USERS.captain.password);

    await page.goto(`/interrogations?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.interrogation-card', { timeout: 10000 });

    const decisionBtn = page.locator('button').filter({ hasText: /Make Decision/ });
    await decisionBtn.first().click();

    await page.waitForSelector('.decision-form', { timeout: 10000 });

    const guiltyRadio = page.locator('input[type="radio"][value="guilty"]');
    await guiltyRadio.check();

    const reasoning = page.locator('.decision-form textarea');
    await reasoning.fill('Both detective and sergeant returned high guilt ratings (9 and 8). Physical evidence, CCTV footage, eyewitness account, and citizen intelligence all converge on the suspect. Trial proceedings are warranted.');

    const submitBtn = page.locator('.decision-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify
    const res = await apiGet(page, '/investigation/captain-decisions/');
    expect(res.ok).toBeTruthy();
    const results = res.data.results || res.data;
    const ourDecision = results.find(
      (d: any) => d.interrogation === interrogationId || d.interrogation?.id === interrogationId
    );
    expect(ourDecision, 'Captain decision should exist').toBeTruthy();
    expect(ourDecision.decision).toBe('guilty');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 15 — Captain Creates Trial (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 15: Captain creates a trial via UI', async ({ page }) => {
    await uiLogin(page, USERS.captain.username, USERS.captain.password);

    await page.goto('/trials', { waitUntil: 'domcontentloaded' });

    const createBtn = page.locator('button').filter({ hasText: /Create Trial/ });
    await createBtn.click();

    await page.waitForSelector('.trial-create-form', { timeout: 10000 });

    // Select case
    await page.waitForFunction(
      (id) => document.querySelector(`#trial-case-id option[value="${id}"]`) !== null,
      caseId,
      { timeout: 10000 }
    );
    await page.selectOption('#trial-case-id', String(caseId));

    // Select suspect
    await page.waitForFunction(
      (id) => document.querySelector(`#trial-suspect-id option[value="${id}"]`) !== null,
      suspectId,
      { timeout: 10000 }
    );
    await page.selectOption('#trial-suspect-id', String(suspectId));

    // Select judge — pick the mh_judge created in Step 0
    const judgeSelect = page.locator('#trial-judge');
    await judgeSelect.selectOption(String(userIds['judge']));

    await page.fill('#trial-captain-notes', 'Guilty decision confirmed. All evidence reviewed. The midnight heist suspect is to face trial for grand larceny.');

    const submitBtn = page.locator('.trial-create-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify — query as admin to avoid queryset restrictions
    await page.context().clearCookies();
    await uiLogin(page, 'admin', 'admin123');
    const res = await apiGet(page, '/trial/trials/', { case: caseId });
    expect(res.ok).toBeTruthy();
    const results = res.data.results || res.data;
    const ourTrial = results.find(
      (t: any) =>
        (t.case === caseId || t.case?.id === caseId) &&
        (t.suspect === suspectId || t.suspect?.id === suspectId)
    );
    expect(ourTrial, 'Trial should exist for our case and suspect').toBeTruthy();
    trialId = ourTrial.id;
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 16 — Judge Delivers Guilty Verdict (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 16: Judge delivers a guilty verdict via UI', async ({ page }) => {
    await uiLogin(page, USERS.judge.username, USERS.judge.password);

    await page.goto('/trials', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.trial-card', { timeout: 10000 });

    // Click our trial card
    const trialCard = page.locator('.trial-card').filter({ hasText: String(trialId) });
    await trialCard.first().click();

    await page.waitForSelector('.trial-detail .card', { timeout: 10000 });

    const verdictBtn = page.locator('button').filter({ hasText: /Deliver Verdict/ });
    await verdictBtn.click();

    await page.waitForSelector('.verdict-form', { timeout: 10000 });

    const guiltyRadio = page.locator('input[type="radio"][value="guilty"]');
    await guiltyRadio.check();

    await page.fill(
      '#verdict-reasoning',
      'After thorough examination of all evidence — CCTV footage, night guard testimony, citizen intelligence, tool mark analysis, and the confession — ' +
      'this court finds the defendant guilty of grand larceny and breaking and entering at the Grand Bazaar.'
    );

    await page.fill('#punishment-title', 'Imprisonment with Bail Option');
    await page.fill(
      '#punishment-desc',
      'Sentenced to 8 years imprisonment. Eligible for bail pending appeal due to crime level classification (Level 3 — Minor). Bail amount set by court.'
    );

    const submitBtn = page.locator('.verdict-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(3000);

    // Verify
    const res = await apiGet(page, `/trial/trials/${trialId}/`);
    expect(res.ok).toBeTruthy();
    expect(res.data.status).toBe('completed');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 17 — Citizen Requests Bail (UI) — Level 3 → pending
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 17: Citizen requests bail via UI', async ({ page }) => {
    await uiLogin(page, USERS.citizen.username, USERS.citizen.password);

    await page.goto('/bail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Click "Request Bail" to show form
    const requestBtn = page.locator('button').filter({ hasText: /Request Bail/ });
    await requestBtn.click();

    // Wait for form
    await page.waitForSelector('.bail-form-card', { timeout: 5000 });

    // Select suspect — use the suspect ID from previous steps
    const suspectDropdown = page.locator('#bail-suspect');
    await page.waitForFunction(
      (id) => document.querySelector(`#bail-suspect option[value="${id}"]`) !== null,
      suspectId,
      { timeout: 10000 }
    );
    await suspectDropdown.selectOption(String(suspectId));

    // Fill amount (in rials)
    await page.fill('#bail-amount', '500000000');

    // Submit bail request
    const submitBtn = page.locator('.bail-form-card button[type="submit"], .bail-form-card button.btn-primary');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify bail was created — check via sergeant
    await uiLogin(page, USERS.sergeant.username, USERS.sergeant.password);
    const bailRes = await apiGet(page, '/trial/bail-payments/');
    expect(bailRes.ok).toBeTruthy();
    const bails = bailRes.data.results || bailRes.data;
    const ourBail = bails.find(
      (b: any) => b.suspect === suspectId || b.suspect?.id === suspectId
    );
    expect(ourBail, 'Bail payment should exist for our suspect').toBeTruthy();
    bailId = ourBail.id;
    // Level 3: should be pending (requires sergeant approval)
    expect(ourBail.status).toBe('pending');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 18 — Sergeant Approves Bail (UI)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 18: Sergeant approves bail via UI', async ({ page }) => {
    await uiLogin(page, USERS.sergeant.username, USERS.sergeant.password);

    await page.goto('/bail-approvals', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Find approve button for our bail
    const approveBtn = page.locator(`[data-testid="approve-bail-${bailId}"]`);
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
    } else {
      // Fallback: click the first visible approve button
      const anyApprove = page.locator('button.btn-success').filter({ hasText: /Approve/ });
      await anyApprove.first().click();
    }

    await page.waitForTimeout(2000);

    // Verify — bail should be approved now
    const bailRes = await apiGet(page, `/trial/bail-payments/${bailId}/`);
    expect(bailRes.ok).toBeTruthy();
    expect(bailRes.data.status).toBe('approved');
  });

  // ──────────────────────────────────────────────────────────────────────────
  //  STEP 19 — Verify "Pay via Zarinpal" Button Exists (STOP HERE)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 19: Verify Pay button exists on bail page (do NOT click)', async ({ page }) => {
    await uiLogin(page, USERS.citizen.username, USERS.citizen.password);

    await page.goto('/bail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Find our bail card with approved status and Pay button
    const payBtn = page.locator(`[data-testid="pay-bail-${bailId}"]`);
    if (await payBtn.isVisible()) {
      // Just verify it exists — DO NOT click
      expect(await payBtn.isVisible()).toBeTruthy();
      const btnText = await payBtn.textContent();
      expect(btnText).toContain('Zarinpal');
    } else {
      // Fallback: look for any pay button on the page
      const anyPayBtn = page.locator('.btn-success').filter({ hasText: /Zarinpal|Pay/ });
      const count = await anyPayBtn.count();
      expect(count, 'At least one Pay button should be visible on the bail page').toBeGreaterThanOrEqual(1);
    }

    // Final verification — the full scenario is complete!
    // Verify overall case state
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    const caseRes = await apiGet(page, `/cases/cases/${caseId}/`);
    expect(caseRes.ok).toBeTruthy();
    expect(
      ['arrest_approved', 'interrogation', 'trial_pending', 'closed', 'completed']
    ).toContain(caseRes.data.status);

    const trialRes = await apiGet(page, `/trial/trials/${trialId}/`);
    expect(trialRes.ok).toBeTruthy();
    expect(trialRes.data.status).toBe('completed');

    const bailRes = await apiGet(page, `/trial/bail-payments/${bailId}/`);
    expect(bailRes.ok).toBeTruthy();
    expect(bailRes.data.status).toBe('approved');
  });
});
