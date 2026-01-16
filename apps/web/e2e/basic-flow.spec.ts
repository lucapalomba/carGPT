import { test, expect } from '@playwright/test';

test.describe('CarGPT Basic Flow', () => {
  test.beforeEach(async ({ page }) => {
    // We assume the dev server is running at http://localhost:5173
    await page.goto('http://localhost:5173');
  });

  test('should load the home page with the initial form', async ({ page }) => {
    await expect(page).toHaveTitle(/CarGPT/);
    await expect(page.locator('h1')).toContainText(/CarGPT/);
    await expect(page.locator('textarea[placeholder*="Example: Looking for a family car"]')).toBeVisible();
  });

  test('should show alert when submitting short description', async ({ page }) => {
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Please describe your requirements');
      dialog.accept();
    });
    await page.fill('textarea', 'too short');
    await page.click('button:has-text("Find my perfect cars")');
  });
});
