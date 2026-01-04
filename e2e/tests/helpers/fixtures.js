import { test as base } from '@playwright/test';

// Test data
export const testUsers = {
  admin: {
    email: 'admin@example.com',
    password: 'Test123!@#',
    firstName: 'Admin',
    lastName: 'User',
  },
  employee: {
    email: 'employee@example.com',
    password: 'Test123!@#',
    firstName: 'John',
    lastName: 'Employee',
  },
};

export const testOrganization = {
  name: 'E2E Test Organization',
  email: 'e2e-test@example.com',
  industry: 'Technology',
};

// Extended test with custom fixtures
export const test = base.extend({
  // Auto-login as admin
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard|\/$/);
    await use(page);
  },

  // Page with API mocking setup
  mockedPage: async ({ page }, use) => {
    // Setup API route mocking
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      // Mock health check
      if (url.includes('/api/health')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'API is running',
          }),
        });
        return;
      }

      // Continue with actual request
      await route.continue();
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';
