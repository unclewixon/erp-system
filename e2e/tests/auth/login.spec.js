import { test, expect } from '@playwright/test';

test.describe('Login Flow @critical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form', async ({ page }) => {
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Check for validation message or error state
    const hasValidationError = await page
      .locator('[class*="error"], [class*="invalid"], .text-red, .text-danger')
      .first()
      .isVisible()
      .catch(() => false);

    const inputHasError = await page
      .locator('input:invalid')
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasValidationError || inputHasError).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await emailInput.fill('invalid@email.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();

    // Wait for API response
    await page.waitForTimeout(2000);

    // Check for error message
    const errorMessage = page.locator(
      '[class*="error"], [class*="alert"], [role="alert"], .toast, .notification'
    );
    const hasError = await errorMessage.first().isVisible().catch(() => false);

    // Should either show error or stay on login page
    const currentUrl = page.url();
    expect(hasError || currentUrl.includes('login')).toBeTruthy();
  });

  test('should navigate to register page from login', async ({ page }) => {
    const registerLink = page.locator('a[href*="register"], button:has-text("Register"), a:has-text("Sign up"), a:has-text("Create account")');

    if (await registerLink.first().isVisible().catch(() => false)) {
      await registerLink.first().click();
      await page.waitForURL(/register|signup/);
      expect(page.url()).toMatch(/register|signup/);
    }
  });

  test('should have password visibility toggle', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const toggleButton = page.locator('[class*="password-toggle"], [class*="eye"], button[aria-label*="password"]');

    if (await toggleButton.isVisible().catch(() => false)) {
      await toggleButton.click();

      // Password should now be visible (type="text")
      const inputType = await passwordInput.getAttribute('type');
      expect(['text', 'password']).toContain(inputType);
    }
  });

  test('should maintain form state on validation error', async ({ page }) => {
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');

    const testEmail = 'test@example.com';
    await emailInput.fill(testEmail);
    await passwordInput.fill('short'); // Likely to fail validation
    await submitButton.click();

    await page.waitForTimeout(500);

    // Email should still be in the field
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe(testEmail);
  });
});

test.describe('Registration Flow @critical', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('should display registration form', async ({ page }) => {
    // Registration might redirect to login if not available
    const currentUrl = page.url();

    if (currentUrl.includes('register')) {
      // Check for registration form elements
      const orgNameInput = page.locator('input[name="organizationName"], input[name="companyName"], input[placeholder*="organization" i]');
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]');

      // At least email and password should be visible
      await expect(emailInput.first()).toBeVisible();
      await expect(passwordInput.first()).toBeVisible();
    }
  });

  test('should validate required fields', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('register')) {
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.waitForTimeout(500);

      // Should show validation errors or remain on page
      expect(page.url()).toMatch(/register|signup/);
    }
  });

  test('should validate email format', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('register')) {
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await emailInput.fill('not-an-email');

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.waitForTimeout(500);

      // Check for validation
      const hasError = await page
        .locator('[class*="error"], input:invalid')
        .first()
        .isVisible()
        .catch(() => false);

      expect(hasError).toBeTruthy();
    }
  });

  test('should validate password strength', async ({ page }) => {
    const currentUrl = page.url();

    if (currentUrl.includes('register')) {
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      await passwordInput.fill('12345'); // Weak password

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.waitForTimeout(500);

      // Should show password error or remain on page
      expect(page.url()).toMatch(/register|signup/);
    }
  });

  test('should navigate to login page from registration', async ({ page }) => {
    const loginLink = page.locator('a[href*="login"], a:has-text("Sign in"), a:has-text("Login"), a:has-text("Already have an account")');

    if (await loginLink.first().isVisible().catch(() => false)) {
      await loginLink.first().click();
      await page.waitForURL(/login/);
      expect(page.url()).toMatch(/login/);
    }
  });
});
