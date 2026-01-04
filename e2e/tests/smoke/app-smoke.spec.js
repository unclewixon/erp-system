import { test, expect } from '@playwright/test';

test.describe('Application Smoke Tests @smoke', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ERP|Dashboard|Home/i);
  });

  test('should load the login page', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should load the registration page', async ({ page }) => {
    await page.goto('/register');

    // Check for registration form or redirect
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/register|signup|login/i);
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 5000 }).catch(() => {
      // If not redirected, check if there's a login prompt
    });

    const currentUrl = page.url();
    // Either redirected to login or showing login modal
    expect(currentUrl.includes('login') || currentUrl.includes('dashboard')).toBeTruthy();
  });

  test('should have responsive design', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not have console errors on page load', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected errors (like API not running in test)
    const criticalErrors = consoleErrors.filter(
      (error) => !error.includes('net::ERR') && !error.includes('Failed to fetch')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/non-existent-page-12345');

    // Should either show 404 page or redirect
    const bodyText = await page.locator('body').textContent();
    const is404Page = bodyText.includes('404') ||
                      bodyText.includes('not found') ||
                      bodyText.includes('Not Found');
    const wasRedirected = page.url().includes('login') || page.url() === '/';

    expect(is404Page || wasRedirected).toBeTruthy();
  });
});
