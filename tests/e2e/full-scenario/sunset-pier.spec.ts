/**
 * ════════════════════════════════════════════════════════════════════════════════
 *  FIRE AT SUNSET PIER — Full-Scenario UI End-to-End Test
 * ════════════════════════════════════════════════════════════════════════════════
 *
 *  A mysterious fire engulfs the warehouse at Sunset Pier. Multiple witnesses
 *  report a suspicious figure fleeing the scene. Firefighters find accelerant
 *  near the loading dock. The pier is a crime scene — and the case is public.
 *
 *  This test exercises the SCENE-BASED case workflow including:
 *  - Crime scene report by officer (public case)
 *  - Citizens joining the public case
 *  - Collaborative complaint with co-complainants
 *  - Navbar dropdown navigation
 *  - Bail restricted to police officers
 *  - Full case lifecycle through trial
 *
 *  Workflow:
 *    0.  Infrastructure setup (users, roles — via API)
 *    1.  Officer creates crime scene case           → CreateCrimeScene page
 *    2.  Officer approves the scene case             → CaseReview page (API)
 *    3.  Citizen browses public cases                → PublicCases page
 *    4.  Citizen joins the public case               → PublicCases page
 *    5.  Citizen files collaborative complaint       → CreateComplaint page
 *    6.  Cadet approves collaborative complaint      → CaseReview (API)
 *    7.  Officer approves collaborative complaint    → CaseReview (API)
 *    8.  Detective registers evidence (scene case)   → EvidenceRegister page
 *    9.  Detective adds a suspect                    → API
 *   10.  Detective escalates suspect to most-wanted  → API
 *   11.  Citizen submits a tip on most-wanted page   → MostWanted page
 *   12.  Officer reviews the tip (approve)           → API
 *   13.  Detective reviews the tip (approve)         → API
 *   14.  Detective submits suspect list              → SuspectSubmissions (API)
 *   15.  Sergeant approves submission                → SuspectSubmissions (API)
 *   16.  Detective creates an interrogation          → Interrogations page
 *   17.  Detective submits ratings                   → Interrogations (API)
 *   18.  Captain makes guilty decision               → Interrogations (API)
 *   19.  Captain creates a trial                     → Trials page
 *   20.  Judge delivers a guilty verdict             → Trials page
 *   21.  Bail request as citizen → blocked           → Bail page (verify 403)
 *   22.  Bail request as officer → allowed           → Bail page
 *   23.  Sergeant approves bail                      → BailApprovals page
 *   24.  Verify nav dropdowns work                   → Header dropdowns
 *
 *  Each step is a separate serial test for traceability.
 */

import { test, expect, Page } from '@playwright/test';

// ─── Constants ──────────────────────────────────────────────────────────────────

const API = 'http://localhost:8000/api/v1';

const USERS = {
  admin:     { username: 'admin',               password: 'admin123' },
  citizen1:  { username: 'sp_citizen1',         password: 'TestPass123!' },
  citizen2:  { username: 'sp_citizen2',         password: 'TestPass123!' },
  cadet:     { username: 'sp_cadet',            password: 'TestPass123!' },
  officer:   { username: 'sp_officer',          password: 'TestPass123!' },
  detective: { username: 'sp_detective',        password: 'TestPass123!' },
  sergeant:  { username: 'sp_sergeant',         password: 'TestPass123!' },
  captain:   { username: 'sp_captain',          password: 'TestPass123!' },
  judge:     { username: 'sp_judge',            password: 'TestPass123!' },
};

const SCENARIO = {
  sceneTitle: `Fire at Sunset Pier — ${Date.now()}`,
  sceneDescription:
    'At 11:42 PM a massive fire broke out at the warehouse complex on Sunset Pier. ' +
    'Multiple witnesses report a suspicious figure running toward the parking lot moments before ignition. ' +
    'Firefighters discovered traces of accelerant near the loading dock.',
  sceneLocation: 'Sunset Pier Warehouse #7, 400 Harbor Blvd, Los Angeles',
  complaintTitle: `Vandalism Spree on Elm Street — ${Date.now()}`,
  complaintDescription:
    'Multiple homes on Elm Street were vandalized overnight. ' +
    'Windows smashed, spray paint on walls, and garden fences torn down.',
  complaintStatement:
    'I woke up at 6 AM and found my front window shattered and graffiti sprayed across the garage door. ' +
    'My security camera captured two hooded figures at approximately 3:15 AM.',
  coComplainantStatement:
    'My mailbox was ripped off its post and my garden gnomes destroyed. ' +
    'I heard loud noises around 3 AM but was too scared to look outside.',
};

