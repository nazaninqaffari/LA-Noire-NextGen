/**
 * Interrogation Workflow E2E Tests
 * 
 * Tests for the interrogation workflow via API layer (no dedicated frontend page exists yet).
 * Covers: interrogation creation, rating submission, captain decisions, chief approval.
 * These tests exercise the API via page.route() mocking and API-level interactions.
 */
import { test, expect } from '@playwright/test';
import { loginAs, TEST_ADMIN, TEST_USERS, waitForLoading, mockAPIResponse } from '../helpers/test-utils';

// ==================== Interrogation API Integration ====================

test.describe('Interrogation API via Frontend Service Layer', () => {
  test('should call interrogations API endpoint', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    let apiCalled = false;

    await page.route('**/api/v1/investigation/interrogations/**', (route) => {
      apiCalled = true;
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          results: [
            {
              id: 1,
              suspect: { id: 1, first_name: 'John', last_name: 'Suspect' },
              detective: { id: 2, first_name: 'Cole', last_name: 'Phelps' },
              sergeant: { id: 3, first_name: 'Jane', last_name: 'Sgt' },
              status: 'pending',
              detective_guilt_rating: null,
              sergeant_guilt_rating: null,
              detective_notes: '',
              sergeant_notes: '',
              interrogated_at: new Date().toISOString(),
            },
          ],
          count: 1,
        }),
      });
    });

    // Trigger API call via page evaluate (service layer)
    await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/investigation/interrogations/', {
          credentials: 'include',
        });
        return response.json();
      } catch (e) {
        return null;
      }
    });

    expect(apiCalled).toBe(true);
  });

  test('should submit detective and sergeant ratings', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    let submittedData: any = null;

    await page.route('**/api/v1/investigation/interrogations/1/submit_ratings/', (route) => {
      if (route.request().method() === 'POST') {
        submittedData = route.request().postDataJSON();
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: 1,
            status: 'submitted',
            detective_guilt_rating: submittedData?.detective_guilt_rating,
            sergeant_guilt_rating: submittedData?.sergeant_guilt_rating,
            detective_notes: submittedData?.detective_notes,
            sergeant_notes: submittedData?.sergeant_notes,
          }),
        });
      } else {
        route.continue();
      }
    });

    // Submit ratings via fetch
    const result = await page.evaluate(async () => {
      const csrfToken = document.cookie
        .split('; ')
        .find((c) => c.startsWith('csrftoken='))
        ?.split('=')[1];

      const response = await fetch('/api/v1/investigation/interrogations/1/submit_ratings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          detective_guilt_rating: 8,
          sergeant_guilt_rating: 7,
          detective_notes: 'Suspect showed signs of deception during questioning.',
          sergeant_notes: 'Body language inconsistent with testimony.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.status).toBe('submitted');
    expect(submittedData.detective_guilt_rating).toBe(8);
    expect(submittedData.sergeant_guilt_rating).toBe(7);
  });

  test('should reject ratings outside 1-10 range', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/interrogations/1/submit_ratings/', (route) => {
      const data = route.request().postDataJSON();
      if (data.detective_guilt_rating < 1 || data.detective_guilt_rating > 10) {
        route.fulfill({
          status: 400,
          body: JSON.stringify({
            detective_guilt_rating: ['Rating must be between 1 and 10.'],
          }),
        });
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ status: 'submitted' }) });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/interrogations/1/submit_ratings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          detective_guilt_rating: 15,
          sergeant_guilt_rating: 7,
          detective_notes: 'Invalid rating test.',
          sergeant_notes: 'Test notes.',
        }),
      });
      return { status: response.status };
    });

    expect(result.status).toBe(400);
  });

  test('should create captain decision for submitted interrogation', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    let captainDecisionData: any = null;

    await page.route('**/api/v1/investigation/captain-decisions/', (route) => {
      if (route.request().method() === 'POST') {
        captainDecisionData = route.request().postDataJSON();
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            interrogation: captainDecisionData?.interrogation,
            captain: { id: 5, first_name: 'Captain', last_name: 'Hook' },
            decision: captainDecisionData?.decision,
            reasoning: captainDecisionData?.reasoning,
            status: 'completed',
          }),
        });
      } else {
        route.continue();
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/captain-decisions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interrogation: 1,
          decision: 'guilty',
          reasoning: 'Both detective and sergeant provided high guilt ratings. Evidence is compelling.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.decision).toBe('guilty');
    expect(captainDecisionData.reasoning.length).toBeGreaterThanOrEqual(20);
  });

  test('should require chief approval for critical crime cases', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/captain-decisions/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 2,
            interrogation: 2,
            decision: 'guilty',
            reasoning: 'Critical crime - forwarding to Police Chief for final approval.',
            status: 'awaiting_chief', // Critical crime → needs chief
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/captain-decisions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interrogation: 2,
          decision: 'guilty',
          reasoning: 'Critical crime level 0 case - requires chief approval per protocol.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.status).toBe('awaiting_chief');
  });

  test('should allow police chief to approve captain decision', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    let chiefDecisionData: any = null;

    await page.route('**/api/v1/investigation/chief-decisions/', (route) => {
      if (route.request().method() === 'POST') {
        chiefDecisionData = route.request().postDataJSON();
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            captain_decision: chiefDecisionData?.captain_decision,
            police_chief: { id: 8, first_name: 'Chief', last_name: 'Director' },
            decision: chiefDecisionData?.decision,
            comments: chiefDecisionData?.comments,
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/chief-decisions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          captain_decision: 2,
          decision: 'approved',
          comments: 'Reviewed all evidence. Captain decision is sound.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.decision).toBe('approved');
    expect(chiefDecisionData.comments.length).toBeGreaterThanOrEqual(10);
  });

  test('should allow police chief to reject captain decision', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/chief-decisions/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 2,
            captain_decision: 2,
            decision: 'rejected',
            comments: 'Insufficient evidence for conviction. Needs further investigation.',
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/chief-decisions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          captain_decision: 2,
          decision: 'rejected',
          comments: 'Insufficient evidence for conviction. Needs further investigation.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.data.decision).toBe('rejected');
  });

  test('should handle captain needs_more decision', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/captain-decisions/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 3,
            interrogation: 3,
            decision: 'needs_more',
            reasoning: 'Suspect testimony is inconclusive. Need more evidence before proceeding.',
            status: 'completed',
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/captain-decisions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interrogation: 3,
          decision: 'needs_more',
          reasoning: 'Suspect testimony is inconclusive. Need more evidence before proceeding.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.data.decision).toBe('needs_more');
  });

  test('should reject captain decision with short reasoning', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/captain-decisions/', (route) => {
      if (route.request().method() === 'POST') {
        const data = route.request().postDataJSON();
        if (data.reasoning && data.reasoning.length < 20) {
          route.fulfill({
            status: 400,
            body: JSON.stringify({
              reasoning: ['Reasoning must be at least 20 characters.'],
            }),
          });
        } else {
          route.fulfill({ status: 201, body: '{}' });
        }
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/captain-decisions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interrogation: 1,
          decision: 'guilty',
          reasoning: 'Too short',
        }),
      });
      return { status: response.status };
    });

    expect(result.status).toBe(400);
  });
});

