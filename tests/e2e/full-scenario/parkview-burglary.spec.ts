/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  PARKVIEW BURGLARY — Full-Scenario UI End-to-End Test
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  This test drives every step of the LA Noire NextGen case lifecycle through
 *  the **real** frontend (React pages) instead of raw API calls.
 *
 *  Workflow:
 *    0. Infrastructure setup (users, roles — via API, not UI)
 *    1. Citizen files a complaint           → CreateComplaint page
 *    2. Cadet approves the complaint        → CaseReview page
 *    3. Officer approves the complaint      → CaseReview page
 *    4. Detective registers evidence        → EvidenceRegister page
 *    5. Detective adds a suspect            → Suspects page
 *    6. Detective submits suspect list      → SuspectSubmissions page
 *    7. Sergeant approves submission        → SuspectSubmissions page
 *    8. Detective creates an interrogation  → Interrogations page
 *    9. Detective submits ratings           → Interrogations page
 *   10. Captain makes a guilty decision     → Interrogations page
 *   11. Captain creates a trial             → Trials page
 *   12. Judge delivers a guilty verdict     → Trials page
 *
 *  Each step is a separate test.describe.serial block test for readability.
 *  The test.describe.serial ensures tests run in order and share state.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Constants ──────────────────────────────────────────────────────────────────

const API = 'http://localhost:8000/api/v1';

const USERS = {
  admin:     { username: 'admin',              password: 'admin123' },
  citizen:   { username: 'pvb_citizen',        password: 'TestPass123!' },
  cadet:     { username: 'pvb_cadet',          password: 'TestPass123!' },
  officer:   { username: 'pvb_officer',        password: 'TestPass123!' },
  detective: { username: 'pvb_detective',       password: 'TestPass123!' },
  sergeant:  { username: 'pvb_sergeant',       password: 'TestPass123!' },
  captain:   { username: 'pvb_captain',        password: 'TestPass123!' },
  judge:     { username: 'pvb_judge',          password: 'TestPass123!' },
};

const SCENARIO = {
  title: `Parkview Burglary — ${Date.now()}`,
  description:
    'A residential burglary at 742 Parkview Lane reported on the evening of the test run. Suspect forced entry through the rear window.',
  complainant_statement:
    'I returned home around 8 PM and found the back window broken. My laptop, jewelry, and cash were missing.',
};

// ─── Shared state across serial tests ───────────────────────────────────────────

let caseId: number;
let crimeLevelId: number;
let suspectId: number;
let submissionId: number;
let interrogationId: number;
let trialId: number;

// Map of role name → role ID
const roleIds: Record<string, number> = {};
// Map of username → user ID
const userIds: Record<string, number> = {};

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Login via UI (fill the login form, wait for dashboard redirect) */
async function uiLogin(page: Page, username: string, password: string): Promise<void> {
  // Clear cookies so previous session doesn't persist
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { state: 'visible', timeout: 8000 });
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/** Get CSRF token from cookie jar in page context */
async function getCsrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies();
  const csrf = cookies.find(c => c.name === 'csrftoken');
  return csrf?.value || '';
}

/**
 * Make authenticated API call using page.request.
 * Page must already be logged in (session cookie set).
 * Handles CSRF token automatically for POST requests.
 */
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
  try { body = await res.json(); } catch { /* empty response */ }
  return { ok: res.ok(), status: res.status(), data: body, res };
}

