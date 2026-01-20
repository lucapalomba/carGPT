import { test, expect } from '@playwright/test';

test.describe('CarGPT Recommendation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should get car recommendations and show results', async ({ page }) => {
    // Mock the find-cars API
    await page.route('**/api/find-cars', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: 'Mocked analysis for the user requirements.',
          cars: [
            {
              make: 'Tesla',
              model: 'Model 3',
              year: 2023,
              type: 'Sedan',
              price: '€45,000',
              strengths: ['Long range', 'Great tech'],
              weaknesses: ['Build quality'],
              reason: 'Excellent EV choice',
              percentage: 95
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
              percentage: 92
            }
          ]
        })
      });
    });

    // Fill the form
    await page.fill('textarea', 'I need a small electric car for city driving in Italy with a long range and good safety');
    await page.click('button:has-text("Find my perfect cars")');

    // Wait for results
    await expect(page.getByText(/Initial Analysis/i).first()).toBeVisible();
    await expect(page.getByText(/Mocked analysis/i)).toBeVisible();
    
    // Check if cars are shown
    const carNames = page.locator('[data-testid="car-name"]');
    await expect(carNames).toHaveCount(2);
    await expect(carNames.first()).toContainText('Tesla Model 3');
  });


});
