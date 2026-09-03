import { test, expect, type Page, type Route } from '@playwright/test';

/**
 * End-to-end coverage for issue #110 ("Improve Test").
 *
 * These tests target the scenarios the existing e2e files leave open:
 *   - a full search
 *   - multiple refinements without pinning
 *   - multiple refinements with pinning (pinned cars are kept across updates)
 *   - problematic prompts (AI failure, empty results, stale conversation on refine)
 *
 * The backend AI endpoints are mocked with `page.route` so the tests are
 * deterministic and do not require a running AI provider.
 */

const VALID_REQUIREMENTS =
  'I need a small electric car for city driving in Italy with a long range and good safety';

const INITIAL_CARS = [
  {
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    type: 'Sedan',
    price: '€45,000',
    strengths: ['Long range', 'Great tech'],
    weaknesses: ['Build quality'],
    reason: 'Excellent EV choice',
    percentage: 95,
  },
  {
    make: 'Hyundai',
    model: 'Ioniq 5',
    year: 2023,
    type: 'SUV',
    price: '€50,000',
    strengths: ['Charging speed', 'Design'],
    weaknesses: ['Software'],
    reason: 'Great all-rounder',
    percentage: 92,
  },
];

/** Refined results returned for the first refinement. */
const REFINED_CARS_1 = [
  {
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    type: 'Sedan',
    price: '€45,000',
    strengths: ['Long range', 'Great tech'],
    weaknesses: ['Build quality'],
    reason: 'Still a strong match after refinement',
    percentage: 90,
  },
  {
    make: 'BMW',
    model: 'i4',
    year: 2024,
    type: 'Sedan',
    price: '€52,000',
    strengths: ['Refined ride', 'Premium interior'],
    weaknesses: ['Pricey'],
    reason: 'A more premium alternative',
    percentage: 88,
  },
];

/** Refined results returned for the second refinement. */
const REFINED_CARS_2 = [
  {
    make: 'BMW',
    model: 'i4',
    year: 2024,
    type: 'Sedan',
    price: '€52,000',
    strengths: ['Refined ride', 'Premium interior'],
    weaknesses: ['Pricey'],
    reason: 'Best match after the second refinement',
    percentage: 93,
  },
  {
    make: 'Polestar',
    model: '2',
    year: 2024,
    type: 'Sedan',
    price: '€49,000',
    strengths: ['Minimalist design', 'Good range'],
    weaknesses: ['Rear headroom'],
    reason: 'A sleeker alternative',
    percentage: 85,
  },
];

function successBody(cars: typeof INITIAL_CARS, analysis: string): string {
  return JSON.stringify({ success: true, analysis, cars });
}

/**
 * Mocks `/api/find-cars` with a deterministic success response and records the
 * request body so a test can assert what was sent.
 */
async function mockFindCars(page: Page, cars = INITIAL_CARS, analysis = 'Initial analysis.') {
  await page.route('**/api/find-cars', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: successBody(cars, analysis),
    });
  });
}

/**
 * Mocks `/api/refine-search`. The `handler` receives the parsed request body so
 * a test can tailor the response to the feedback / pinned cars received.
 */
async function mockRefineSearch(
  page: Page,
  handler: (
    route: Route,
    body: { feedback?: string; pinnedCars?: typeof INITIAL_CARS }
  ) => Promise<void>
) {
  await page.route('**/api/refine-search', async (route) => {
    let body: { feedback?: string; pinnedCars?: typeof INITIAL_CARS } = {};
    try {
      body = route.request().postDataJSON() ?? {};
    } catch {
      body = {};
    }
    await handler(route, body);
  });
}

async function runSearch(page: Page) {
  await mockFindCars(page);
  await page.fill('textarea', VALID_REQUIREMENTS);
  await page.click('button:has-text("Find my perfect cars")');
  await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();
}

