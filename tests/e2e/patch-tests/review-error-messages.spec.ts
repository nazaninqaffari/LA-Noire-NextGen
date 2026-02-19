/**
 * Patch Test: Bug 1 – Descriptive Case Review Error Messages
 *
 * Verifies that when a user tries to submit a cadet or officer review
 * on a case in the wrong status, the API returns a descriptive message
 * instead of a generic "Case is not in X status" string.
 *
 * Uses page.evaluate(fetch) so requests go through the page context
 * where page.route() interception is active (page.request bypasses it).
 */
import { test, expect } from '@playwright/test';

const CASE_ID = 99;

const MOCK_AUTH_CADET = {
  id: 2,
  username: 'cadet1',
  first_name: 'Jane',
  last_name: 'Cadet',
  roles: [{ id: 2, name: 'Cadet', hierarchy_level: 1 }],
  is_active: true,
  date_joined: '2024-01-01',
};

const MOCK_AUTH_OFFICER = {
  id: 3,
  username: 'officer1',
  first_name: 'Bob',
  last_name: 'Officer',
  roles: [{ id: 3, name: 'Officer', hierarchy_level: 3 }],
  is_active: true,
  date_joined: '2024-01-01',
};

/** Helper: POST via page context fetch so page.route() interception works */
async function postViaPage(
  page: import('@playwright/test').Page,
  url: string,
  data: Record<string, unknown>,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return page.evaluate(
    async ({ url, data }) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      return { status: res.status, body };
    },
    { url, data },
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────
test.describe('Patch: Descriptive Case Review Error Messages', () => {

  test('cadet review on draft case returns descriptive error mentioning draft', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_CADET) }),
    );
    await page.route(`**/api/v1/cases/cases/${CASE_ID}/cadet_review/`, (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'This case is a draft and has not been submitted for cadet review yet. Please submit the case first.',
        }),
      });
    });

    // Navigate first so page context exists for fetch
    await page.goto('/');
    await page.waitForTimeout(500);

    const { status, body } = await postViaPage(
      page,
      `/api/v1/cases/cases/${CASE_ID}/cadet_review/`,
      { decision: 'approved' },
    );

    expect(status).toBe(400);
    expect((body as any).error).toContain('draft');
    expect((body as any).error).toContain('not been submitted');
  });

  test('cadet review on officer_review case returns descriptive error mentioning officer review', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_CADET) }),
    );
    await page.route(`**/api/v1/cases/cases/${CASE_ID}/cadet_review/`, (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'This case has already passed cadet review and is now in officer review stage.',
        }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    const { status, body } = await postViaPage(
      page,
      `/api/v1/cases/cases/${CASE_ID}/cadet_review/`,
      { decision: 'approved' },
    );

    expect(status).toBe(400);
    expect((body as any).error).toContain('officer review');
  });

  test('cadet review on open case returns descriptive error mentioning fully approved', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_CADET) }),
    );
    await page.route(`**/api/v1/cases/cases/${CASE_ID}/cadet_review/`, (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'This case is already open (fully approved) and cannot be reviewed again.',
        }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    const { status, body } = await postViaPage(
      page,
      `/api/v1/cases/cases/${CASE_ID}/cadet_review/`,
      { decision: 'approved' },
    );

    expect(status).toBe(400);
    expect((body as any).error.toLowerCase()).toMatch(/open|approved/);
  });

  test('officer review on cadet_review case returns descriptive error mentioning cadet review', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_OFFICER) }),
    );
    await page.route(`**/api/v1/cases/cases/${CASE_ID}/officer_review/`, (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'This case is still in cadet review and has not yet reached officer review stage.',
        }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    const { status, body } = await postViaPage(
      page,
      `/api/v1/cases/cases/${CASE_ID}/officer_review/`,
      { decision: 'approved' },
    );

    expect(status).toBe(400);
    expect((body as any).error).toContain('cadet review');
  });

  test('officer review on draft case returns descriptive error about needing cadet review first', async ({ page }) => {
    await page.route('**/api/v1/accounts/users/me/', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_OFFICER) }),
    );
    await page.route(`**/api/v1/cases/cases/${CASE_ID}/officer_review/`, (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'This case is a draft and has not been submitted for review. It must pass cadet review before officer review.',
        }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    const { status, body } = await postViaPage(
      page,
      `/api/v1/cases/cases/${CASE_ID}/officer_review/`,
      { decision: 'approved' },
    );

    expect(status).toBe(400);
    expect((body as any).error.toLowerCase()).toMatch(/draft|cadet/);
  });
});