// ─── Shared state ───────────────────────────────────────────────────────────────

let sceneCaseId: number;
let complaintCaseId: number;
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
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
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
  const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
  const res = await page.request.get(`${API}${url}${qs}`);
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

async function apiPatch(page: Page, url: string, data: any): Promise<any> {
  const csrf = await getCsrfToken(page);
  const res = await page.request.patch(`${API}${url}`, {
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
    username: string; password: string; first_name: string; last_name: string;
    email: string; phone_number: string; national_id: string;
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
  expect(res.ok).toBe(true);
}

// ════════════════════════════════════════════════════════════════════════════════
//  T E S T   S U I T E
// ════════════════════════════════════════════════════════════════════════════════

test.describe.serial('Fire at Sunset Pier — Full Scene-Based Scenario', () => {

  // ──────────────────────────────────────────────────────────────────────────
  // Step 0: Infrastructure setup via API
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 0 — Setup users and roles', async ({ page }) => {
    await uiLogin(page, USERS.admin.username, USERS.admin.password);

    // Fetch roles
    const rolesRes = await apiGet(page, '/accounts/roles/');
    expect(rolesRes.ok).toBe(true);
    const roles: any[] = rolesRes.data.results || rolesRes.data;
    for (const r of roles) roleIds[r.name] = r.id;

    // Fetch crime levels
    const levelsRes = await apiGet(page, '/cases/crime-levels/');
    expect(levelsRes.ok).toBe(true);
    const levels: any[] = levelsRes.data.results || levelsRes.data;
    const level2 = levels.find((l: any) => l.level === 2);
    expect(level2).toBeTruthy();
    crimeLevelId = level2.id;

    // Create users
    const userDefs = [
      { ...USERS.citizen1, first_name: 'Rosa', last_name: 'Martinez', email: 'sp_c1@lapd.test', phone_number: '+19190010001', national_id: '7710010001' },
      { ...USERS.citizen2, first_name: 'Tom', last_name: 'Baker', email: 'sp_c2@lapd.test', phone_number: '+19190010002', national_id: '7710010002' },
      { ...USERS.cadet,    first_name: 'Billy', last_name: 'Wells', email: 'sp_cad@lapd.test', phone_number: '+19190010003', national_id: '7710010003' },
      { ...USERS.officer,  first_name: 'Frank', last_name: 'Harmon', email: 'sp_off@lapd.test', phone_number: '+19190010004', national_id: '7710010004' },
      { ...USERS.detective,first_name: 'Cole', last_name: 'Phelps', email: 'sp_det@lapd.test', phone_number: '+19190010005', national_id: '7710010005' },
      { ...USERS.sergeant, first_name: 'Hugo', last_name: 'Diaz', email: 'sp_sgt@lapd.test', phone_number: '+19190010006', national_id: '7710010006' },
      { ...USERS.captain,  first_name: 'Karen', last_name: 'Stone', email: 'sp_cap@lapd.test', phone_number: '+19190010007', national_id: '7710010007' },
      { ...USERS.judge,    first_name: 'Evelyn', last_name: 'Harper', email: 'sp_jdg@lapd.test', phone_number: '+19190010008', national_id: '7710010008' },
    ];

    for (const def of userDefs) {
      userIds[def.username] = await ensureUser(page, def);
    }

    // Assign roles
    await assignRoles(page, userIds[USERS.citizen1.username], [roleIds['Base User']]);
    await assignRoles(page, userIds[USERS.citizen2.username], [roleIds['Base User']]);
    await assignRoles(page, userIds[USERS.cadet.username], [roleIds['Cadet']]);
    await assignRoles(page, userIds[USERS.officer.username], [roleIds['Patrol Officer']]);
    await assignRoles(page, userIds[USERS.detective.username], [roleIds['Detective']]);
    await assignRoles(page, userIds[USERS.sergeant.username], [roleIds['Sergeant']]);
    await assignRoles(page, userIds[USERS.captain.username], [roleIds['Captain']]);
    await assignRoles(page, userIds[USERS.judge.username], [roleIds['Judge']]);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 1: Officer creates crime scene case
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 1 — Officer creates crime scene report', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);
    await page.goto('/cases/scene/new', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#title', { state: 'visible', timeout: 8000 });

    await page.fill('#title', SCENARIO.sceneTitle);
    await page.fill('#description', SCENARIO.sceneDescription);

    // Crime level defaults to '2' (Medium) in the form — leave as default
    // The form uses hardcoded option values 0-3 (level numbers), not API IDs

    await page.fill('#crime_scene_location', SCENARIO.sceneLocation);

    // Set crime scene datetime (today)
    const now = new Date();
    const dtVal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}T23:42`;
    await page.fill('#crime_scene_datetime', dtVal);

    await page.click('button[type="submit"]');

    // Wait for navigation back to cases
    await page.waitForURL('**/cases', { timeout: 15000 });

    // Verify via API
    const res = await apiGet(page, '/cases/cases/', { search: SCENARIO.sceneTitle });
    expect(res.ok).toBe(true);
    const match = (res.data.results || []).find((c: any) => c.title === SCENARIO.sceneTitle);
    expect(match).toBeTruthy();
    sceneCaseId = match.id;
    expect(match.formation_type).toBe('crime_scene');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 2: Officer approves the scene case via UI (CaseReview page)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 2 — Officer approves the crime scene case via UI', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);

    await page.goto(`/cases/${sceneCaseId}/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.review-form', { timeout: 10000 });

    // Click Approve decision button
    await page.click('.decision-btn.approve');
    // Submit review
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/cases/${sceneCaseId}`, { timeout: 15000 });

    // Verify via API
    const res = await apiGet(page, `/cases/cases/${sceneCaseId}/`);
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('open');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 3: Citizen browses public cases page
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 3 — Citizen browses public cases', async ({ page }) => {
    await uiLogin(page, USERS.citizen1.username, USERS.citizen1.password);
    await page.goto('/public-cases', { waitUntil: 'domcontentloaded' });

    // Wait for case cards to load
    await page.waitForSelector('[data-testid^="public-case-"]', { timeout: 10000 });

    // Should see the scene case
    const card = page.locator(`[data-testid="public-case-${sceneCaseId}"]`);
    await expect(card).toBeVisible();

    // Verify case title is displayed
    const titleText = await card.locator('.public-case-title').textContent();
    expect(titleText).toContain('Fire at Sunset Pier');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 4: Citizen joins the public case
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 4 — Citizen joins the public case as complainant', async ({ page }) => {
    await uiLogin(page, USERS.citizen1.username, USERS.citizen1.password);
    await page.goto('/public-cases', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-testid="public-case-${sceneCaseId}"]`, { timeout: 10000 });

    // Click join button
    const joinBtn = page.locator(`[data-testid="join-case-${sceneCaseId}"]`);
    await joinBtn.click();

    // Fill statement
    const textarea = page.locator(`[data-testid="join-statement-${sceneCaseId}"]`);
    await textarea.fill(
      'I live across from the pier and saw a man in a dark hoodie running toward a black sedan just before the fire started.'
    );

    // Confirm
    const confirmBtn = page.locator(`[data-testid="confirm-join-${sceneCaseId}"]`);
    await confirmBtn.click();

    // Wait for success notification
    await page.waitForSelector('.notification.success, .notification-success', { timeout: 8000 });

    // Verify via API
    const res = await apiGet(page, `/cases/cases/${sceneCaseId}/`);
    expect(res.ok).toBe(true);
    const complainants = res.data.complainants || [];
    const citizenComplainant = complainants.find(
      (c: any) => c.user === userIds[USERS.citizen1.username] || c.user_details?.id === userIds[USERS.citizen1.username]
    );
    expect(citizenComplainant).toBeTruthy();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 5: Citizen files collaborative complaint via UI (CreateComplaint page)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 5 — Citizen files collaborative complaint via UI', async ({ page }) => {
    await uiLogin(page, USERS.citizen1.username, USERS.citizen1.password);

    await page.goto('/cases/complaint/new', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#title', { state: 'visible', timeout: 10000 });

    // Fill complaint form
    await page.fill('#title', SCENARIO.complaintTitle);
    await page.locator('#crime_level').selectOption(String(crimeLevelId));
    await page.fill('#description', SCENARIO.complaintDescription);
    await page.fill('#complainant_statement', SCENARIO.complaintStatement);

    // Add co-complainant: search for citizen2
    await page.fill('#co-complainant-search', USERS.citizen2.username);
    await page.click('.co-complainant-section button.btn-secondary');
    await page.waitForSelector('[data-testid="user-search-results"]', { timeout: 8000 });

    // Select citizen2 from results
    const userRadio = page.locator('[data-testid="user-search-results"] input[type="radio"]').first();
    await userRadio.click();

    // Fill co-complainant statement
    await page.fill('#co-complainant-statement', SCENARIO.coComplainantStatement);

    // Click "Add Person" button
    const addPersonBtn = page.locator('.co-statement-row button.btn-primary, .co-complainant-section button.btn-primary').first();
    await addPersonBtn.click();
    await page.waitForTimeout(1000);

    // Verify co-complainant was added to list
    await page.waitForSelector('[data-testid="co-complainant-list"]', { timeout: 3000 });

    // Submit complaint
    await page.click('button[type="submit"]');
    await page.waitForURL('**/cases', { timeout: 15000 });

    // Verify via API
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    const searchRes = await apiGet(page, '/cases/cases/', { search: SCENARIO.complaintTitle.substring(0, 30) });
    expect(searchRes.ok).toBe(true);
    const results = searchRes.data.results || searchRes.data;
    const ourCase = results.find((c: any) => c.title === SCENARIO.complaintTitle);
    expect(ourCase).toBeTruthy();
    complaintCaseId = ourCase.id;
    expect(ourCase.formation_type).toBe('complaint');
    const complainants = ourCase.complainants || [];
    expect(complainants.length).toBe(2);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 6: Cadet approves collaborative complaint via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 6 — Cadet approves collaborative complaint via UI', async ({ page }) => {
    await uiLogin(page, USERS.cadet.username, USERS.cadet.password);

    await page.goto(`/cases/${complaintCaseId}/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.review-form', { timeout: 10000 });

    await page.click('.decision-btn.approve');
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/cases/${complaintCaseId}`, { timeout: 15000 });

    // Verify via API
    const res = await apiGet(page, `/cases/cases/${complaintCaseId}/`);
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('officer_review');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 7: Officer approves collaborative complaint via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 7 — Officer approves collaborative complaint via UI', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);

    await page.goto(`/cases/${complaintCaseId}/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.review-form', { timeout: 10000 });

    await page.click('.decision-btn.approve');
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/cases/${complaintCaseId}`, { timeout: 15000 });

    // Verify via API
    const res = await apiGet(page, `/cases/cases/${complaintCaseId}/`);
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('open');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 8: Detective registers evidence for the scene case
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 8 — Detective registers evidence', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    // Assign detective to scene case via admin
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    const patchRes = await apiPatch(page, `/cases/cases/${sceneCaseId}/`, {
      assigned_detective: userIds[USERS.detective.username],
      status: 'under_investigation',
    });
    expect(patchRes.ok).toBe(true);

    // Now log in as detective and register evidence
    await uiLogin(page, USERS.detective.username, USERS.detective.password);
    await page.goto('/evidence/register', { waitUntil: 'domcontentloaded' });

    // Fill evidence form
    await page.waitForSelector('.evidence-form', { timeout: 8000 });

    // Select evidence type via type button
    const bioBtn = page.locator('.type-btn').filter({ hasText: /Biological/i }).first();
    await bioBtn.click();

    // Select case
    await page.locator('#case-id').selectOption({ value: String(sceneCaseId) });

    // Fill title and description
    await page.fill('#title', 'Accelerant Sample — Sunset Pier Loading Dock');
    await page.fill('#description', 'Chemical accelerant residue collected near the loading dock entrance. Analysis pending.');

    await page.click('button[type="submit"]');
    await page.waitForSelector('.notification.success, .notification-success', { timeout: 10000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 9: Detective adds a suspect via UI (Suspects page)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 9 — Detective adds a suspect via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/suspects?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });

    // Click "Add Suspect" button
    const addBtn = page.locator('.add-suspect-btn');
    await addBtn.click();
    await page.waitForSelector('.add-suspect-form', { timeout: 10000 });

    // Search for the person (citizen2)
    await page.fill('#person-search', USERS.citizen2.username);
    await page.waitForSelector('.person-results-dropdown', { timeout: 8000 });

    // Click the first matching person result
    const personItem = page.locator('.person-result-item').first();
    await personItem.click();
    await page.waitForSelector('.selected-person-badge', { timeout: 3000 });

    // Fill reason
    await page.fill('#suspect-reason', 'Witness saw suspect fleeing Sunset Pier moments before fire. Matches hoodie description from multiple eyewitnesses.');

    // Submit
    await page.click('.add-suspect-form button[type="submit"]');
    await page.waitForTimeout(3000);

    // Verify via API
    const res = await apiGet(page, '/investigation/suspects/', { case: String(sceneCaseId) });
    expect(res.ok).toBe(true);
    const results = res.data.results || res.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
    suspectId = results[results.length - 1].id;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 10: Detective escalates suspect to most-wanted via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 10 — Detective escalates suspect to most-wanted via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/suspects?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.suspect-card', { timeout: 10000 });

    // Find the status dropdown for our suspect and change it
    const statusSelect = page.locator(`[data-testid="status-select-${suspectId}"]`);
    await statusSelect.selectOption('intensive_pursuit');
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, `/investigation/suspects/${suspectId}/`);
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('intensive_pursuit');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 11: Citizen submits a tip on most-wanted page
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 11 — Citizen submits a tip on most-wanted page', async ({ page }) => {
    await uiLogin(page, USERS.citizen1.username, USERS.citizen1.password);
    await page.goto('/most-wanted', { waitUntil: 'domcontentloaded' });

    // Wait for suspect cards
    await page.waitForSelector('.wanted-card', { timeout: 10000 });

    // Click the page-level "Submit a Tip" button
    const tipToggle = page.locator('button').filter({ hasText: /Submit a Tip/i }).first();
    await tipToggle.click();

    // Wait for tip form
    await page.waitForSelector('.tip-form-card', { timeout: 5000 });

    // Select tip type
    await page.locator('#tip-type').selectOption('suspect');

    // Select our suspect
    const suspectSelect = page.locator('#tip-suspect');
    await suspectSelect.waitFor({ state: 'visible', timeout: 3000 });
    // Try selecting by value, fallback to first option
    try {
      await suspectSelect.selectOption({ value: String(suspectId) });
    } catch {
      await suspectSelect.selectOption({ index: 1 });
    }

    // Fill tip info
    await page.fill('#tip-info',
      'I saw the suspect buying gasoline cans at the Shell station on Harbor Blvd at around 10 PM, about an hour before the fire.'
    );

    // Submit tip
    const submitBtn = page.locator('.tip-form-card button.btn-primary').first();
    await submitBtn.click();
    await page.waitForSelector('.notification.success, .notification-success', { timeout: 10000 });

    // Verify tip exists
    const tipsRes = await apiGet(page, '/investigation/tipoffs/', { suspect: String(suspectId) });
    if (tipsRes.ok) {
      const tips = tipsRes.data.results || tipsRes.data;
      if (tips.length > 0) {
        tipId = tips[tips.length - 1].id;
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 12: Officer reviews the tip (approve) via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 12 — Officer reviews and approves the tip via UI', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);

    if (!tipId) {
      const tipsRes = await apiGet(page, '/investigation/tipoffs/', { suspect: String(suspectId) });
      expect(tipsRes.ok).toBe(true);
      const tips = tipsRes.data.results || tipsRes.data;
      expect(tips.length).toBeGreaterThan(0);
      tipId = tips[tips.length - 1].id;
    }

    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-testid="tip-card-${tipId}"]`, { timeout: 10000 });

    // Click Approve button on our tip card
    const approveBtn = page.locator(`[data-testid="approve-tip-${tipId}"]`);
    await approveBtn.click();
    await page.waitForTimeout(2000);

    // Verify
    const tipRes = await apiGet(page, `/investigation/tipoffs/${tipId}/`);
    expect(tipRes.ok).toBe(true);
    expect(tipRes.data.status).toBe('officer_approved');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 13: Detective reviews the tip (approve) via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 13 — Detective reviews and approves the tip via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto('/tip-reviews', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-testid="tip-card-${tipId}"]`, { timeout: 10000 });

    // Click Approve button on our tip card
    const approveBtn = page.locator(`[data-testid="approve-tip-${tipId}"]`);
    await approveBtn.click();
    await page.waitForTimeout(2000);

    // Verify
    const tipRes = await apiGet(page, `/investigation/tipoffs/${tipId}/`);
    expect(tipRes.ok).toBe(true);
    expect(tipRes.data.status).toBe('approved');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 14: Detective submits suspect list via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 14 — Detective submits suspect list via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/suspect-submissions?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });

    // Click "New Submission" button
    const newBtn = page.locator('button').filter({ hasText: /New Submission/ });
    await newBtn.click();
    await page.waitForSelector('.submission-form', { timeout: 10000 });

    // Select the suspect checkbox
    const suspectCheckbox = page.locator('.suspect-checkbox').first();
    await suspectCheckbox.click();

    // Fill reasoning
    await page.fill('#reasoning', 'Primary suspect identified through witness tips and physical evidence at the pier. Accelerant residue matches.');

    // Submit
    const submitBtn = page.locator('button').filter({ hasText: /Submit to Sergeant/ });
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, '/investigation/suspect-submissions/', { case: String(sceneCaseId) });
    expect(res.ok).toBe(true);
    const results = res.data.results || res.data;
    const ourSub = results.find((s: any) => s.status === 'pending');
    expect(ourSub).toBeTruthy();
    submissionId = ourSub.id;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 15: Sergeant approves suspect submission via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 15 — Sergeant approves suspect submission via UI', async ({ page }) => {
    // Infrastructure: assign sergeant to case (no UI for this)
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    await apiPatch(page, `/cases/cases/${sceneCaseId}/`, {
      assigned_sergeant: userIds[USERS.sergeant.username],
    });

    await uiLogin(page, USERS.sergeant.username, USERS.sergeant.password);

    await page.goto(`/suspect-submissions?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });

    // Click "Review Submission" on the pending card
    const reviewBtn = page.locator('button').filter({ hasText: /Review Submission/ });
    await reviewBtn.first().click();

    // Fill review notes
    const reviewTextarea = page.locator('.review-form textarea');
    await reviewTextarea.fill('Evidence is sufficient for arrest. Witness corroboration and physical evidence confirmed.');

    // Click approve
    const approveBtn = page.locator('button').filter({ hasText: /Approve/ });
    await approveBtn.first().click();
    await page.waitForTimeout(2000);

    // Verify via API
    const subRes = await apiGet(page, `/investigation/suspect-submissions/${submissionId}/`);
    expect(subRes.ok).toBe(true);
    expect(subRes.data.status).toBe('approved');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 16: Detective creates an interrogation via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 16 — Detective creates an interrogation via UI', async ({ page }) => {
    // Infrastructure: update suspect to arrested status via UI
    await uiLogin(page, USERS.detective.username, USERS.detective.password);
    await page.goto(`/suspects?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.suspect-card', { timeout: 10000 });
    const statusSelect = page.locator(`[data-testid="status-select-${suspectId}"]`);
    await statusSelect.selectOption('arrested');
    await page.waitForTimeout(2000);

    // Infrastructure: set case status to interrogation (no UI for this)
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    await apiPatch(page, `/cases/cases/${sceneCaseId}/`, {
      status: 'interrogation',
    });

    // Now create interrogation via UI
    await uiLogin(page, USERS.detective.username, USERS.detective.password);
    await page.goto(`/interrogations?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });

    const newBtn = page.locator('button').filter({ hasText: /New Interrogation/ });
    await newBtn.click();
    await page.waitForSelector('.interrogation-form', { timeout: 10000 });

    // Select suspect
    const suspectSelectEl = page.locator('#interrogation-suspect');
    await suspectSelectEl.selectOption({ index: 1 });

    // Select sergeant
    const sergeantSelect = page.locator('#interrogation-sergeant');
    await sergeantSelect.selectOption({ index: 1 });

    const submitBtn = page.locator('.interrogation-form button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, '/investigation/interrogations/', { suspect__case: String(sceneCaseId) });
    expect(res.ok).toBe(true);
    const results = res.data.results || res.data;
    expect(results.length).toBeGreaterThanOrEqual(1);
    interrogationId = results[0].id;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 17: Detective submits interrogation ratings via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 17 — Detective submits interrogation ratings via UI', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);

    await page.goto(`/interrogations?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.interrogation-card', { timeout: 10000 });

    const ratingsBtn = page.locator('button').filter({ hasText: /Submit Ratings/ });
    await ratingsBtn.first().click();
    await page.waitForSelector('.ratings-form', { timeout: 10000 });

    // Fill ratings
    const detRating = page.locator('.ratings-form input[type="number"]').first();
    await detRating.fill('8');
    const sgtRating = page.locator('.ratings-form input[type="number"]').nth(1);
    await sgtRating.fill('7');

    // Fill notes
    const detNotes = page.locator('.ratings-form textarea').first();
    await detNotes.fill('Suspect was evasive and contradicted themselves on timeline. Low cooperativeness.');
    const sgtNotes = page.locator('.ratings-form textarea').nth(1);
    await sgtNotes.fill('Physical evidence strongly ties suspect to the scene. Accelerant on clothing is conclusive.');

    const submitBtn = page.locator('.ratings-form button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, `/investigation/interrogations/${interrogationId}/`);
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('submitted');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 18: Captain makes guilty decision via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 18 — Captain makes guilty decision via UI', async ({ page }) => {
    await uiLogin(page, USERS.captain.username, USERS.captain.password);

    await page.goto(`/interrogations?case=${sceneCaseId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.interrogation-card', { timeout: 10000 });

    const decisionBtn = page.locator('button').filter({ hasText: /Make Decision/ });
    await decisionBtn.first().click();
    await page.waitForSelector('.decision-form', { timeout: 10000 });

    const guiltyRadio = page.locator('input[type="radio"][value="guilty"]');
    await guiltyRadio.check();

    const reasoning = page.locator('.decision-form textarea');
    await reasoning.fill('Overwhelming evidence: accelerant on clothing matches the pier, witness identification confirmed, and contradictory alibi testimony.');

    const submitBtn = page.locator('.decision-form button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify via API
    const res = await apiGet(page, '/investigation/captain-decisions/');
    expect(res.ok).toBe(true);
    const results = res.data.results || res.data;
    const ourDecision = results.find(
      (d: any) => d.interrogation === interrogationId || d.interrogation?.id === interrogationId
    );
    expect(ourDecision).toBeTruthy();
    expect(ourDecision.decision).toBe('guilty');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 19: Captain creates a trial via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 19 — Captain creates a trial via UI', async ({ page }) => {
    // Infrastructure: set case status to trial_pending (no UI for this)
    await uiLogin(page, USERS.admin.username, USERS.admin.password);
    await apiPatch(page, `/cases/cases/${sceneCaseId}/`, {
      status: 'trial_pending',
    });

    await uiLogin(page, USERS.captain.username, USERS.captain.password);
    await page.goto('/trials', { waitUntil: 'domcontentloaded' });

    const createBtn = page.locator('button').filter({ hasText: /Create Trial/ });
    await createBtn.click();
    await page.waitForSelector('.trial-create-form', { timeout: 10000 });

    // Select case
    await page.waitForFunction(
      (id) => document.querySelector(`#trial-case-id option[value="${id}"]`) !== null,
      sceneCaseId,
      { timeout: 10000 }
    );
    await page.selectOption('#trial-case-id', String(sceneCaseId));

    // Select suspect
    await page.waitForFunction(
      (id) => document.querySelector(`#trial-suspect-id option[value="${id}"]`) !== null,
      suspectId,
      { timeout: 10000 }
    );
    await page.selectOption('#trial-suspect-id', String(suspectId));

    // Select judge — pick the sp_judge created in Step 0
    const judgeId = userIds[USERS.judge.username];
    const judgeSelect = page.locator('#trial-judge');
    await page.waitForFunction(
      (id) => document.querySelector(`#trial-judge option[value="${id}"]`) !== null,
      judgeId,
      { timeout: 15000 }
    );
    await judgeSelect.selectOption(String(judgeId));

    await page.fill('#trial-captain-notes', 'Guilty decision confirmed. All evidence reviewed. Arson suspect to face trial.');

    const submitBtn = page.locator('.trial-create-form button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify via API — query as admin to bypass queryset restrictions
    await page.context().clearCookies();
    await uiLogin(page, 'admin', 'admin123');
    const res = await apiGet(page, '/trial/trials/', { case: sceneCaseId });
    expect(res.ok).toBe(true);
    const results = res.data.results || res.data;
    const ourTrial = results.find(
      (t: any) =>
        (t.case === sceneCaseId || t.case?.id === sceneCaseId) &&
        (t.suspect === suspectId || t.suspect?.id === suspectId)
    );
    expect(ourTrial).toBeTruthy();
    trialId = ourTrial.id;
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 20: Judge delivers guilty verdict via UI
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 20 — Judge delivers guilty verdict via UI', async ({ page }) => {
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
      'Defendant found guilty of arson. Evidence is conclusive: accelerant residue on clothing, eyewitness testimony, and contradictory alibi.'
    );
    await page.fill('#punishment-title', 'Imprisonment for Arson');
    await page.fill(
      '#punishment-desc',
      'Five years imprisonment for deliberate arson causing property damage exceeding ten billion rials at Sunset Pier warehouse.'
    );

    const submitBtn = page.locator('.verdict-form button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(3000);

    // Verify via API
    const res = await apiGet(page, `/trial/trials/${trialId}/`);
    expect(res.ok).toBe(true);
    expect(res.data.status).toBe('completed');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 21: Citizen (Base User) can access bail page (all users allowed)
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 21 — Citizen can access bail page', async ({ page }) => {
    await uiLogin(page, USERS.citizen1.username, USERS.citizen1.password);

    // Navigate to bail page — citizen should see the page
    await page.goto('/bail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // All authenticated users can now request bail
    const requestBtn = page.locator('button').filter({ hasText: /Request Bail/ });
    await expect(requestBtn.first()).toBeVisible({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 22: Officer creates bail request via UI → ALLOWED
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 22 — Officer creates bail request via UI (allowed)', async ({ page }) => {
    await uiLogin(page, USERS.officer.username, USERS.officer.password);

    await page.goto('/bail', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Click "Request Bail" to show form
    const requestBtn = page.locator('button').filter({ hasText: /Request Bail/ });
    await requestBtn.click();
    await page.waitForSelector('.bail-form-card', { timeout: 5000 });

    // Select suspect
    const suspectDropdown = page.locator('#bail-suspect');
    await page.waitForTimeout(500);
    const opts = await suspectDropdown.locator('option').all();
    if (opts.length > 1) {
      await suspectDropdown.selectOption({ index: 1 });
    }

    // Fill amount
    await page.fill('#bail-amount', '50000000');

    // Submit bail request
    const submitBtn = page.locator('.bail-form-card button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify via API
    const bailRes = await apiGet(page, '/trial/bail-payments/');
    expect(bailRes.ok).toBe(true);
    const bails = bailRes.data.results || bailRes.data;
    const ourBail = bails.find(
      (b: any) => b.suspect === suspectId || b.suspect?.id === suspectId
    );
    expect(ourBail).toBeTruthy();
    bailId = ourBail.id;

    // If not auto-approved (crime level), have sergeant approve it via UI
    if (ourBail.status !== 'approved') {
      await uiLogin(page, USERS.sergeant.username, USERS.sergeant.password);
      await page.goto('/bail-approvals', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const approveBtn = page.locator(`[data-testid="approve-bail-${bailId}"]`);
      if (await approveBtn.isVisible()) {
        await approveBtn.click();
      } else {
        const anyApprove = page.locator('button.btn-success').filter({ hasText: /Approve/ });
        await anyApprove.first().click();
      }
      await page.waitForTimeout(2000);
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 23: Verify bail appears and Pay button is visible
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 23 — Verify bail appears on Bail page with Pay button', async ({ page }) => {
    await uiLogin(page, USERS.sergeant.username, USERS.sergeant.password);
    await page.goto('/bail', { waitUntil: 'domcontentloaded' });

    // Wait for bail cards
    await page.waitForSelector(`[data-testid="bail-card-${bailId}"]`, { timeout: 10000 });

    // Verify Pay button exists for approved bail
    const payBtn = page.locator(`[data-testid="pay-bail-${bailId}"]`);
    await expect(payBtn).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Step 24: Verify nav dropdown structure works
  // ──────────────────────────────────────────────────────────────────────────
  test('Step 24 — Verify navbar dropdown navigation', async ({ page }) => {
    await uiLogin(page, USERS.detective.username, USERS.detective.password);
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Verify dropdown toggles exist
    const casesDropdown = page.locator('.nav-dropdown-toggle:has-text("Cases & Evidence")');
    await expect(casesDropdown).toBeVisible();

    const investigationDropdown = page.locator('.nav-dropdown-toggle:has-text("Investigation")');
    await expect(investigationDropdown).toBeVisible();

    // Click Cases & Evidence dropdown
    await casesDropdown.click();

    // Verify dropdown menu appears with correct items
    const casesMenu = page.locator('.nav-dropdown.open .nav-dropdown-menu').first();
    await expect(casesMenu).toBeVisible();

    // Should have Cases, Evidence, Suspects, Public Cases
    const caseLink = casesMenu.locator('.nav-dropdown-item:has-text("Cases")').first();
    await expect(caseLink).toBeVisible();

    // Click Cases to navigate
    await caseLink.click();
    await page.waitForURL('**/cases', { timeout: 8000 });
  });
});
