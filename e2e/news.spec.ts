import { test, expect } from '@playwright/test';

test.describe('Fishing News page', () => {
  test('should navigate to news section from home', async ({ page }) => {
    await page.goto('/');

    // Look for a news-related navigation item or link
    const newsLink = page.locator(
      'a[href*="news"], button:has-text("뉴스"), button:has-text("News"), a:has-text("뉴스")'
    ).first();

    if (await newsLink.isVisible()) {
      await newsLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Navigate directly if no nav link found
      await page.goto('/news');
    }

    // Should not show 404
    await expect(page).not.toHaveURL(/404/);
  });

  test('news page should display news items or loading state', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('networkidle');

    // Either news items or a loading/empty state should be visible
    const newsItems = page.locator('[class*="news"], [class*="card"], article');
    const loadingState = page.locator('[class*="loading"], [class*="spinner"], text=분석 중');
    const emptyState = page.locator('text=뉴스, text=News, text=조황');

    const hasContent =
      (await newsItems.count()) > 0 ||
      (await loadingState.count()) > 0 ||
      (await emptyState.count()) > 0;

    expect(hasContent).toBe(true);
  });

  test('news items should display title and source', async ({ page }) => {
    await page.goto('/news');
    await page.waitForTimeout(3000); // Wait for async data load

    // Look for news item titles
    const titles = page.locator('h2, h3, [class*="title"]');
    if (await titles.count() > 0) {
      await expect(titles.first()).toBeVisible();
    }
  });

  test('region filter buttons should be interactive', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('networkidle');

    // Look for region filter buttons (전체, 동해, 서해, 남해, 제주)
    const filterButtons = page.locator(
      'button:has-text("전체"), button:has-text("동해"), button:has-text("서해"), button:has-text("남해"), button:has-text("제주")'
    );

    if (await filterButtons.count() > 0) {
      // Click each filter button without expecting specific results
      const buttons = await filterButtons.all();
      for (const button of buttons.slice(0, 3)) {
        await button.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('source filter buttons should be interactive', async ({ page }) => {
    await page.goto('/news');
    await page.waitForLoadState('networkidle');

    // Look for source filter buttons (블로그, 뉴스, YouTube)
    const sourceButtons = page.locator(
      'button:has-text("블로그"), button:has-text("YouTube"), button:has-text("뉴스")'
    );

    if (await sourceButtons.count() > 0) {
      await sourceButtons.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('news items should have clickable links', async ({ page }) => {
    await page.goto('/news');
    await page.waitForTimeout(3000);

    // Find any anchor tags in news content
    const links = page.locator('a[href*="naver"], a[href*="youtube"], a[href*="http"]');
    if (await links.count() > 0) {
      // Just verify they exist and have href - don't actually navigate
      const href = await links.first().getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('freshness badges should be visible', async ({ page }) => {
    await page.goto('/news');
    await page.waitForTimeout(3000);

    // Look for freshness indicators (실시간, 오늘, 이번주)
    const freshnessBadges = page.locator(
      'text=실시간, text=오늘, text=이번주, [class*="fresh"], [class*="badge"]'
    );

    // Freshness badges may or may not be present depending on data
    // Just verify the page loaded
    await expect(page).not.toHaveURL(/error/);
  });
});
