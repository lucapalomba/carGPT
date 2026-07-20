import { test, expect } from '@playwright/test';

/**
 * Advanced end-to-end flows for CarGPT.
 *
 * Complements basic-flow.spec.ts and car-recommendation.spec.ts by covering
 * validation, example prompts, loading state, API error handling, car card
 * rendering and the new-search reset flow.
 */

const VALID_REQUIREMENTS =
  'I need a small electric car for city driving in Italy with a long range and good safety';

const MOCK_CARS = [
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

const SUCCESS_BODY = JSON.stringify({
  success: true,
  analysis: 'Mocked analysis for the user requirements.',
  cars: MOCK_CARS,
});

test.describe('CarGPT Advanced Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('shows a toast error for a short description and stays on the form', async ({ page }) => {
    // The form enforces a minimum of 10 characters via react-hot-toast (not a native alert).
    await page.fill('textarea', 'too short');
    await page.click('button:has-text("Find my perfect cars")');

    // Toast validation message is rendered in the live region.
    await expect(page.getByText(/Please describe your requirements/i)).toBeVisible();

    // We must still be on the form view.
    await expect(page.locator('h1')).toContainText(/CarGPT/);
    await expect(
      page.locator('textarea[placeholder*="Example: Looking for a family car"]')
    ).toBeVisible();
  });

  test('clicking an example prompt fills the requirements textarea', async ({ page }) => {
    const exampleButton = page.locator('button:has-text("Looking for a reliable family car")');
    await expect(exampleButton).toBeVisible();
    await exampleButton.first().click();

    const textarea = page.locator('textarea#requirements');
    await expect(textarea).toHaveValue(/Looking for a reliable family car/);
  });

  test('shows the loading state while searching, then renders results', async ({ page }) => {
    await page.route('**/api/find-cars', async (route) => {
      // Delay the response so the loading state is observable.
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: SUCCESS_BODY,
      });
    });

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');

    // Submit button switches to its loading label while the request is in flight.
    await expect(page.getByRole('button', { name: /Analyzing your requirements/i })).toBeVisible();

    // Results view appears.
    await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();
    await expect(page.getByText(/Mocked analysis for the user requirements/i)).toBeVisible();
  });

  test('renders car card details (name, type, price, strengths, weaknesses)', async ({ page }) => {
    await page.route('**/api/find-cars', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: SUCCESS_BODY,
      });
    });

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');

    const carNames = page.locator('[data-testid="car-name"]');
    await expect(carNames).toHaveCount(2);
    await expect(carNames.first()).toContainText('Tesla Model 3');
    await expect(carNames.nth(1)).toContainText('Hyundai Ioniq 5');

    // Strengths and weaknesses rows are rendered.
    await expect(page.getByText('Long range')).toBeVisible();
    await expect(page.getByText('Build quality')).toBeVisible();
    // Price and type rows.
    await expect(page.getByText('€45,000')).toBeVisible();
    await expect(page.getByText('Sedan')).toBeVisible();
  });

  test('shows an error toast when the find-cars API fails and stays on the form', async ({ page }) => {
    await page.route('**/api/find-cars', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server exploded' }),
      });
    });

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');

    // ErrorHandler surfaces the backend error message as a toast.
    await expect(page.getByText('Server exploded')).toBeVisible();

    // Still on the form view.
    await expect(
      page.locator('textarea[placeholder*="Example: Looking for a family car"]')
    ).toBeVisible();
  });

  test('rate-limits (HTTP 429) surface a friendly retry toast', async ({ page }) => {
    await page.route('**/api/find-cars', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too many requests', retryAfter: '60s', tip: 'Slow down' }),
      });
    });

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');

    await expect(page.getByText(/Too many requests/i)).toBeVisible();
    await expect(page.getByText(/Try again after 60s/i)).toBeVisible();
  });

  test('starts a new search via the confirm dialog and returns to the form', async ({ page }) => {
    // First reach the results view.
    await page.route('**/api/find-cars', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: SUCCESS_BODY });
    });
    // Allow the reset call to resolve cleanly.
    await page.route('**/api/reset-conversation', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"success":true}' });
    });

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');
    await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();

    // Trigger the confirm dialog.
    await page.click('button:has-text("New Search")');
    await expect(page.getByText(/Do you want to start a new search/i)).toBeVisible();

    // Confirm reset.
    await page.click('button:has-text("Yes, Start Over")');

    // Back on the form view.
    await expect(
      page.locator('textarea[placeholder*="Example: Looking for a family car"]')
    ).toBeVisible();
    await expect(page.getByText(/Search reset successfully/i)).toBeVisible();
  });

  test('empty refine feedback shows a toast error', async ({ page }) => {
    await page.route('**/api/find-cars', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: SUCCESS_BODY });
    });

    await page.fill('textarea', VALID_REQUIREMENTS);
    await page.click('button:has-text("Find my perfect cars")');
    await expect(page.getByRole('heading', { name: /Your ideal cars/i })).toBeVisible();

    // Click Update with an empty refine input.
    await page.getByRole('button', { name: /Submit feedback to refine search results/i }).click();

    await expect(page.getByText(/Please enter some feedback to refine the search/i)).toBeVisible();
  });
});