test.describe('CarGPT refinement flows (#110)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('a search renders the analysis and the recommended cars', async ({ page }) => {
    await mockFindCars(page, INITIAL_CARS, 'Initial analysis for the search.');

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');

    // Results view.
    await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();
    // Initial analysis block is rendered.
    await expect(page.getByRole('heading', { name: /Initial Analysis/i })).toBeVisible();
    await expect(page.getByText(/Initial analysis for the search/i)).toBeVisible();

    // Both recommended cars appear.
    const carNames = page.locator('[data-testid="car-name"]');
    await expect(carNames).toHaveCount(2);
    await expect(carNames.first()).toContainText('Tesla Model 3');
    await expect(carNames.nth(1)).toContainText('Hyundai Ioniq 5');
  });

  test('multiple refinements without pinning update results and grow the analysis history', async ({ page }) => {
    let refineRequestBody: { feedback?: string; pinnedCars?: typeof INITIAL_CARS } | null = null;
    let refineCallCount = 0;

    await mockFindCars(page);
    await mockRefineSearch(page, async (route, body) => {
      refineCallCount += 1;
      refineRequestBody = body;
      const cars = refineCallCount === 1 ? REFINED_CARS_1 : REFINED_CARS_2;
      const analysis = `Refinement ${refineCallCount} analysis.`;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: successBody(cars, analysis),
      });
    });

    await runSearch(page);

    // First refinement.
    const refineInput = page.getByLabel('Enter feedback to refine search results');
    await refineInput.fill('I prefer something cheaper');
    await page.getByRole('button', { name: /Submit feedback to refine search results/i }).click();

    await expect(page.getByRole('heading', { name: /Refinement #1/i })).toBeVisible();
    await expect(page.getByText(/Refinement 1 analysis/i)).toBeVisible();
    // Results were replaced with the first refined set.
    await expect(page.locator('[data-testid="car-name"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="car-name"]').first()).toContainText('Tesla Model 3');
    await expect(page.locator('[data-testid="car-name"]').nth(1)).toContainText('BMW i4');
    // No car was pinned, so pinnedCars is an empty array.
    expect(refineRequestBody).not.toBeNull();
    expect(refineRequestBody!.pinnedCars).toEqual([]);
    expect(refineRequestBody!.feedback).toBe('I prefer something cheaper');

    // Second refinement.
    await refineInput.fill('I want a sedan only');
    await page.getByRole('button', { name: /Submit feedback to refine search results/i }).click();

    await expect(page.getByRole('heading', { name: /Refinement #2/i })).toBeVisible();
    await expect(page.getByText(/Refinement 2 analysis/i)).toBeVisible();
    await expect(page.locator('[data-testid="car-name"]').first()).toContainText('BMW i4');
    await expect(page.locator('[data-testid="car-name"]').nth(1)).toContainText('Polestar 2');
    // The initial analysis is still present in the history.
    await expect(page.getByRole('heading', { name: /Initial Analysis/i })).toBeVisible();
  });

  test('multiple refinements with pinning keep the pinned car across updates', async ({ page }) => {
    let refineCallCount = 0;
    const sentPinnedCars: Car[][] = [];

    await mockFindCars(page);
    await mockRefineSearch(page, async (route, body) => {
      refineCallCount += 1;
      sentPinnedCars.push(body.pinnedCars ?? []);

      // The pinned Tesla is kept (marked pinned) and joined by a new car each round.
      const cars = [
        { ...INITIAL_CARS[0], pinned: true, reason: `Pinned kept through refine ${refineCallCount}` },
        refineCallCount === 1 ? REFINED_CARS_1[1] : REFINED_CARS_2[1],
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: successBody(cars, `Pinned refinement ${refineCallCount} analysis.`),
      });
    });

    await runSearch(page);

    // Pin the Tesla (first car).
    const pinButtons = page.getByRole('button', { name: /Pin car/i });
    await expect(pinButtons).toHaveCount(2);
    await pinButtons.first().click();
    // The button toggles to its pinned state.
    await expect(page.getByRole('button', { name: /Unpin car/i })).toHaveCount(1);

    // First refinement: pinned car is sent along and kept in the results.
    const refineInput = page.getByLabel('Enter feedback to refine search results');
    await refineInput.fill('keep the Tesla but find alternatives');
    await page.getByRole('button', { name: /Submit feedback to refine search results/i }).click();

    await expect(page.getByRole('heading', { name: /Refinement #1/i })).toBeVisible();
    await expect(page.locator('[data-testid="car-name"]').first()).toContainText('Tesla Model 3');
    await expect(page.locator('[data-testid="car-name"]').nth(1)).toContainText('BMW i4');
    // The Tesla is rendered as pinned after the update.
    await expect(page.getByRole('button', { name: /Unpin car/i })).toHaveCount(1);
    expect(sentPinnedCars[0]).toHaveLength(1);
    expect(sentPinnedCars[0][0]).toMatchObject({ make: 'Tesla', model: 'Model 3' });

    // Second refinement while still pinned.
    await refineInput.fill('still prefer the Tesla');
    await page.getByRole('button', { name: /Submit feedback to refine search results/i }).click();

    await expect(page.getByRole('heading', { name: /Refinement #2/i })).toBeVisible();
    await expect(page.locator('[data-testid="car-name"]').first()).toContainText('Tesla Model 3');
    await expect(page.locator('[data-testid="car-name"]').nth(1)).toContainText('Polestar 2');
    await expect(page.getByRole('button', { name: /Unpin car/i })).toHaveCount(1);
    expect(sentPinnedCars[1]).toHaveLength(1);
    expect(sentPinnedCars[1][0]).toMatchObject({ make: 'Tesla', model: 'Model 3' });
  });

  test('a problematic prompt that triggers an AI failure shows an error toast and stays on the form', async ({ page }) => {
    await page.route('**/api/find-cars', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'The AI provider failed to generate a response' }),
      });
    });

    await page.fill('textarea', 'asdf qwer zxcv meaningless prompt gibberish');
    await page.click('button:has-text("Find my perfect cars")');

    await expect(page.getByText(/The AI provider failed to generate a response/i)).toBeVisible();
    // Still on the form view.
    await expect(
      page.locator('textarea[placeholder*="Example: Looking for a family car"]')
    ).toBeVisible();
  });

  test('a prompt that returns no cars renders the analysis with an empty results table', async ({ page }) => {
    await page.route('**/api/find-cars', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: successBody([], 'No cars matched your requirements.'),
      });
    });

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');

    await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();
    await expect(page.getByText(/No cars matched your requirements/i)).toBeVisible();
    // No car cards are rendered.
    await expect(page.locator('[data-testid="car-name"]')).toHaveCount(0);
  });

  test('refining without an active conversation surfaces a friendly error toast', async ({ page }) => {
    // Reach the results view first.
    await mockFindCars(page);
    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');
    await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();

    // Simulate the server losing the conversation (e.g. expired session).
    await page.route('**/api/refine-search', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'No active conversation found. Start a new search first.' }),
      });
    });

    await page.getByLabel('Enter feedback to refine search results').fill('something cheaper');
    await page.getByRole('button', { name: /Submit feedback to refine search results/i }).click();

    await expect(
      page.getByText(/No active conversation found. Start a new search first/i)
    ).toBeVisible();
    // We stay on the results view (the form is not shown again).
    await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();
  });
});

// Minimal local alias so the test file is self-contained for type-checking.
type Car = {
  make: string;
  model: string;
  year: number | string;
  type?: string;
  price?: string;
  strengths?: string[];
  weaknesses?: string[];
  reason?: string;
  pinned?: boolean;
  percentage?: number;
};