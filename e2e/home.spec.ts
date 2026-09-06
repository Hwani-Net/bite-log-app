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
    const header = page.getByText(/BITE Log|바이트로그/).first();
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
    // StatBar(총 조과·이번 달·최대 사이즈)는 로딩 중엔 "--"로, 그 뒤엔 실제
    // 값으로 항상 렌더된다 — class 이름 추측이나 즉석 count() 스냅샷 대신
    // 늘 있는 라벨 텍스트를 toBeVisible()로 기다린다(2026-09-06 Grok e2e
    // 전수검수 발견 — 옛 마크업 기준 class 문자열이라 아무것도 매칭 못 했고,
    // 대체 어서션인 "기록 없음" 문구도 로딩 완료를 기다리지 않아 race였다).
    await expect(page.getByText('조과 (마리)')).toBeVisible({ timeout: 10000 });
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

});

// Kept outside the describe above: that block navigates in beforeEach, and a
// second navigation cancels the first page's in-flight requests, which surfaces
// as a spurious "Failed to fetch" console error.
test.describe('Home page - console hygiene', () => {
  test('should load without console errors', async ({ page }) => {
    // The Agentation annotation overlay polls localhost:4747 and is rendered
    // only under NODE_ENV === 'development' (layout.tsx), so its connection
    // refusals are a dev-server artifact, not an app error. Stub it out.
    await page.route('http://localhost:4747/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );

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