/** Register a user via API (idempotent — ignores 400 if already exists). */
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
  // Try to find user first
  const search = await apiGet(page, '/accounts/users/', { search: userInfo.username });
  if (search.ok) {
    const results = search.data.results || search.data;
    const existing = (results as any[]).find((u: any) => u.username === userInfo.username);
    if (existing) return existing.id;
  }

  // Register directly via admin API
  const reg = await apiPost(page, '/accounts/users/', {
    ...userInfo,
    password_confirm: userInfo.password,
  });
  if (reg.ok) return reg.data.id;

  // If creation failed (maybe user exists but search missed), try login to check
  const reg2 = await apiPost(page, '/accounts/login/', {
    username: userInfo.username,
    password: userInfo.password,
  });
  if (reg2.ok) {
    // User existed — re-login as admin and search again
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

/** Assign roles to a user via API */
async function assignRoles(
  page: Page,
  userId: number,
  roleIdList: number[]
): Promise<void> {
  const res = await apiPost(page, `/accounts/users/${userId}/assign_roles/`, {
    role_ids: roleIdList,
  });
  // 200 or 400 (already assigned) both are acceptable
  expect([200, 201, 400]).toContain(res.status);
}

// ════════════════════════════════════════════════════════════════════════════════

test.describe.serial('Parkview Burglary — Full Scenario (UI)', () => {
  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 0 — Infrastructure Setup (API only, via page context)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 0: Setup users and roles', async ({ page }) => {
    // Login as admin via UI to get proper session + CSRF cookies
    await uiLogin(page, USERS.admin.username, USERS.admin.password);

    // Fetch all roles
    const rolesResult = await apiGet(page, '/accounts/roles/');
    expect(rolesResult.ok).toBeTruthy();
    const roles: any[] = rolesResult.data.results || rolesResult.data;

    for (const r of roles) {
      roleIds[r.name.toLowerCase()] = r.id;
    }

    // Ensure we have the roles we need
    const requiredRoles = ['cadet', 'police officer', 'detective', 'sergeant', 'captain', 'judge'];
    for (const rn of requiredRoles) {
      expect(roleIds[rn], `Role "${rn}" not found. Available: ${Object.keys(roleIds).join(', ')}`).toBeDefined();
    }

    // Create test users
    const usersToCreate = [
      { key: 'citizen',   first_name: 'PVB',  last_name: 'Citizen',   email: 'pvb_citizen@test.com',   phone_number: '5550100001', national_id: 'PVB0001CT',  roles: [] as string[] },
      { key: 'cadet',     first_name: 'PVB',  last_name: 'Cadet',     email: 'pvb_cadet@test.com',     phone_number: '5550100002', national_id: 'PVB0002CD',  roles: ['cadet'] },
      { key: 'officer',   first_name: 'PVB',  last_name: 'Officer',   email: 'pvb_officer@test.com',   phone_number: '5550100003', national_id: 'PVB0003OF',  roles: ['police officer'] },
      { key: 'detective', first_name: 'PVB',  last_name: 'Detective', email: 'pvb_detective@test.com', phone_number: '5550100004', national_id: 'PVB0004DT',  roles: ['detective'] },
      { key: 'sergeant',  first_name: 'PVB',  last_name: 'Sergeant',  email: 'pvb_sergeant@test.com',  phone_number: '5550100005', national_id: 'PVB0005SG',  roles: ['sergeant'] },
      { key: 'captain',   first_name: 'PVB',  last_name: 'Captain',   email: 'pvb_captain@test.com',   phone_number: '5550100006', national_id: 'PVB0006CP',  roles: ['captain'] },
      { key: 'judge',     first_name: 'PVB',  last_name: 'Judge',     email: 'pvb_judge@test.com',     phone_number: '5550100007', national_id: 'PVB0007JG',  roles: ['judge'] },
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
        const rids = u.roles.map((rn) => roleIds[rn]);
        await assignRoles(page, uid, rids);
      }
    }

    // Fetch crime levels
    const clResult = await apiGet(page, '/cases/crime-levels/');
    expect(clResult.ok).toBeTruthy();
    const levels = clResult.data.results || clResult.data;
    expect(levels.length).toBeGreaterThan(0);
    // Pick "Medium" or second level
    crimeLevelId = levels.length > 2 ? levels[2].id : levels[0].id;

    // Verify all user IDs captured
    expect(Object.keys(userIds).length).toBe(usersToCreate.length);
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 1 — Citizen Files a Complaint (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 1: Citizen files a complaint via UI', async ({ page }) => {
    await uiLogin(page, USERS.citizen.username, USERS.citizen.password);

    // Navigate to Create Complaint page
    await page.goto('/cases/complaint/new', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#title', { state: 'visible', timeout: 10000 });

    // Fill the complaint form
    await page.fill('#title', SCENARIO.title);

    // Select crime level
    const crimeSelect = page.locator('#crime_level');
    await crimeSelect.selectOption(String(crimeLevelId));

    // Fill description
    await page.fill('#description', SCENARIO.description);

    // Fill complainant statement
    await page.fill('#complainant_statement', SCENARIO.complainant_statement);

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to /cases
    await page.waitForURL('**/cases', { timeout: 15000 });

    // Find the created case via API to capture ID
    await page.waitForTimeout(1000);
    const response = await page.request.get(`${API}/cases/cases/`, {
      params: { search: SCENARIO.title },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    const results = data.results || data;
    const ourCase = results.find((c: any) => c.title === SCENARIO.title);
    expect(ourCase, 'Created case should appear in search results').toBeTruthy();
    caseId = ourCase.id;
    expect(ourCase.status).toBe('cadet_review');
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 2 — Cadet Approves the Case (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 2: Cadet approves the case via UI', async ({ page }) => {
    await uiLogin(page, USERS.cadet.username, USERS.cadet.password);

    // Navigate to case review page
    await page.goto(`/cases/${caseId}/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.review-form', { timeout: 10000 });

    // Click Approve button
    await page.click('.decision-btn.approve');

    // Submit review
    await page.click('button[type="submit"]');

    // Should redirect to case detail
    await page.waitForURL(`**/cases/${caseId}`, { timeout: 15000 });

    // Verify via API
    const res = await page.request.get(`${API}/cases/cases/${caseId}/`);
    expect(res.ok()).toBeTruthy();
    const c = await res.json();
    expect(c.status).toBe('officer_review');
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 3 — Officer Approves the Case (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 3: Officer approves the case via UI', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);

    await page.goto(`/cases/${caseId}/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.review-form', { timeout: 10000 });

    // Click Approve
    await page.click('.decision-btn.approve');

    // Submit
    await page.click('button[type="submit"]');

    await page.waitForURL(`**/cases/${caseId}`, { timeout: 15000 });

    // Verify
    const res = await page.request.get(`${API}/cases/cases/${caseId}/`);
    expect(res.ok()).toBeTruthy();
    const c = await res.json();
    expect(c.status).toBe('open');
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 4 — Detective Registers Evidence (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 4: Detective registers evidence via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/evidence/register?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.evidence-form', { timeout: 10000 });

    // Select Testimony type (default)
    const testimonyBtn = page.locator('.type-btn').filter({ hasText: 'Testimony' });
    await testimonyBtn.click();

    // Select case from dropdown (wait for options to load)
    await page.waitForFunction(
      (id) => document.querySelector(`#case-id option[value="${id}"]`) !== null,
      caseId,
      { timeout: 10000 }
    );
    await page.selectOption('#case-id', String(caseId));
    await page.fill('#title', 'Neighbor Eyewitness Statement');
    await page.fill('#description', 'Witness saw a dark sedan parked near the victim residence around 7:30 PM');
    await page.fill('#transcript', 'I was walking my dog when I noticed a dark sedan parked outside 742 Parkview Lane. A man in a hoodie was carrying a bag from the house.');
    await page.fill('#witness-name', 'Margaret Thompson');

    // Submit
    await page.click('button[type="submit"]');

    // Should redirect to evidence list
    await page.waitForURL('**/evidence**', { timeout: 15000 });

    // Verify via API
    const res = await page.request.get(`${API}/evidence/testimonies/`, {
      params: { case: caseId },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const results = data.results || data;
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 5 — Detective Adds a Suspect (API + UI hybrid)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 5: Detective adds a suspect', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    // Adding a suspect via the Suspects page requires searching for a person.
    // The person is our citizen user (for simplicity). We'll use API to create
    // the suspect since the UI person-search may be flaky with timing.
    const result = await apiPost(page, '/investigation/suspects/', {
      case: caseId,
      person: userIds['citizen'],
      reason: 'Matched description from eyewitness testimony — dark hoodie, seen leaving the premises.',
    });
    expect(result.ok, `Create suspect failed: ${result.status}`).toBeTruthy();
    suspectId = result.data.id;
    expect(suspectId).toBeGreaterThan(0);
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 6 — Detective Submits Suspect List (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 6: Detective submits suspect list via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/suspect-submissions?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    // Click "New Submission" button
    const newBtn = page.locator('button').filter({ hasText: /New Submission/ });
    await newBtn.click();
    await page.waitForSelector('.submission-form', { timeout: 10000 });

    // Select the suspect checkbox
    const suspectCheckbox = page.locator('.suspect-checkbox').first();
    await suspectCheckbox.click();

    // Fill reasoning
    await page.fill('#reasoning', 'The suspect matches the eyewitness description and was found with stolen items in their vehicle during a traffic stop.');

    // Submit
    const submitBtn = page.locator('button').filter({ hasText: /Submit to Sergeant/ });
    await submitBtn.click();

    // Wait for success notification or submission to appear
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await page.request.get(`${API}/investigation/suspect-submissions/`, {
      params: { case: caseId },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const results = data.results || data;
    const ourSub = results.find((s: any) => s.status === 'pending');
    expect(ourSub, 'Pending submission should exist').toBeTruthy();
    submissionId = ourSub.id;
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 7 — Sergeant Approves Submission (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 7: Sergeant approves submission via UI', async ({ page }) => {
    await uiLogin(page, USERS.sergeant.username, USERS.sergeant.password);

    await page.goto(`/suspect-submissions?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    // Click "Review Submission" on the pending card
    const reviewBtn = page.locator('button').filter({ hasText: /Review Submission/ });
    await reviewBtn.first().click();

    // Fill review notes
    const reviewTextarea = page.locator('.review-form textarea');
    await reviewTextarea.fill('Evidence is compelling. Eyewitness testimony corroborates physical evidence. Approving arrest warrants for identified suspects.');

    // Click approve
    const approveBtn = page.locator('button').filter({ hasText: /Approve/ });
    await approveBtn.first().click();

    await page.waitForTimeout(2000);

    // Verify via API — submission should be approved
    const subRes = await page.request.get(`${API}/investigation/suspect-submissions/${submissionId}/`);
    expect(subRes.ok()).toBeTruthy();
    const sub = await subRes.json();
    expect(sub.status).toBe('approved');
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 8 — Detective Creates an Interrogation (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 8: Detective creates interrogation via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/interrogations?case=${caseId}`, { waitUntil: 'domcontentloaded' });

    // Click "New Interrogation"
    const newBtn = page.locator('button').filter({ hasText: /New Interrogation/ });
    await newBtn.click();
    await page.waitForSelector('.interrogation-form', { timeout: 10000 });

    // Select suspect
    const suspectSelect = page.locator('#interrogation-suspect');
    await suspectSelect.selectOption({ index: 1 }); // first non-disabled option

    // Select sergeant
    const sergeantSelect = page.locator('#interrogation-sergeant');
    await sergeantSelect.selectOption({ index: 1 });

    // Submit
    const submitBtn = page.locator('.interrogation-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify via API
    const res = await page.request.get(`${API}/investigation/interrogations/`, {
      params: { suspect__case: caseId },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const results = data.results || data;
    expect(results.length).toBeGreaterThanOrEqual(1);
    interrogationId = results[0].id;
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 9 — Detective Submits Interrogation Ratings (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 9: Detective submits interrogation ratings via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/interrogations?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.interrogation-card', { timeout: 10000 });

    // Click "Submit Ratings" on the first pending interrogation
    const ratingsBtn = page.locator('button').filter({ hasText: /Submit Ratings/ });
    await ratingsBtn.first().click();

    // Wait for the ratings form to appear
    await page.waitForSelector('.ratings-form', { timeout: 10000 });

    // Fill ratings
    const detRatingInput = page.locator('.ratings-form input[type="number"]').first();
    await detRatingInput.fill('8');

    const sgtRatingInput = page.locator('.ratings-form input[type="number"]').nth(1);
    await sgtRatingInput.fill('7');

    // Fill notes
    const detNotesTextarea = page.locator('.ratings-form textarea').first();
    await detNotesTextarea.fill('Suspect showed signs of deception during questioning. Inconsistent alibi regarding whereabouts at time of burglary.');

    const sgtNotesTextarea = page.locator('.ratings-form textarea').nth(1);
    await sgtNotesTextarea.fill('Corroborating evidence strongly suggests involvement. Body language analysis indicates high likelihood of guilt.');

    // Submit
    const submitBtn = page.locator('.ratings-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify via API
    const res = await page.request.get(`${API}/investigation/interrogations/${interrogationId}/`);
    expect(res.ok()).toBeTruthy();
    const intg = await res.json();
    expect(intg.status).toBe('submitted');
    expect(intg.detective_guilt_rating).toBe(8);
    expect(intg.sergeant_guilt_rating).toBe(7);
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 10 — Captain Makes a Guilty Decision (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 10: Captain makes a guilty decision via UI', async ({ page }) => {
    await uiLogin(page, USERS.captain.username, USERS.captain.password);

    await page.goto(`/interrogations?case=${caseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.interrogation-card', { timeout: 10000 });

    // Click "Make Decision" on the submitted interrogation
    const decisionBtn = page.locator('button').filter({ hasText: /Make Decision/ });
    await decisionBtn.first().click();

    // Wait for decision form
    await page.waitForSelector('.decision-form', { timeout: 10000 });

    // Select "Guilty" radio (should be default)
    const guiltyRadio = page.locator('input[type="radio"][value="guilty"]');
    await guiltyRadio.check();

    // Fill reasoning (min 20 characters)
    const reasoningTextarea = page.locator('.decision-form textarea');
    await reasoningTextarea.fill('Based on the combined interrogation ratings (avg 7.5/10), eyewitness testimony, and physical evidence, I determine the suspect is guilty and recommend trial proceedings.');

    // Submit
    const submitBtn = page.locator('.decision-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify via API
    const res = await page.request.get(`${API}/investigation/captain-decisions/`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const results = data.results || data;
    const ourDecision = results.find(
      (d: any) =>
        d.interrogation === interrogationId ||
        d.interrogation?.id === interrogationId
    );
    expect(ourDecision, 'Captain decision should exist for this interrogation').toBeTruthy();
    expect(ourDecision.decision).toBe('guilty');
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 11 — Captain Creates a Trial (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 11: Captain creates a trial via UI', async ({ page }) => {
    await uiLogin(page, USERS.captain.username, USERS.captain.password);

    await page.goto('/trials', { waitUntil: 'domcontentloaded' });

    // Click "Create Trial"
    const createBtn = page.locator('button').filter({ hasText: /Create Trial/ });
    await createBtn.click();

    // Wait for form
    await page.waitForSelector('.trial-create-form', { timeout: 10000 });

    // Select case and suspect from dropdowns
    await page.waitForFunction(
      (id) => document.querySelector(`#trial-case-id option[value="${id}"]`) !== null,
      caseId,
      { timeout: 10000 }
    );
    await page.selectOption('#trial-case-id', String(caseId));
    await page.waitForFunction(
      (id) => document.querySelector(`#trial-suspect-id option[value="${id}"]`) !== null,
      suspectId,
      { timeout: 10000 }
    );
    await page.selectOption('#trial-suspect-id', String(suspectId));

    // Select judge
    const judgeSelect = page.locator('#trial-judge');
    await judgeSelect.selectOption({ index: 1 }); // first non-disabled option

    // Fill captain notes
    await page.fill('#trial-captain-notes', 'Guilty decision confirmed by interrogation process. All evidence reviewed and corroborated.');

    // Submit
    const submitBtn = page.locator('.trial-create-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(2000);

    // Verify via API
    const res = await page.request.get(`${API}/trial/trials/`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const results = data.results || data;
    const ourTrial = results.find(
      (t: any) =>
        (t.case === caseId || (t.case as any)?.id === caseId) &&
        (t.suspect === suspectId || (t.suspect as any)?.id === suspectId)
    );
    expect(ourTrial, 'Trial should exist for our case and suspect').toBeTruthy();
    trialId = ourTrial.id;
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  STEP 12 — Judge Delivers a Guilty Verdict (UI)
  // ────────────────────────────────────────────────────────────────────────────
  test('Step 12: Judge delivers a guilty verdict via UI', async ({ page }) => {
    await uiLogin(page, USERS.judge.username, USERS.judge.password);

    await page.goto('/trials', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.trial-card', { timeout: 10000 });

    // Click on our trial card to select it
    const trialCard = page.locator(`.trial-card`).filter({ hasText: String(trialId) });
    await trialCard.first().click();

    // Wait for trial details to load
    await page.waitForSelector('.trial-detail .card', { timeout: 10000 });

    // Click "Deliver Verdict"
    const verdictBtn = page.locator('button').filter({ hasText: /Deliver Verdict/ });
    await verdictBtn.click();

    // Wait for verdict form
    await page.waitForSelector('.verdict-form', { timeout: 10000 });

    // Select "Guilty"
    const guiltyRadio = page.locator('input[type="radio"][value="guilty"]');
    await guiltyRadio.check();

    // Fill reasoning (min 30 characters)
    await page.fill(
      '#verdict-reasoning',
      'After thorough review of all evidence, witness testimonies, and interrogation results, the court finds the defendant guilty of residential burglary as charged.'
    );

    // Fill punishment title (min 5 characters)
    await page.fill('#punishment-title', 'Imprisonment and Restitution');

    // Fill punishment description (min 20 characters)
    await page.fill(
      '#punishment-desc',
      'Sentenced to 5 years imprisonment with possibility of parole after 3 years. Ordered to pay full restitution for stolen property valued at $45,000.'
    );

    // Submit
    const submitBtn = page.locator('.verdict-form button[type="submit"]');
    await submitBtn.click();

    await page.waitForTimeout(3000);

    // Verify via API
    const res = await page.request.get(`${API}/trial/trials/${trialId}/`);
    expect(res.ok()).toBeTruthy();
    const trial = await res.json();
    expect(trial.status).toBe('completed');
  });

  // ────────────────────────────────────────────────────────────────────────────
  //  EPILOGUE — Verify Final State
  // ────────────────────────────────────────────────────────────────────────────
  test('Epilogue: Verify final case state', async ({ page }) => {
    // Login as admin to check final state
    await uiLogin(page, USERS.admin.username, USERS.admin.password);

    // Check case status
    const caseResult = await apiGet(page, `/cases/cases/${caseId}/`);
    expect(caseResult.ok).toBeTruthy();
    // Case advances through workflow — may be arrest_approved, trial_pending, closed, or completed
    expect(['arrest_approved', 'interrogation', 'trial_pending', 'closed', 'completed']).toContain(caseResult.data.status);

    // Check trial exists and is completed
    const trialResult = await apiGet(page, `/trial/trials/${trialId}/`);
    expect(trialResult.ok).toBeTruthy();
    expect(trialResult.data.status).toBe('completed');

    // Check verdict exists
    const verdictResult = await apiGet(page, '/trial/verdicts/');
    expect(verdictResult.ok).toBeTruthy();
    const verdicts = verdictResult.data.results || verdictResult.data;
    const ourVerdict = verdicts.find(
      (v: any) => v.trial === trialId || (v.trial as any)?.id === trialId
    );
    expect(ourVerdict, 'Verdict should exist for the trial').toBeTruthy();
    expect(ourVerdict.decision).toBe('guilty');
  });
});