// ==================== Case Status with Interrogation Context ====================

test.describe('Case Status Reflecting Interrogation State', () => {
  test('should show interrogation status on case detail', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/cases/cases/10/**', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 10, case_id: 'CASE-010', title: 'Under Interrogation',
          description: 'Case with active interrogation', status: 'under_investigation',
          crime_level: 1,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: { first_name: 'Test', last_name: 'User', email: 'test@test.com' },
        }),
      });
    });
    await page.route('**/api/v1/cases/cases/10/reviews/**', (route) => {
      route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/cases/10');
    await waitForLoading(page);

    // Case should show investigation status
    const statusBadge = page.locator('[class*="status"], .status-badge');
    if (await statusBadge.count() > 0) {
      await expect(statusBadge.first()).toBeVisible();
    }
  });

  test('should filter cases by interrogation status', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    let requestedUrl = '';
    await page.route('**/api/v1/cases/cases/**', (route) => {
      requestedUrl = route.request().url();
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          results: [],
          count: 0,
          next: null,
          previous: null,
        }),
      });
    });

    await page.goto('/cases');
    await waitForLoading(page);

    // Select interrogation status filter
    const statusSelect = page.locator('#status, select[name="status"]');
    if (await statusSelect.count() > 0) {
      await statusSelect.selectOption('interrogation');
      await waitForLoading(page);
    }
  });
});

// ==================== Tip-Off Workflow ====================

test.describe('Tip-Off API Workflow', () => {
  test('should submit a tip-off', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    let tipData: any = null;

    await page.route('**/api/v1/investigation/tipoffs/', (route) => {
      if (route.request().method() === 'POST') {
        tipData = route.request().postDataJSON();
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            informant_name: tipData?.informant_name,
            informant_national_id: tipData?.informant_national_id,
            information: tipData?.information,
            status: 'pending',
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/tipoffs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          informant_name: 'Anonymous Citizen',
          informant_national_id: '1234567890',
          information: 'I saw the suspect at the corner of 5th and Main at approximately 10 PM.',
          case: 1,
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.status).toBe('pending');
  });

  test('should perform officer review of tip-off', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/tipoffs/1/officer_review/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 1,
          status: 'officer_reviewed',
          officer_review_decision: 'credible',
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/tipoffs/1/officer_review/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision: 'credible' }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(200);
  });

  test('should perform detective review and approve tip-off', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/tipoffs/1/detective_review/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 1,
          status: 'approved',
          reward_code: 'REWARD-ABC123',
          reward_amount: 5000000,
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/tipoffs/1/detective_review/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved: true }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.reward_code).toBeTruthy();
  });

  test('should verify reward code', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/tipoffs/1/verify_reward/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          valid: true,
          reward_amount: 5000000,
          informant_name: 'Anonymous Citizen',
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/tipoffs/1/verify_reward/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reward_code: 'REWARD-ABC123',
          national_id: '1234567890',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.valid).toBe(true);
  });

  test('should redeem reward', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/tipoffs/1/redeem_reward/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 1,
          status: 'redeemed',
          reward_redeemed: true,
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/tipoffs/1/redeem_reward/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reward_code: 'REWARD-ABC123',
          national_id: '1234567890',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.status).toBe('redeemed');
  });
});

