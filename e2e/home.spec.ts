import { test, expect } from '@playwright/test';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the home page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/BITE Log|바이트로그/);
  });

  test('should display the app header or greeting', async ({ page }) => {
    // App title or greeting should be visible on home page
    const header = page.locator('text=BITE Log, text=바이트로그').first();
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('should display bottom navigation bar', async ({ page }) => {
    // Bottom nav should always be present
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('should have navigation links for key sections', async ({ page }) => {
    // At least one nav link should be clickable
    const navLinks = page.locator('nav a, nav button');
    await expect(navLinks.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display catch summary section', async ({ page }) => {
    // Home shows total catch, this month, max size cards
    const statCards = page.locator('[class*="card"], [class*="stat"], [class*="summary"]');
    // If no catch records, a no-catches message should be shown
    const noCatches = page.locator('text=아직 조과 기록이 없습니다, text=No catches recorded yet');
    const hasStatCards = await statCards.count() > 0;
    const hasNoCatches = await noCatches.count() > 0;
    expect(hasStatCards || hasNoCatches).toBe(true);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page).not.toHaveTitle('');
    // Page should not have horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // 10px tolerance
  });

  test('should load without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter out known non-critical errors (Firebase, analytics, etc.)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('Firebase') &&
        !e.includes('analytics') &&
        !e.includes('gtag') &&
        !e.includes('favicon')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
