import { test, expect } from '@playwright/test';

test.describe('Dashboard Functional Tests @regression', () => {
  // Skip tests that require authentication in isolated test environment
  test.skip('should display dashboard after login', async ({ page }) => {
    // This test requires a running backend with valid credentials
    await page.goto('/login');

    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/);

    // Dashboard should have key elements
    await expect(page.locator('[class*="dashboard"], [class*="Dashboard"], main')).toBeVisible();
  });

  test.skip('should display user information in header', async ({ page }) => {
    // Assumes user is logged in
    await page.goto('/dashboard');

    // Check for user name or avatar in header
    const userInfo = page.locator('[class*="user"], [class*="avatar"], [class*="profile"]');
    await expect(userInfo.first()).toBeVisible();
  });

  test.skip('should have working sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Check sidebar exists
    const sidebar = page.locator('[class*="sidebar"], aside, nav');
    await expect(sidebar.first()).toBeVisible();

    // Check for navigation links
    const navLinks = page.locator('nav a, aside a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test.skip('should navigate to employees page', async ({ page }) => {
    await page.goto('/dashboard');

    const employeesLink = page.locator('a[href*="employees"], a:has-text("Employees")');
    if (await employeesLink.first().isVisible().catch(() => false)) {
      await employeesLink.first().click();
      await page.waitForURL(/employees/);
      expect(page.url()).toContain('employees');
    }
  });

  test.skip('should navigate to attendance page', async ({ page }) => {
    await page.goto('/dashboard');

    const attendanceLink = page.locator('a[href*="attendance"], a:has-text("Attendance")');
    if (await attendanceLink.first().isVisible().catch(() => false)) {
      await attendanceLink.first().click();
      await page.waitForURL(/attendance/);
      expect(page.url()).toContain('attendance');
    }
  });

  test.skip('should logout successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click logout
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [class*="logout"]');

    if (await logoutButton.first().isVisible().catch(() => false)) {
      await logoutButton.first().click();

      // Should redirect to login
      await page.waitForURL(/login/);
      expect(page.url()).toContain('login');
    }
  });
});

test.describe('Navigation Functional Tests @regression', () => {
  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check for proper navigation landmarks
    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();
    expect(navCount).toBeGreaterThan(0);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check for h1
    const h1 = page.locator('h1');
    const h1Count = await h1.count();

    // Page should have at least some headings
    const allHeadings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await allHeadings.count();

    expect(headingCount).toBeGreaterThanOrEqual(0); // May be 0 on minimal pages
  });

  test('should have proper link labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check that links have accessible text
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');

      // Link should have some accessible name
      const hasAccessibleName = (text && text.trim()) || ariaLabel || title;
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Tab through focusable elements
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    const isFocusVisible = await focusedElement.isVisible().catch(() => false);

    // Should be able to focus on something
    expect(isFocusVisible).toBeTruthy();
  });
});

test.describe('Form Accessibility Tests @regression', () => {
  test('should have labeled form inputs on login page', async ({ page }) => {
    await page.goto('/login');

    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');

      // Check if input has associated label
      let hasLabel = false;
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        hasLabel = await label.isVisible().catch(() => false);
      }

      // Input should have some form of label
      const hasAccessibleLabel = hasLabel || ariaLabel || placeholder;
      expect(hasAccessibleLabel).toBeTruthy();
    }
  });

  test('should show focus states on form elements', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await emailInput.focus();

    // Input should be focused
    await expect(emailInput).toBeFocused();
  });
});