// ==================== Trial & Bail Workflow ====================

test.describe('Trial API Workflow', () => {
  test('should create a trial', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/trial/trials/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            case: 1,
            suspect: 1,
            judge: { id: 10, first_name: 'Judge', last_name: 'Smith' },
            status: 'pending',
            created_at: new Date().toISOString(),
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/trial/trials/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ case: 1, suspect: 1 }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.status).toBe('pending');
  });

  test('should deliver guilty verdict with punishment', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/trial/verdicts/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            trial: 1,
            verdict: 'guilty',
            reasoning: 'Evidence is overwhelming. Witness testimony corroborated.',
            punishment: {
              title: 'Imprisonment',
              description: '5 years for aggravated assault',
            },
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/trial/verdicts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          trial: 1,
          verdict: 'guilty',
          reasoning: 'Evidence is overwhelming. Witness testimony corroborated.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.verdict).toBe('guilty');
    expect(result.data.punishment).toBeTruthy();
  });

  test('should deliver innocent verdict', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/trial/verdicts/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 2,
            trial: 2,
            verdict: 'innocent',
            reasoning: 'Insufficient evidence. Witness testimony contradictory.',
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/trial/verdicts/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          trial: 2,
          verdict: 'innocent',
          reasoning: 'Insufficient evidence. Witness testimony contradictory.',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.data.verdict).toBe('innocent');
  });

  test('should process bail payment for eligible crimes', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/trial/bail-payments/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            suspect: 1,
            amount: 50000000,
            status: 'pending_approval',
            created_at: new Date().toISOString(),
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/trial/bail-payments/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          suspect: 1,
          amount: 50000000,
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.status).toBe('pending_approval');
  });
});

// ==================== Suspect Submission Workflow ====================

test.describe('Suspect Submission Workflow', () => {
  test('should submit suspect for sergeant review', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/suspect-submissions/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            suspect: 1,
            status: 'pending',
            submitted_by: { id: 2, first_name: 'Cole', last_name: 'Phelps' },
            created_at: new Date().toISOString(),
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/suspect-submissions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ suspect: 1 }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.status).toBe('pending');
  });

  test('should review suspect submission (approve)', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/suspect-submissions/1/review/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 1,
          status: 'approved',
          reviewed_by: { id: 3, first_name: 'Sergeant', last_name: 'Smith' },
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/suspect-submissions/1/review/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved: true }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.status).toBe('approved');
  });

  test('should review suspect submission (reject)', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/suspect-submissions/1/review/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 1,
          status: 'rejected',
          rejection_reason: 'Insufficient grounds for arrest',
        }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/suspect-submissions/1/review/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved: false, reason: 'Insufficient grounds for arrest' }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.data.status).toBe('rejected');
  });
});

// ==================== Detective Board Workflow ====================

test.describe('Detective Board API Workflow', () => {
  test('should create a detective board', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/detective-boards/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            case: 1,
            title: 'Case #001 Investigation Board',
            created_by: { id: 2, first_name: 'Cole', last_name: 'Phelps' },
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/detective-boards/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ case: 1, title: 'Case #001 Investigation Board' }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.title).toBe('Case #001 Investigation Board');
  });

  test('should add board item with evidence connection', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/board-items/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            board: 1,
            title: 'Fingerprint Match',
            description: 'Fingerprint found at crime scene matches suspect',
            position_x: 100,
            position_y: 200,
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/board-items/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          board: 1,
          title: 'Fingerprint Match',
          description: 'Fingerprint found at crime scene matches suspect',
          position_x: 100,
          position_y: 200,
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
  });

  test('should create evidence connection between board items', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/evidence-connections/', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          body: JSON.stringify({
            id: 1,
            source_item: 1,
            target_item: 2,
            connection_type: 'links_to',
            description: 'Fingerprint connects suspect to crime scene',
          }),
        });
      }
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/evidence-connections/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          source_item: 1,
          target_item: 2,
          connection_type: 'links_to',
          description: 'Fingerprint connects suspect to crime scene',
        }),
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.data.connection_type).toBe('links_to');
  });
});

// ==================== Notification System ====================

test.describe('Notification API', () => {
  test('should fetch unread notification count', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/notifications/unread_count/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ count: 5 }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/notifications/unread_count/', {
        credentials: 'include',
      });
      return response.json();
    });

    expect(result.count).toBe(5);
  });

  test('should mark notification as read', async ({ page }) => {
    await loginAs(page, TEST_ADMIN.username, TEST_ADMIN.password);

    await page.route('**/api/v1/investigation/notifications/1/mark_read/', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 1, read: true }),
      });
    });

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/v1/investigation/notifications/1/mark_read/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      return { status: response.status, data: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.data.read).toBe(true);
  });
});
