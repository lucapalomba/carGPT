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

  test('should allow comparing cars', async ({ page }) => {
    // Mock find-cars
    await page.route('**/api/find-cars', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          analysis: 'Comparing some SUVs.',
          cars: [
            { make: 'Tesla', model: 'Model Y', year: 2023, type: 'SUV', price: '€55,000', strengths: [], weaknesses: [], reason: 'Fast', percentage: 90 },
            { make: 'Volvo', model: 'XC40', year: 2023, type: 'SUV', price: '€50,000', strengths: [], weaknesses: [], reason: 'Safe', percentage: 88 }
          ]
        })
      });
    });

    // Mock compare-cars
    await page.route('**/api/compare-cars', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          comparison: {
            comparison: 'Both are great SUVs but for different reasons.',
            categories: [
              { name: 'Safety', car1: 'Good', car2: 'Excellent', winner: 'car2' }
            ],
            conclusion: 'Volvo is safer, Tesla is faster.'
          }
        })
      });
    });

    // Fill the form and get results
    await page.fill('textarea', 'Family SUV with hybrid engine and top safety features');
    await page.getByRole('button', { name: /Find my perfect cars/i }).click();
    
    await expect(page.getByText(/Initial Analysis/i).first()).toBeVisible();

    // Click Detailed comparison button
    await page.getByRole('button', { name: /Detailed comparison/i }).click();

    // Wait for Dialog
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select two cars from the selects
    const select1 = page.locator('[data-testid="compare-select-1"]');
    const select2 = page.locator('[data-testid="compare-select-2"]');
    
    // Ensure options are populated (Placeholder + 2 mocked cars)
    await expect(select1.locator('option')).toHaveCount(3);
    
    await select1.selectOption({ index: 1 }); // Tesla Model Y
    await select2.selectOption({ index: 2 }); // Volvo XC40

    // Click Compare button in the dialog
    await page.locator('[data-testid="compare-button"]').click();

    // Verify conclusion view
    await expect(page.locator('text=Conclusion')).toBeVisible();
    await expect(page.locator('text=Volvo is safer')).toBeVisible();
  });
});
